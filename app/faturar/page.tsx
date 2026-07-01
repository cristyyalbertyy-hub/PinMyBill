"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TopNav } from "@/components/top-nav";
import { useT } from "@/lib/i18n/context";
import { downloadInvoicePdf } from "@/lib/invoice-pdf";
import type { ExpenseItem } from "@/lib/mock-data";

const BILLER_PROFILE_KEY = "pinmybill-biller-profile";

type BillerProfile = {
  fromName: string;
  fromAddress: string;
  fromPhone: string;
};

type PeriodMode = "all" | "range";

function defaultBillNumber() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const r = Math.floor(Math.random() * 900) + 100;
  return `BILL-${y}${m}${day}-${r}`;
}

function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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
    return { fromName: "", fromAddress: "", fromPhone: "" };
  }
  try {
    const raw = localStorage.getItem(BILLER_PROFILE_KEY);
    if (!raw) return { fromName: "", fromAddress: "", fromPhone: "" };
    const parsed = JSON.parse(raw) as BillerProfile;
    return {
      fromName: parsed.fromName ?? "",
      fromAddress: parsed.fromAddress ?? "",
      fromPhone: parsed.fromPhone ?? "",
    };
  } catch {
    return { fromName: "", fromAddress: "", fromPhone: "" };
  }
}

