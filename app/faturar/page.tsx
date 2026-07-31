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
type LineMode = "simple" | "detailed" | "timesheet";

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
  const [itemDescription, setItemDescription] = useState("expenses");

  const [toName, setToName] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [toEmail, setToEmail] = useState("");
  const [toPhone, setToPhone] = useState("");

  const [fromName, setFromName] = useState("");
  const [fromAddress, setFromAddress] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromPhone, setFromPhone] = useState("");

  const [currency, setCurrency] = useState("");
  const [amount, setAmount] = useState("");
  const [taxPercent, setTaxPercent] = useState("0");
  const [totalAmount, setTotalAmount] = useState("");
  const [totalManual, setTotalManual] = useState(false);
  const [notes, setNotes] = useState(
    "This is a computer-generated invoice no signature required. Thank you for your business!",
  );

  const [bank, setBank] = useState<InvoiceBankDetails>({ ...EMPTY_BANK });

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

  const computedTotal = useMemo(() => {
    return computeTotalAmount(parseAmount(amount), parseAmount(taxPercent));
  }, [amount, taxPercent]);

  const lineItems = useMemo(() => {
    const total = parseAmount(amount);
    const simpleLabel = itemDescription.trim() || t("invoice.itemDescriptionDefault");

    if (lineMode === "timesheet" && timesheetImport) {
      return timesheetImport.lineItems;
    }

    if (lineMode === "detailed" && clientExpenses.length > 0) {
      const cur = currency.trim().toUpperCase();
      const filtered = cur
        ? clientExpenses.filter((item) => item.currency.toUpperCase() === cur)
        : clientExpenses;
      return filtered.map((item) => ({
        description: item.merchant || item.category,
        duration: 1,
        rate: item.amount,
        amount: item.amount,
      }));
    }

    if (total <= 0) return [];
    return [
      {
        description: simpleLabel,
        duration: 1,
        rate: total,
        amount: total,
      },
    ];
  }, [amount, clientExpenses, currency, itemDescription, lineMode, t, timesheetImport]);

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
      amount: parseAmount(amount),
      taxPercent: parseAmount(taxPercent),
      totalAmount: totalManual ? parseAmount(totalAmount) : computedTotal,
      notes,
      lineItems,
      bank,
    }),
    [
      amount,
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

  const applyClientDetails = useCallback((client: string) => {
    const detail = clientDetails.find((c) => c.name === client);
    setToName(client);
    if (detail) {
      setToAddress(detail.address ?? "");
      setToEmail(detail.email ?? "");
      setToPhone(detail.phone ?? "");
      if (detail.startDate) setStartDate(detail.startDate);
      if (detail.projectDirector) setProjectName(detail.projectDirector);
    }
  }, [clientDetails]);

  const applyDefaultsFromClient = useCallback((client: string, expenses: ExpenseItem[]) => {
    applyClientDetails(client);
    if (expenses.length === 0) {
      setAmount("");
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
      setAmount(primary.total.toFixed(3));
      setTotalManual(false);
      if (!bank.currency) {
        setBank((prev) => ({ ...prev, currency: primary.currency }));
      }
    }
  }, [applyClientDetails, bank.currency]);

  useEffect(() => {
    void Promise.all([fetch("/api/expenses"), fetch("/api/clients")])
      .then(async ([ex, cl]) => {
        if (!ex.ok || !cl.ok) throw new Error("fetch");
        const expenses = (await ex.json()) as ExpenseItem[];
        const clRows = (await cl.json()) as ClientDetail[];
        setExpenseItems(Array.isArray(expenses) ? expenses : []);
        setClientDetails(clRows);
        const names = clRows.map((r) => r.name);
        setClients(names);

        let profileLoaded = false;
        try {
          const prRes = await fetch("/api/account/profile");
          if (prRes.ok) {
            const profile = (await prRes.json()) as {
              fromName: string;
              fromAddress: string;
              fromEmail: string;
              fromPhone: string;
              bank: InvoiceBankDetails;
            };
            setFromName(profile.fromName);
            setFromAddress(profile.fromAddress);
            setFromEmail(profile.fromEmail);
            setFromPhone(profile.fromPhone);
            setBank({ ...EMPTY_BANK, ...profile.bank });
            profileLoaded = true;
          }
        } catch {
          // fallback localStorage abaixo
        }

        if (!profileLoaded) {
          const profile = loadBillerProfile();
          setFromName(profile.fromName);
          setFromAddress(profile.fromAddress);
          setFromEmail(profile.fromEmail);
          setFromPhone(profile.fromPhone);
          setBank(loadBankProfile());
        }

        const paramClient = searchParams.get("client");
        const initial =
          paramClient && names.includes(paramClient) ? paramClient : names[0] ?? "";
        if (initial) setClientName(initial);

        if (searchParams.get("fromTimesheet") === "1") {
          try {
            const raw = sessionStorage.getItem(TIMESHEET_IMPORT_KEY);
            if (raw) {
              const payload = JSON.parse(raw) as TimesheetImportPayload;
              setTimesheetImport(payload);
              setLineMode("timesheet");
              setClientName(payload.clientName);
              setCurrency(payload.currency);
              setAmount(payload.total.toFixed(3));
              setTotalManual(false);
              sessionStorage.removeItem(TIMESHEET_IMPORT_KEY);
            }
          } catch {
            // ignore
          }
        }

        setLoadError(null);
      })
      .catch(() => setLoadError(t("invoice.loadError")))
      .finally(() => setReady(true));
  }, [searchParams, t]);

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

  function updateBank(field: keyof InvoiceBankDetails, value: string) {
    setBank((prev) => ({ ...prev, [field]: value }));
  }

  async function handleGeneratePdf() {
    if (!toName.trim()) {
      globalThis.alert(t("invoice.toRequired"));
      return;
    }
    if (parseAmount(amount) <= 0) {
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
                      onChange={(e) => setClientName(e.target.value)}
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
                      <option value="timesheet" disabled={!timesheetImport}>
                        {t("invoice.lineModeTimesheet")}
                      </option>
                    </select>
                    {lineMode === "timesheet" ? (
                      <span className="text-xs text-pin-soft">{t("invoice.lineModeTimesheetHint")}</span>
                    ) : null}
                    {lineMode === "detailed" ? (
                      <span className="text-xs text-pin-soft">{t("invoice.lineModeDetailedHint")}</span>
                    ) : null}
                  </label>
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
                    {t("invoice.amountsHeading")}
                  </p>
                  <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted sm:col-span-2">
                    {t("invoice.itemAndDescription")}
                    <input
                      value={itemDescription}
                      onChange={(e) => setItemDescription(e.target.value)}
                      className="pin-field"
                      disabled={lineMode === "detailed" || lineMode === "timesheet"}
                      placeholder={t("invoice.itemDescriptionDefault")}
                    />
                    {lineMode === "detailed" ? (
                      <span className="text-xs text-pin-soft">{t("invoice.lineModeDetailedHint")}</span>
                    ) : null}
                    {lineMode === "timesheet" ? (
                      <span className="text-xs text-pin-soft">{t("invoice.lineModeTimesheetHint")}</span>
                    ) : null}
                  </label>
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
                    {t("invoice.amount")}
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value);
                        setTotalManual(false);
                      }}
                      className="pin-field"
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
