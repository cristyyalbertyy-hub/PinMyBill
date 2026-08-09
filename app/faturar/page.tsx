"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { InvoicePreview } from "@/components/invoice-preview";
import { TopNav } from "@/components/top-nav";
import { useT } from "@/lib/i18n/context";
import { downloadInvoicePdf } from "@/lib/invoice-pdf";
import type { InvoiceBankDetails, InvoiceFormData, InvoiceLabels } from "@/lib/invoice-types";
import { computeTotalAmount } from "@/lib/invoice-types";
import type { ClientDetail, TimesheetImportPayload } from "@/lib/profile-types";
import { TIMESHEET_IMPORT_KEY } from "@/lib/profile-types";
import { mergeProjectDefaults } from "@/lib/project-defaults";
import { useProject } from "@/lib/project-context";
import { bankAccountLabel, listBankAccounts } from "@/lib/bank-utils";
import { invoiceProjectName } from "@/lib/project-label";
import type { ExpenseItem } from "@/lib/mock-data";

const BILLER_PROFILE_KEY = "pinmybill-biller-profile";
const BANK_PROFILE_KEY = "pinmybill-bank-profile";

type BillerProfile = {
  fromName: string;
  fromAddress: string;
  fromEmail: string;
  fromPhone: string;
};

type PeriodMode = "all" | "range";
type LineMode = "simple" | "detailed";

type InvoiceFormLine = {
  id: string;
  visible: boolean;
  description: string;
  amount: string;
  autoAmount?: boolean;
};

function newFormLine(): InvoiceFormLine {
  return {
    id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    visible: true,
    description: "",
    amount: "",
  };
}

const EMPTY_BANK: InvoiceBankDetails = {
  accountName: "",
  bankName: "",
  accountNo: "",
  iban: "",
  swift: "",
  currency: "",
};