function FaturarPageContent() {
  const t = useT();
  const searchParams = useSearchParams();

  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>([]);
  const [clients, setClients] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  const [clientName, setClientName] = useState("");
  const [periodMode, setPeriodMode] = useState<PeriodMode>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [billNumber, setBillNumber] = useState(defaultBillNumber);
  const [billDate, setBillDate] = useState(todayIso);
  const [toName, setToName] = useState("");
  const [fromName, setFromName] = useState("");
  const [fromAddress, setFromAddress] = useState("");
  const [fromPhone, setFromPhone] = useState("");
  const [currency, setCurrency] = useState("");
  const [amount, setAmount] = useState("");
  const [taxPercent, setTaxPercent] = useState("0");
  const [totalAmount, setTotalAmount] = useState("");
  const [totalManual, setTotalManual] = useState(false);
  const [notes, setNotes] = useState("");

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

  const computedTaxAmount = useMemo(() => {
    const base = parseAmount(amount);
    const tax = parseAmount(taxPercent);
    return base * (tax / 100);
  }, [amount, taxPercent]);

  const computedTotal = useMemo(() => {
    return parseAmount(amount) + computedTaxAmount;
  }, [amount, computedTaxAmount]);

  const applyDefaultsFromClient = useCallback((client: string, expenses: ExpenseItem[]) => {
    setToName(client);
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
      setAmount(primary.total.toFixed(2));
      setTotalManual(false);
    }
  }, []);

  useEffect(() => {
    void Promise.all([fetch("/api/expenses"), fetch("/api/clients")])
      .then(async ([ex, cl]) => {
        if (!ex.ok || !cl.ok) throw new Error("fetch");
        const expenses = (await ex.json()) as ExpenseItem[];
        const clRows = (await cl.json()) as { name: string }[];
        setExpenseItems(Array.isArray(expenses) ? expenses : []);
        const names = clRows.map((r) => r.name);
        setClients(names);

        const profile = loadBillerProfile();
        setFromName(profile.fromName);
        setFromAddress(profile.fromAddress);
        setFromPhone(profile.fromPhone);

        const paramClient = searchParams.get("client");
        const initial =
          paramClient && names.includes(paramClient)
            ? paramClient
            : names[0] ?? "";
        if (initial) setClientName(initial);
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
    setTotalAmount(computedTotal.toFixed(2));
  }, [computedTotal, totalManual]);

  useEffect(() => {
    const profile: BillerProfile = { fromName, fromAddress, fromPhone };
    try {
      localStorage.setItem(BILLER_PROFILE_KEY, JSON.stringify(profile));
    } catch {
      // Ignora falhas de storage.
    }
  }, [fromAddress, fromName, fromPhone]);

  function handleAmountChange(value: string) {
    setAmount(value);
    setTotalManual(false);
  }

  function handleTaxChange(value: string) {
    setTaxPercent(value);
    setTotalManual(false);
  }

  async function handleGeneratePdf() {
    if (!toName.trim()) {
      globalThis.alert(t("invoice.toRequired"));
      return;
    }
    const base = parseAmount(amount);
    if (base <= 0) {
      globalThis.alert(t("invoice.amountRequired"));
      return;
    }
    if (!currency.trim()) {
      globalThis.alert(t("invoice.currencyRequired"));
      return;
    }

    setPdfGenerating(true);
    try {
      const total = totalManual ? parseAmount(totalAmount) : computedTotal;
      const lineItems = clientExpenses.map((item) => ({
        description: item.merchant || item.category,
        amount: item.amount,
        date: item.date,
      }));

      downloadInvoicePdf(
        {
          billNumber: billNumber.trim() || defaultBillNumber(),
          date: billDate,
          toName: toName.trim(),
          fromName: fromName.trim(),
          fromAddress: fromAddress.trim(),
          fromPhone: fromPhone.trim(),
          currency: currency.trim().toUpperCase(),
          amount: base,
          taxPercent: parseAmount(taxPercent),
          totalAmount: total,
          notes: notes.trim() || undefined,
          lineItems: lineItems.length > 0 ? lineItems : undefined,
          labels: {
            documentTitle: t("invoice.pdfTitle"),
            billNumber: t("invoice.billNumber"),
            date: t("invoice.date"),
            to: t("invoice.to"),
            from: t("invoice.from"),
            address: t("invoice.address"),
            phone: t("invoice.phone"),
            description: t("invoice.description"),
            amount: t("invoice.amount"),
            subtotal: t("invoice.subtotal"),
            tax: t("invoice.taxLine"),
            total: t("invoice.totalAmount"),
            notes: t("invoice.notes"),
            lineItems: t("invoice.lineItems"),
          },
        },
        `pinmybill-bill-${billNumber.trim() || "draft"}.pdf`,
      );
    } finally {
      setPdfGenerating(false);
    }
  }

  return (
    <main className="pin-page px-4 pb-8 pt-4 md:p-10">
      <div className="mx-auto max-w-5xl">
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
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
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
                  <p>
                    {t("invoice.expenseCount", { count: String(clientExpenses.length) })}
                  </p>
                  {totalsByCurrency.length > 1 ? (
                    <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">
                      {t("invoice.multiCurrencyHint")}
                    </p>
                  ) : null}
                  {totalsByCurrency.map((row) => (
                    <p key={row.currency} className="mt-1 font-medium text-pin-ink">
                      {row.currency}: {row.total.toFixed(2)}
                    </p>
                  ))}
                </div>
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
                <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
                  {t("invoice.billNumber")}
                  <input
                    value={billNumber}
                    onChange={(e) => setBillNumber(e.target.value)}
                    className="pin-field"
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

                <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted sm:col-span-2">
                  {t("invoice.to")}
                  <input
                    value={toName}
                    onChange={(e) => setToName(e.target.value)}
                    className="pin-field pin-field-orange-focus"
                    placeholder={t("invoice.toPh")}
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted sm:col-span-2">
                  {t("invoice.from")}
                  <input
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    className="pin-field"
                    placeholder={t("invoice.fromPh")}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
                  {t("invoice.address")}
                  <input
                    type="email"
                    value={fromAddress}
                    onChange={(e) => setFromAddress(e.target.value)}
                    className="pin-field"
                    placeholder={t("invoice.addressPh")}
                    autoComplete="email"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
                  {t("invoice.phone")}
                  <input
                    type="tel"
                    value={fromPhone}
                    onChange={(e) => setFromPhone(e.target.value)}
                    className="pin-field"
                    placeholder={t("invoice.phonePh")}
                    autoComplete="tel"
                  />
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
                    step="0.01"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
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
                    onChange={(e) => handleTaxChange(e.target.value)}
                    className="pin-field"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
                  {t("invoice.totalAmount")}
                  <input
                    type="number"
                    min="0"
                    step="0.01"
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
                    rows={2}
                    maxLength={500}
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