function defaultBillNumber() {
  const y = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 900) + 100).padStart(3, "0");
  return `PL/INV/${y}/${seq}`;
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseAmount(raw: string): number {
  const n = Number.parseFloat(raw.trim().replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function dateRangeFromItems(items: ExpenseItem[]): { start: string; end: string } | null {
  if (items.length === 0) return null;
  const dates = items.map((item) => item.date).sort();
  return { start: dates[0], end: dates[dates.length - 1] };
}

function loadBillerProfile(): BillerProfile {
  if (typeof window === "undefined") {
    return { fromName: "", fromAddress: "", fromEmail: "", fromPhone: "" };
  }
  try {
    const raw = localStorage.getItem(BILLER_PROFILE_KEY);
    if (!raw) return { fromName: "", fromAddress: "", fromEmail: "", fromPhone: "" };
    const parsed = JSON.parse(raw) as BillerProfile & { fromAddress?: string };
    return {
      fromName: parsed.fromName ?? "",
      fromAddress: parsed.fromAddress ?? "",
      fromEmail: parsed.fromEmail ?? "",
      fromPhone: parsed.fromPhone ?? "",
    };
  } catch {
    return { fromName: "", fromAddress: "", fromEmail: "", fromPhone: "" };
  }
}

function loadBankProfile(): InvoiceBankDetails {
  if (typeof window === "undefined") return { ...EMPTY_BANK };
  try {
    const raw = localStorage.getItem(BANK_PROFILE_KEY);
    if (!raw) return { ...EMPTY_BANK };
    return { ...EMPTY_BANK, ...(JSON.parse(raw) as InvoiceBankDetails) };
  } catch {
    return { ...EMPTY_BANK };
  }
}

function FaturarPageContent() {
  const t = useT();
  const searchParams = useSearchParams();
  const { ready: projectReady, activeProject, profile, projects, setActiveProject } = useProject();

  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>([]);
  const [clients, setClients] = useState<string[]>([]);
  const [clientDetails, setClientDetails] = useState<ClientDetail[]>([]);
  const [timesheetImport, setTimesheetImport] = useState<TimesheetImportPayload | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  const [clientName, setClientName] = useState("");
  const [periodMode, setPeriodMode] = useState<PeriodMode>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [billNumber, setBillNumber] = useState(defaultBillNumber);
  const [billDate, setBillDate] = useState(todayIso);
  const [terms, setTerms] = useState("Due on Receipt");
  const [projectName, setProjectName] = useState("");
  const [lineMode, setLineMode] = useState<LineMode>("simple");
  const [formLines, setFormLines] = useState<InvoiceFormLine[]>([]);

  const [toName, setToName] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [toEmail, setToEmail] = useState("");
  const [toPhone, setToPhone] = useState("");

  const [fromName, setFromName] = useState("");
  const [fromAddress, setFromAddress] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromPhone, setFromPhone] = useState("");

  const [currency, setCurrency] = useState("");
  const [taxPercent, setTaxPercent] = useState("0");
  const [totalAmount, setTotalAmount] = useState("");
  const [totalManual, setTotalManual] = useState(false);
  const [notes, setNotes] = useState(
    "This is a computer-generated invoice no signature required. Thank you for your business!",
  );

  const [bank, setBank] = useState<InvoiceBankDetails>({ ...EMPTY_BANK });
  const [bankAccounts, setBankAccounts] = useState<InvoiceBankDetails[]>([]);
  const [selectedBankIndex, setSelectedBankIndex] = useState(0);

  const clientExpenses = useMemo(() => {
    if (!clientName) return [];
    return expenseItems.filter((item) => {
      if (item.type !== "cliente" || item.clientName !== clientName) return false;
      if (periodMode === "range") {
        if (startDate && item.date < startDate) return false;
        if (endDate && item.date > endDate) return false;
      }
      return true;
    });
  }, [clientName, endDate, expenseItems, periodMode, startDate]);

  const totalsByCurrency = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of clientExpenses) {
      map.set(row.currency, (map.get(row.currency) ?? 0) + row.amount);
    }
    return Array.from(map.entries()).map(([cur, total]) => ({ currency: cur, total }));
  }, [clientExpenses]);

  const expenseTotal = useMemo(() => {
    const cur = currency.trim().toUpperCase();
    const filtered = cur
      ? clientExpenses.filter((item) => item.currency.toUpperCase() === cur)
      : clientExpenses;
    return filtered.reduce((sum, item) => sum + item.amount, 0);
  }, [clientExpenses, currency]);

  const lineItems = useMemo(() => {
    const cur = currency.trim().toUpperCase();
    const filtered = cur
      ? clientExpenses.filter((item) => item.currency.toUpperCase() === cur)
      : clientExpenses;
    const items: Array<{ description: string; duration: number; rate: number; amount: number }> = [];

    if (lineMode === "detailed" && filtered.length > 0) {
      for (const item of filtered) {
        items.push({
          description: item.merchant || item.category,
          duration: 1,
          rate: item.amount,
          amount: item.amount,
        });
      }
    }

    if (timesheetImport) {
      for (const line of timesheetImport.lineItems) {
        items.push(line);
      }
    }

    for (const row of formLines) {
      if (!row.visible) continue;
      const amt = row.autoAmount ? expenseTotal : parseAmount(row.amount);
      const desc = row.description.trim();
      if (amt <= 0) continue;
      if (!desc && !row.autoAmount) continue;
      items.push({
        description: desc || t("invoice.expensesLine"),
        duration: 1,
        rate: amt,
        amount: amt,
      });
    }

    return items;
  }, [currency, clientExpenses, expenseTotal, formLines, lineMode, t, timesheetImport]);

  const subtotal = useMemo(
    () => lineItems.reduce((sum, item) => sum + item.amount, 0),
    [lineItems],
  );

  const computedTotal = useMemo(() => {
    return computeTotalAmount(subtotal, parseAmount(taxPercent));
  }, [subtotal, taxPercent]);

  const invoiceLabels = useMemo<InvoiceLabels>(
    () => ({
      documentTitle: t("invoice.pdfTitle"),
      billNumber: t("invoice.billNumberLabel"),
      date: t("invoice.dateLabel"),
      terms: t("invoice.terms"),
      projectName: t("invoice.projectName"),
      billTo: t("invoice.billTo"),
      from: t("invoice.from"),
      email: t("invoice.email"),
      phone: t("invoice.phone"),
      address: t("invoice.address"),
      description: t("invoice.itemAndDescription"),
      duration: t("invoice.duration"),
      rate: t("invoice.rate"),
      amount: t("invoice.amountCol"),
      subtotal: t("invoice.subtotal"),
      tax: t("invoice.taxLine"),
      taxZero: t("invoice.taxZero"),
      total: t("invoice.totalAmount"),
      notes: t("invoice.notes"),
      bankDetails: t("invoice.bankDetails"),
      bankAccountName: t("invoice.bankAccountName"),
      bankName: t("invoice.bankName"),
      bankAccountNo: t("invoice.bankAccountNo"),
      bankIban: t("invoice.bankIban"),
      bankSwift: t("invoice.bankSwift"),
      bankCurrency: t("invoice.bankCurrency"),
      tableNum: t("invoice.tableNum"),
      itemDescription: t("invoice.itemDescriptionDefault"),
    }),
    [t],
  );

  const previewData = useMemo<InvoiceFormData>(
    () => ({
      billNumber: billNumber.trim() || defaultBillNumber(),
      date: billDate,
      terms: terms.trim(),
      projectName: projectName.trim(),
      toName: toName.trim(),
      toAddress: toAddress.trim(),
      toEmail: toEmail.trim(),
      toPhone: toPhone.trim(),
      fromName: fromName.trim(),
      fromAddress: fromAddress.trim(),
      fromEmail: fromEmail.trim(),
      fromPhone: fromPhone.trim(),
      currency: currency.trim().toUpperCase(),
      amount: subtotal,
      taxPercent: parseAmount(taxPercent),
      totalAmount: totalManual ? parseAmount(totalAmount) : computedTotal,
      notes,
      lineItems,
      bank,
    }),
    [
      subtotal,
      bank,
      billDate,
      billNumber,
      computedTotal,
      currency,
      fromAddress,
      fromEmail,
      fromName,
      fromPhone,
      lineItems,
      notes,
      projectName,
      taxPercent,
      terms,
      toAddress,
      toEmail,
      toName,
      toPhone,
      totalAmount,
      totalManual,
    ],
  );

  const applyClientDetails = useCallback(
    (client: string) => {
      const detail = clientDetails.find((c) => c.name === client);
      setToName(client);
      if (detail) {
        setToAddress(detail.address ?? "");
        setToEmail(detail.email ?? "");
        setToPhone(detail.phone ?? "");
        if (detail.startDate) setStartDate(detail.startDate);
        setProjectName(invoiceProjectName(detail));

        const defaults = mergeProjectDefaults(detail, profile);
        const accounts = listBankAccounts(defaults.bank, defaults.extraBanks);
        setBankAccounts(accounts);
        setSelectedBankIndex(0);
        setFromName(defaults.fromName);
        setFromAddress(defaults.fromAddress);
        setFromEmail(defaults.fromEmail);
        setFromPhone(defaults.fromPhone);
        if (accounts[0]) {
          setBank({ ...EMPTY_BANK, ...accounts[0] });
          if (accounts[0].currency) setCurrency(accounts[0].currency);
        } else {
          setBank({ ...EMPTY_BANK, ...defaults.bank });
          if (defaults.bank.currency) setCurrency(defaults.bank.currency);
        }
      }
    },
    [clientDetails, profile],
  );

  const applyDefaultsFromClient = useCallback((client: string, expenses: ExpenseItem[]) => {
    applyClientDetails(client);
    if (expenses.length === 0) {
      setCurrency("");
      setTotalAmount("");
      setTotalManual(false);
      return;
    }
    const map = new Map<string, number>();
    for (const row of expenses) {
      map.set(row.currency, (map.get(row.currency) ?? 0) + row.amount);
    }
    const totals = Array.from(map.entries()).map(([cur, total]) => ({ currency: cur, total }));
    const primary = totals[0];
    if (primary) {
      setCurrency(primary.currency);
      setTotalManual(false);
      if (!bank.currency) {
        setBank((prev) => ({ ...prev, currency: primary.currency }));
      }
    }
  }, [applyClientDetails, bank.currency]);

  useEffect(() => {
    if (!projectReady) return;
    let cancelled = false;

    async function loadData() {
      try {
        const ex = await fetch("/api/expenses");
        if (ex.ok) {
          const expenses = (await ex.json()) as ExpenseItem[];
          if (!cancelled) setExpenseItems(Array.isArray(expenses) ? expenses : []);
        } else if (!cancelled) {
          setLoadError(t("invoice.loadError"));
        }
      } catch {
        if (!cancelled) setLoadError(t("invoice.loadError"));
      }

      let clientCount = 0;
      try {
        const cl = await fetch("/api/clients");
        if (cl.ok) {
          const clRows = (await cl.json()) as ClientDetail[];
          clientCount = clRows.length;
          if (!cancelled) {
            setClientDetails(clRows);
            const names = clRows.map((r) => r.name);
            setClients(names);

            const paramClient = searchParams.get("client");
            const activeName = projects.find((p) => p.id === activeProject?.id)?.name;
            const initial =
              paramClient && names.includes(paramClient)
                ? paramClient
                : activeName && names.includes(activeName)
                  ? activeName
                  : names[0] ?? "";
            if (initial) setClientName(initial);
          }
        }
      } catch {
        /* clients optional for invoice if manually entered */
      }

      let profileLoaded = false;
      try {
        const prRes = await fetch("/api/account/profile");
        if (prRes.ok) {
          const profileData = (await prRes.json()) as {
            fromName: string;
            fromAddress: string;
            fromEmail: string;
            fromPhone: string;
            bank: InvoiceBankDetails;
          };
          if (!cancelled && clientCount === 0) {
            profileLoaded = true;
            setFromName(profileData.fromName);
            setFromAddress(profileData.fromAddress);
            setFromEmail(profileData.fromEmail);
            setFromPhone(profileData.fromPhone);
            setBank({ ...EMPTY_BANK, ...profileData.bank });
          }
        }
      } catch {
        /* profile optional */
      }

      if (!cancelled && !profileLoaded) {
        const profile = loadBillerProfile();
        setFromName(profile.fromName);
        setFromAddress(profile.fromAddress);
        setFromEmail(profile.fromEmail);
        setFromPhone(profile.fromPhone);
        setBank(loadBankProfile());
      }

      if (!cancelled && searchParams.get("fromTimesheet") === "1") {
        try {
          const raw = sessionStorage.getItem(TIMESHEET_IMPORT_KEY);
          if (raw) {
            const payload = JSON.parse(raw) as TimesheetImportPayload;
            setTimesheetImport(payload);
            setClientName(payload.clientName);
            setCurrency(payload.currency);
            setTotalManual(false);
            sessionStorage.removeItem(TIMESHEET_IMPORT_KEY);
          }
        } catch {
          // ignore
        }
      }
    }

    void loadData().finally(() => {
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [activeProject?.id, projectReady, projects, searchParams, t]);

  useEffect(() => {
    if (!projectReady || !activeProject || !ready) return;
    if (clients.includes(activeProject.name) && clientName !== activeProject.name) {
      setClientName(activeProject.name);
    }
  }, [activeProject, clientName, clients, projectReady, ready]);

  useEffect(() => {
    if (!clientName || !ready) return;
    applyDefaultsFromClient(clientName, clientExpenses);
  }, [applyDefaultsFromClient, clientExpenses, clientName, ready]);

  useEffect(() => {
    if (periodMode !== "all" || clientExpenses.length === 0) return;
    const range = dateRangeFromItems(clientExpenses);
    if (range) {
      setStartDate(range.start);
      setEndDate(range.end);
    }
  }, [clientExpenses, periodMode]);

  useEffect(() => {
    if (totalManual) return;
    setTotalAmount(computedTotal.toFixed(3));
  }, [computedTotal, totalManual]);

  useEffect(() => {
    if (lineMode !== "simple" || expenseTotal <= 0) {
      setFormLines((prev) => prev.filter((line) => !line.autoAmount));
      return;
    }

    setFormLines((prev) => {
      const expenseLine = prev.find((line) => line.autoAmount);
      if (expenseLine) {
        return prev.map((line) =>
          line.autoAmount ? { ...line, amount: expenseTotal.toFixed(3) } : line,
        );
      }
      return [
        {
          id: "expense-auto",
          visible: true,
          description: "expenses",
          amount: expenseTotal.toFixed(3),
          autoAmount: true,
        },
        ...prev,
      ];
    });
  }, [expenseTotal, lineMode]);

  useEffect(() => {
    try {
      localStorage.setItem(
        BILLER_PROFILE_KEY,
        JSON.stringify({ fromName, fromAddress, fromEmail, fromPhone }),
      );
      localStorage.setItem(BANK_PROFILE_KEY, JSON.stringify(bank));
    } catch {
      // Ignora falhas de storage.
    }
  }, [bank, fromAddress, fromEmail, fromName, fromPhone]);

  function selectBankAccount(index: number) {
    setSelectedBankIndex(index);
    const account = bankAccounts[index];
    if (account) setBank({ ...EMPTY_BANK, ...account });
  }

  function updateBank(field: keyof InvoiceBankDetails, value: string) {
    setBank((prev) => ({ ...prev, [field]: value }));
  }

  async function handleGeneratePdf() {
    if (!toName.trim()) {
      globalThis.alert(t("invoice.toRequired"));
      return;
    }
    if (subtotal <= 0) {
      globalThis.alert(t("invoice.amountRequired"));
      return;
    }
    if (!currency.trim()) {
      globalThis.alert(t("invoice.currencyRequired"));
      return;
    }

    setPdfGenerating(true);
    try {
      downloadInvoicePdf(
        { ...previewData, labels: invoiceLabels },
        `pinmybill-bill-${previewData.billNumber.replace(/\//g, "-")}.pdf`,
      );
    } finally {
      setPdfGenerating(false);
    }
  }

  return (
    <main className="pin-page px-4 pb-8 pt-4 md:p-10">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-pin-ink md:text-4xl">
          {t("invoice.title")}
        </h1>
        <p className="mb-6 text-sm text-pin-muted md:mb-8">{t("invoice.lead")}</p>

        <TopNav />

        {loadError ? (
          <p className="mb-4 rounded-xl bg-pin-warm-soft px-4 py-3 text-sm font-medium text-amber-950 ring-1 ring-amber-200/80 dark:bg-amber-950/30 dark:text-amber-100 dark:ring-amber-800">
            {loadError}
          </p>
        ) : null}

        {ready ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
            <div className="grid gap-4">
              <section className="pin-card p-4 md:p-6">
                <h2 className="text-lg font-bold text-pin-ink">{t("invoice.sourceHeading")}</h2>
                <div className="mt-3 grid gap-3">
                  <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
                    {t("common.client")}
                    <select
                      value={clientName}
                      onChange={(e) => {
                        const name = e.target.value;
                        setClientName(name);
                        const project = projects.find((p) => p.name === name);
                        if (project) void setActiveProject(project.id);
                      }}
                      className="pin-field"
                    >
                      {clients.length === 0 ? (
                        <option value="">{t("edit.noClientsOption")}</option>
                      ) : (
                        clients.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))
                      )}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
                    {t("invoice.periodMode")}
                    <select
                      value={periodMode}
                      onChange={(e) => setPeriodMode(e.target.value as PeriodMode)}
                      className="pin-field"
                    >
                      <option value="all">{t("invoice.periodAll")}</option>
                      <option value="range">{t("invoice.periodRange")}</option>
                    </select>
                  </label>
                  {periodMode === "range" ? (
                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
                        {t("export.startDate")}
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="pin-field"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
                        {t("export.endDate")}
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="pin-field"
                        />
                      </label>
                    </div>
                  ) : null}
                  <div className="rounded-xl bg-pin-teal-soft/50 px-3 py-2 text-sm text-pin-muted dark:bg-teal-950/30">
                    <p>{t("invoice.expenseCount", { count: String(clientExpenses.length) })}</p>
                    {totalsByCurrency.map((row) => (
                      <p key={row.currency} className="mt-1 font-medium text-pin-ink">
                        {row.currency}: {row.total.toFixed(3)}
                      </p>
                    ))}
                  </div>
                  <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
                    {t("invoice.lineMode")}
                    <select
                      value={lineMode}
                      onChange={(e) => setLineMode(e.target.value as LineMode)}
                      className="pin-field"
                    >
                      <option value="simple">{t("invoice.lineModeSimple")}</option>
                      <option value="detailed">{t("invoice.lineModeDetailed")}</option>
                    </select>
                    {lineMode === "detailed" ? (
                      <span className="text-xs text-pin-soft">{t("invoice.lineModeDetailedHint")}</span>
                    ) : null}
                  </label>
                  {timesheetImport ? (
                    <p className="rounded-xl bg-pin-teal-soft/50 px-3 py-2 text-xs text-pin-muted dark:bg-teal-950/30">
                      {t("invoice.timesheetIncluded", {
                        hours: String(timesheetImport.lineItems[0]?.duration ?? 0),
                        amount: timesheetImport.total.toFixed(2),
                        currency: timesheetImport.currency,
                      })}
                    </p>
                  ) : null}
                </div>
              </section>

              <section className="pin-card p-4 md:p-6">
                <h2 className="text-lg font-bold text-pin-ink">{t("invoice.formHeading")}</h2>
                <form
                  className="mt-3 grid gap-3 sm:grid-cols-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleGeneratePdf();
                  }}
                >
                  <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted sm:col-span-2">
                    {t("invoice.billNumber")}
                    <input
                      value={billNumber}
                      onChange={(e) => setBillNumber(e.target.value)}
                      className="pin-field"
                      placeholder="PL/INV/2026/005"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
                    {t("invoice.date")}
                    <input
                      type="date"
                      value={billDate}
                      onChange={(e) => setBillDate(e.target.value)}
                      className="pin-field"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
                    {t("invoice.terms")}
                    <input
                      value={terms}
                      onChange={(e) => setTerms(e.target.value)}
                      className="pin-field"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted sm:col-span-2">
                    {t("invoice.projectName")}
                    <input
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      className="pin-field"
                    />
                  </label>

                  <p className="sm:col-span-2 text-xs font-bold uppercase tracking-wider text-orange-500">
                    {t("invoice.from")}
                  </p>
                  <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted sm:col-span-2">
                    {t("invoice.name")}
                    <input
                      value={fromName}
                      onChange={(e) => setFromName(e.target.value)}
                      className="pin-field"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
                    {t("invoice.phone")}
                    <input
                      type="tel"
                      value={fromPhone}
                      onChange={(e) => setFromPhone(e.target.value)}
                      className="pin-field"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
                    {t("invoice.email")}
                    <input
                      type="email"
                      value={fromEmail}
                      onChange={(e) => setFromEmail(e.target.value)}
                      className="pin-field"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted sm:col-span-2">
                    {t("invoice.address")}
                    <textarea
                      value={fromAddress}
                      onChange={(e) => setFromAddress(e.target.value)}
                      className="pin-field min-h-[3.5rem] resize-y"
                      rows={2}
                    />
                  </label>

                  <p className="sm:col-span-2 text-xs font-bold uppercase tracking-wider text-orange-500">
                    {t("invoice.billTo")}
                  </p>
                  <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted sm:col-span-2">
                    {t("invoice.to")}
                    <input
                      value={toName}
                      onChange={(e) => setToName(e.target.value)}
                      className="pin-field pin-field-orange-focus"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted sm:col-span-2">
                    {t("invoice.clientAddress")}
                    <textarea
                      value={toAddress}
                      onChange={(e) => setToAddress(e.target.value)}
                      className="pin-field min-h-[3.5rem] resize-y"
                      rows={2}
                      placeholder={t("invoice.clientAddressPh")}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
                    {t("invoice.email")}
                    <input
                      type="email"
                      value={toEmail}
                      onChange={(e) => setToEmail(e.target.value)}
                      className="pin-field"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
                    {t("invoice.phone")}
                    <input
                      type="tel"
                      value={toPhone}
                      onChange={(e) => setToPhone(e.target.value)}
                      className="pin-field"
                    />
                  </label>

                  <p className="sm:col-span-2 text-xs font-bold uppercase tracking-wider text-orange-500">
                    {t("invoice.linesHeading")}
                  </p>

                  {formLines.length > 0 ? (
                    <div className="sm:col-span-2 grid gap-2">
                      <div className="hidden gap-2 px-1 text-xs font-medium uppercase tracking-wide text-pin-soft sm:grid sm:grid-cols-[2.5rem_minmax(0,1fr)_7rem]">
                        <span>{t("invoice.lineVisibleCol")}</span>
                        <span>{t("invoice.customLineDescription")}</span>
                        <span className="text-right">{t("invoice.amountCol")}</span>
                      </div>
                      {formLines.map((row) => (
                        <div
                          key={row.id}
                          className="grid grid-cols-[2.5rem_minmax(0,1fr)_7rem_auto] items-center gap-2"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setFormLines((prev) =>
                                prev.map((line) =>
                                  line.id === row.id ? { ...line, visible: !line.visible } : line,
                                ),
                              )
                            }
                            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ring-1 transition active:scale-95 ${
                              row.visible
                                ? "bg-pin-teal-soft text-pin-accent ring-teal-200 dark:bg-teal-950/50 dark:ring-teal-800"
                                : "bg-red-50 text-red-600 ring-red-200 dark:bg-red-950/40 dark:ring-red-900"
                            }`}
                            aria-label={
                              row.visible ? t("invoice.lineHideFromInvoice") : t("invoice.lineShowOnInvoice")
                            }
                            title={
                              row.visible ? t("invoice.lineHideFromInvoice") : t("invoice.lineShowOnInvoice")
                            }
                          >
                            {row.visible ? "✓" : "✕"}
                          </button>
                          <input
                            value={row.description}
                            onChange={(e) =>
                              setFormLines((prev) =>
                                prev.map((line) =>
                                  line.id === row.id ? { ...line, description: e.target.value } : line,
                                ),
                              )
                            }
                            className="pin-field min-w-0"
                            placeholder={t("invoice.itemDescriptionDefault")}
                          />
                          <input
                            type="number"
                            min="0"
                            step="0.001"
                            readOnly={row.autoAmount}
                            value={row.amount}
                            onChange={(e) =>
                              setFormLines((prev) =>
                                prev.map((line) =>
                                  line.id === row.id ? { ...line, amount: e.target.value } : line,
                                ),
                              )
                            }
                            className={`pin-field w-full text-right ${
                              row.autoAmount ? "bg-stone-100 dark:bg-stone-800" : ""
                            }`}
                            placeholder="0"
                          />
                          {row.autoAmount ? (
                            <span className="w-8" aria-hidden />
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setFormLines((prev) => prev.filter((line) => line.id !== row.id))
                              }
                              className="inline-flex h-10 w-8 shrink-0 items-center justify-center rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                              aria-label={t("common.remove")}
                            >
                              🗑
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {timesheetImport ? (
                    <div className="sm:col-span-2 rounded-xl bg-pin-teal-soft/40 px-3 py-2 text-sm dark:bg-teal-950/30">
                      <p className="font-medium text-pin-ink">{t("invoice.timesheetLine")}</p>
                      <p className="text-pin-muted">
                        {timesheetImport.lineItems[0]?.description ?? t("invoice.timesheetLine")} —{" "}
                        {timesheetImport.total.toFixed(2)} {timesheetImport.currency}
                      </p>
                    </div>
                  ) : null}

                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={() => setFormLines((prev) => [...prev, newFormLine()])}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-pin-teal-soft text-xl font-bold text-pin-accent ring-1 ring-teal-200 transition hover:bg-teal-100 active:scale-95 dark:bg-teal-950/50 dark:ring-teal-800"
                      aria-label={t("invoice.addCustomLine")}
                      title={t("invoice.addCustomLine")}
                    >
                      +
                    </button>
                  </div>

                  <p className="sm:col-span-2 text-xs font-bold uppercase tracking-wider text-orange-500">
                    {t("invoice.amountsHeading")}
                  </p>
                  <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
                    {t("common.currency")}
                    <input
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                      className="pin-field"
                      maxLength={12}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
                    {t("invoice.subtotal")}
                    <input
                      readOnly
                      value={subtotal.toFixed(3)}
                      className="pin-field bg-stone-100 font-semibold dark:bg-stone-800"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
                    {t("invoice.taxPercent")}
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={taxPercent}
                      onChange={(e) => {
                        setTaxPercent(e.target.value);
                        setTotalManual(false);
                      }}
                      className="pin-field"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
                    {t("invoice.totalAmount")}
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={totalAmount}
                      onChange={(e) => {
                        setTotalAmount(e.target.value);
                        setTotalManual(true);
                      }}
                      className="pin-field font-semibold"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted sm:col-span-2">
                    {t("invoice.notes")}
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="pin-field min-h-[4rem] resize-y"
                      rows={3}
                    />
                  </label>

                  <p className="sm:col-span-2 text-xs font-bold uppercase tracking-wider text-orange-500">
                    {t("invoice.bankDetails")}
                  </p>
                  {bankAccounts.length > 1 ? (
                    <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted sm:col-span-2">
                      {t("invoice.selectBankAccount")}
                      <select
                        value={selectedBankIndex}
                        onChange={(e) => selectBankAccount(Number.parseInt(e.target.value, 10))}
                        className="pin-field"
                      >
                        {bankAccounts.map((account, index) => (
                          <option key={`bank-${index}`} value={index}>
                            {bankAccountLabel(account, index)}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted sm:col-span-2">
                    {t("invoice.bankAccountName")}
                    <input
                      value={bank.accountName}
                      onChange={(e) => updateBank("accountName", e.target.value)}
                      className="pin-field"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
                    {t("invoice.bankName")}
                    <input
                      value={bank.bankName}
                      onChange={(e) => updateBank("bankName", e.target.value)}
                      className="pin-field"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
                    {t("invoice.bankAccountNo")}
                    <input
                      value={bank.accountNo}
                      onChange={(e) => updateBank("accountNo", e.target.value)}
                      className="pin-field"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted sm:col-span-2">
                    {t("invoice.bankIban")}
                    <input
                      value={bank.iban}
                      onChange={(e) => updateBank("iban", e.target.value)}
                      className="pin-field"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
                    {t("invoice.bankSwift")}
                    <input
                      value={bank.swift}
                      onChange={(e) => updateBank("swift", e.target.value)}
                      className="pin-field"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
                    {t("invoice.bankCurrency")}
                    <input
                      value={bank.currency}
                      onChange={(e) => updateBank("currency", e.target.value.toUpperCase())}
                      className="pin-field"
                      maxLength={12}
                    />
                  </label>

                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      disabled={pdfGenerating}
                      className="pin-btn-primary min-h-12 w-full rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-60 sm:w-auto"
                    >
                      {pdfGenerating ? t("invoice.generating") : t("invoice.generatePdf")}
                    </button>
                  </div>
                </form>
              </section>
            </div>

            <section className="pin-card p-4 md:p-6 xl:sticky xl:top-4 xl:self-start">
              <h2 className="mb-4 text-lg font-bold text-pin-ink">{t("invoice.previewHeading")}</h2>
              <InvoicePreview data={previewData} labels={invoiceLabels} />
            </section>
          </div>
        ) : (
          <p className="text-sm text-pin-muted">{t("common.loading")}</p>
        )}
      </div>
    </main>
  );
}

function FaturarSuspenseFallback() {
  const t = useT();
  return (
    <main className="pin-page px-4 pb-8 pt-4 md:p-10">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-medium text-pin-muted">{t("common.loading")}</p>
      </div>
    </main>
  );
}

export default function FaturarPage() {
  return (
    <Suspense fallback={<FaturarSuspenseFallback />}>
      <FaturarPageContent />
    </Suspense>
  );
}
