"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TopNav } from "@/components/top-nav";
import { useT } from "@/lib/i18n/context";
import { useProject } from "@/lib/project-context";
import type { ClientDetail, TimesheetImportPayload, TimesheetRow } from "@/lib/profile-types";
import { TIMESHEET_IMPORT_KEY } from "@/lib/profile-types";
import { countDaysInclusive, formatDays } from "@/lib/timesheet-utils";

const STANDARD_CURRENCY_CODES = new Set(["AED", "QAR", "SAR", "USD", "EUR"]);
const OTHER_CURRENCY_SENTINEL = "OUTRO";

type CurrencyUi = { code: string; other: string };

function currencyFromRaw(raw: string): CurrencyUi {
  const upper = raw.trim().toUpperCase();
  if (!upper) return { code: "", other: "" };
  if (STANDARD_CURRENCY_CODES.has(upper)) return { code: upper, other: "" };
  return { code: OTHER_CURRENCY_SENTINEL, other: upper };
}

function resolveCurrency(code: string, other: string): string {
  if (code === OTHER_CURRENCY_SENTINEL) return other.trim().toUpperCase();
  return code.trim().toUpperCase();
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseNum(raw: string): number {
  const n = Number.parseFloat(raw.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function TimesheetContent() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ready: projectReady, activeProject, setActiveProject } = useProject();

  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientDetail[]>([]);
  const [clientName, setClientName] = useState("");
  const [dailyRate, setDailyRate] = useState("");
  const [currencyCode, setCurrencyCode] = useState("");
  const [otherCurrency, setOtherCurrency] = useState("");
  const [useRange, setUseRange] = useState(false);
  const [rangeStart, setRangeStart] = useState(todayIso());
  const [rangeEnd, setRangeEnd] = useState(todayIso());
  const [rows, setRows] = useState<TimesheetRow[]>([]);
  const [saving, setSaving] = useState(false);
  const rangeSyncRef = useRef(0);

  const resolvedCurrency = useMemo(
    () => resolveCurrency(currencyCode, otherCurrency),
    [currencyCode, otherCurrency],
  );

  const dailyRows = useMemo(() => rows.filter((row) => !row.endDate), [rows]);
  const rangeRow = useMemo(() => rows.find((row) => row.endDate) ?? null, [rows]);

  const applyLoadedRows = useCallback((data: TimesheetRow[]) => {
    setRows(data);
    if (data.length > 0) {
      setDailyRate(String(data[data.length - 1].rate));
      const saved = currencyFromRaw(data[data.length - 1].currency);
      setCurrencyCode(saved.code);
      setOtherCurrency(saved.other);
    }
    const range = data.find((row) => row.endDate);
    if (range?.endDate) {
      setUseRange(true);
      setRangeStart(range.workDate);
      setRangeEnd(range.endDate);
    } else {
      setUseRange(false);
      setRangeStart(todayIso());
      setRangeEnd(todayIso());
    }
  }, []);

  const loadRows = useCallback(
    async (client: string, clientRows: ClientDetail[]) => {
      if (!client) {
        setRows([]);
        setUseRange(false);
        return;
      }
      const res = await fetch(`/api/timesheet?client=${encodeURIComponent(client)}`);
      if (!res.ok) throw new Error("fetch");
      const data = (await res.json()) as TimesheetRow[];
      applyLoadedRows(data);
      if (data.length === 0) {
        const project = clientRows.find((c) => c.name === client);
        const defaults = currencyFromRaw(project?.bank?.currency ?? "");
        setCurrencyCode(defaults.code);
        setOtherCurrency(defaults.other);
      }
    },
    [applyLoadedRows],
  );

  useEffect(() => {
    if (!projectReady) return;
    void fetch("/api/clients")
      .then(async (cl) => {
        if (!cl.ok) throw new Error("fetch");
        const clientRows = (await cl.json()) as ClientDetail[];
        setClients(clientRows);

        const paramClient = searchParams.get("client");
        const activeName = activeProject?.name;
        const initial =
          paramClient && clientRows.some((c) => c.name === paramClient)
            ? paramClient
            : activeName && clientRows.some((c) => c.name === activeName)
              ? activeName
              : clientRows[0]?.name ?? "";
        setClientName(initial);
      })
      .catch(() => setLoadError(t("timesheet.loadError")))
      .finally(() => setReady(true));
  }, [activeProject, projectReady, searchParams, t]);

  useEffect(() => {
    if (!ready || !activeProject) return;
    if (clients.some((c) => c.name === activeProject.name) && clientName !== activeProject.name) {
      setClientName(activeProject.name);
    }
  }, [activeProject, clientName, clients, ready]);

  useEffect(() => {
    if (!ready || !clientName) return;
    void loadRows(clientName, clients).catch(() => setLoadError(t("timesheet.loadError")));
  }, [clientName, clients, loadRows, ready, t]);

  const rate = parseNum(dailyRate);
  const rangeDays = useRange ? countDaysInclusive(rangeStart, rangeEnd) : 0;

  const totals = useMemo(() => {
    let totalDays = 0;
    if (useRange) {
      totalDays = rangeDays;
    } else {
      for (const row of dailyRows) {
        totalDays += row.days;
      }
    }
    return {
      totalDays,
      grandTotal: totalDays * rate,
    };
  }, [dailyRows, rangeDays, rate, useRange]);

  async function removeRow(id: string) {
    const res = await fetch(`/api/timesheet/${id}`, { method: "DELETE" });
    if (!res.ok) {
      globalThis.alert(t("timesheet.saveError"));
      return;
    }
    await loadRows(clientName, clients);
  }

  async function addDayRow() {
    if (!clientName.trim() || rate <= 0 || !resolvedCurrency || useRange) return;
    setSaving(true);
    try {
      const res = await fetch("/api/timesheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: clientName.trim(),
          workDate: todayIso(),
          days: 1,
          rate,
          currency: resolvedCurrency,
        }),
      });
      if (!res.ok) throw new Error("save");
      await loadRows(clientName, clients);
    } catch {
      globalThis.alert(t("timesheet.saveError"));
    } finally {
      setSaving(false);
    }
  }

  async function updateDayRow(id: string, workDate: string) {
    const res = await fetch(`/api/timesheet/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workDate, endDate: null, days: 1 }),
    });
    if (!res.ok) {
      globalThis.alert(t("timesheet.saveError"));
      return;
    }
    await loadRows(clientName, clients);
  }

  async function syncRangeEntry() {
    if (!useRange || !clientName.trim() || rate <= 0 || !resolvedCurrency) return;
    if (!rangeStart || !rangeEnd || rangeDays <= 0) return;

    const syncId = ++rangeSyncRef.current;
    setSaving(true);
    try {
      if (rangeRow) {
        const res = await fetch(`/api/timesheet/${rangeRow.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workDate: rangeStart,
            endDate: rangeEnd,
            rate,
            currency: resolvedCurrency,
          }),
        });
        if (!res.ok) throw new Error("save");
      } else {
        for (const row of dailyRows) {
          await fetch(`/api/timesheet/${row.id}`, { method: "DELETE" });
        }
        const res = await fetch("/api/timesheet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientName: clientName.trim(),
            workDate: rangeStart,
            endDate: rangeEnd,
            rate,
            currency: resolvedCurrency,
          }),
        });
        if (!res.ok) throw new Error("save");
      }
      if (syncId === rangeSyncRef.current) {
        await loadRows(clientName, clients);
      }
    } catch {
      globalThis.alert(t("timesheet.saveError"));
    } finally {
      if (syncId === rangeSyncRef.current) setSaving(false);
    }
  }

  useEffect(() => {
    if (!ready || !useRange) return;
    const timer = window.setTimeout(() => {
      void syncRangeEntry();
    }, 350);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync when range inputs change
  }, [useRange, rangeStart, rangeEnd, rate, resolvedCurrency, clientName, ready]);

  async function handleRangeToggle(next: boolean) {
    if (next === useRange) return;
    if (next) {
      setUseRange(true);
      setRangeStart(todayIso());
      setRangeEnd(todayIso());
      return;
    }

    setUseRange(false);
    if (rangeRow) {
      setSaving(true);
      try {
        await removeRow(rangeRow.id);
      } finally {
        setSaving(false);
      }
    }
  }

  function importToInvoice() {
    if (totals.totalDays <= 0 || totals.grandTotal <= 0 || rate <= 0 || !resolvedCurrency) return;
    const payload: TimesheetImportPayload = {
      clientName,
      currency: resolvedCurrency,
      total: totals.grandTotal,
      lineItems: [
        {
          description: useRange
            ? t("timesheet.invoiceLineRange", {
                client: clientName,
                start: rangeStart,
                end: rangeEnd,
              })
            : t("timesheet.invoiceLine", { client: clientName }),
          duration: totals.totalDays,
          rate,
          amount: totals.grandTotal,
        },
      ],
    };
    try {
      sessionStorage.setItem(TIMESHEET_IMPORT_KEY, JSON.stringify(payload));
    } catch {
      // ignore
    }
    router.push(`/faturar?client=${encodeURIComponent(clientName)}&fromTimesheet=1`);
  }

  const canImport =
    totals.totalDays > 0 && totals.grandTotal > 0 && rate > 0 && Boolean(resolvedCurrency);

  return (
    <main className="pin-page pb-8 md:pb-10">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-pin-ink md:text-4xl">
          {t("timesheet.title")}
        </h1>
        <p className="mb-6 text-sm text-pin-muted md:mb-8">{t("timesheet.lead")}</p>

        <TopNav />

        {loadError ? (
          <p className="mb-4 rounded-xl bg-pin-warm-soft px-4 py-3 text-sm font-medium text-amber-950 ring-1 ring-amber-200/80 dark:bg-amber-950/30 dark:text-amber-100">
            {loadError}
          </p>
        ) : null}

        {!ready ? (
          <p className="text-sm text-pin-muted">{t("common.loading")}</p>
        ) : (
          <section className="pin-card p-4 md:p-6">
            <div className="grid gap-3 border-b border-stone-200/80 pb-5 sm:grid-cols-3 dark:border-stone-700">
              <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
                {t("timesheet.client")}
                <select
                  value={clientName}
                  onChange={(e) => {
                    const name = e.target.value;
                    setClientName(name);
                    const project = clients.find((c) => c.name === name);
                    if (project) void setActiveProject(project.id);
                  }}
                  className="pin-field"
                >
                  {clients.length === 0 ? (
                    <option value="">{t("edit.noClientsOption")}</option>
                  ) : (
                    clients.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))
                  )}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
                {t("timesheet.dailyRate")}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={dailyRate}
                  onChange={(e) => setDailyRate(e.target.value)}
                  className="pin-field"
                />
              </label>
              <div className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
                {t("timesheet.currency")}
                <select
                  value={currencyCode}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCurrencyCode(value);
                    if (value !== OTHER_CURRENCY_SENTINEL) {
                      setOtherCurrency("");
                    }
                  }}
                  className="pin-field"
                >
                  <option value="">{t("common.selectCurrency")}</option>
                  <option value="AED">AED</option>
                  <option value="QAR">QAR</option>
                  <option value="SAR">SAR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value={OTHER_CURRENCY_SENTINEL}>{t("common.other")}</option>
                </select>
                {currencyCode === OTHER_CURRENCY_SENTINEL ? (
                  <input
                    value={otherCurrency}
                    onChange={(e) => setOtherCurrency(e.target.value.toUpperCase())}
                    className="pin-field"
                    placeholder={t("desp.otherCurrencyPh")}
                    maxLength={12}
                  />
                ) : null}
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-stone-50/80 p-4 ring-1 ring-stone-200/80 dark:bg-stone-900/40 dark:ring-stone-700">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={useRange}
                  onChange={(e) => void handleRangeToggle(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-pin-accent"
                />
                <span>
                  <span className="block text-sm font-semibold text-pin-ink">
                    {t("timesheet.useRange")}
                  </span>
                  <span className="mt-1 block text-xs text-pin-muted">{t("timesheet.useRangeHint")}</span>
                </span>
              </label>

              {useRange ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
                    {t("timesheet.rangeStart")}
                    <input
                      type="date"
                      value={rangeStart}
                      onChange={(e) => setRangeStart(e.target.value)}
                      className="pin-field"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
                    {t("timesheet.rangeEnd")}
                    <input
                      type="date"
                      value={rangeEnd}
                      min={rangeStart}
                      onChange={(e) => setRangeEnd(e.target.value)}
                      className="pin-field"
                    />
                  </label>
                  <div className="sm:col-span-2 rounded-xl bg-pin-teal-soft/50 px-3 py-2 text-sm dark:bg-teal-950/30">
                    <p className="font-medium text-pin-ink">
                      {t("timesheet.rangeSummary", {
                        days: String(rangeDays),
                        start: rangeStart,
                        end: rangeEnd,
                      })}
                    </p>
                    {rangeDays <= 0 ? (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                        {t("timesheet.rangeInvalid")}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            {!useRange ? (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[24rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 text-xs font-bold uppercase tracking-wider text-pin-muted dark:border-stone-700">
                      <th className="pb-2 pr-2">{t("timesheet.date")}</th>
                      <th className="pb-2 pr-2 text-right">{t("timesheet.daysCol")}</th>
                      <th className="pb-2 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {dailyRows.map((row) => (
                      <tr key={row.id} className="border-b border-stone-100 dark:border-stone-800">
                        <td className="py-2 pr-2">
                          <input
                            type="date"
                            defaultValue={row.workDate}
                            onBlur={(e) => {
                              if (e.target.value !== row.workDate) {
                                void updateDayRow(row.id, e.target.value);
                              }
                            }}
                            className="pin-field min-w-[9rem] py-1 text-sm"
                          />
                        </td>
                        <td className="py-2 pr-2 text-right font-semibold tabular-nums text-pin-ink">
                          {formatDays(row.days)}
                        </td>
                        <td className="py-2">
                          <button
                            type="button"
                            onClick={() => void removeRow(row.id)}
                            className="rounded-lg px-2 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                            aria-label={t("common.remove")}
                          >
                            🗑
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-stone-200 dark:border-stone-700">
                      <td colSpan={2} className="pt-4 pr-2">
                        <button
                          type="button"
                          onClick={() => void addDayRow()}
                          disabled={saving || !clientName || rate <= 0 || !resolvedCurrency}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-pin-teal-soft text-xl font-bold text-pin-accent ring-1 ring-teal-200 transition hover:bg-teal-100 active:scale-95 disabled:opacity-50 dark:bg-teal-950/50 dark:ring-teal-800"
                          aria-label={t("timesheet.addDay")}
                          title={t("timesheet.addDay")}
                        >
                          +
                        </button>
                        {dailyRows.length === 0 ? (
                          <span className="ml-3 text-sm text-pin-muted">{t("timesheet.empty")}</span>
                        ) : null}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : null}

            {canImport || totals.totalDays > 0 ? (
              <div className="mt-5 border-t border-stone-200/80 pt-5 dark:border-stone-700">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div className="text-sm text-pin-muted">
                    <p className="text-xs font-medium uppercase tracking-wider text-pin-muted">
                      {t("timesheet.totalDays")}
                    </p>
                    <p className="text-lg font-extrabold tabular-nums text-pin-ink">
                      {formatDays(totals.totalDays)} {t("timesheet.daysUnit")}
                    </p>
                    {rate > 0 && resolvedCurrency ? (
                      <p className="mt-1">
                        {formatDays(totals.totalDays)} {t("timesheet.daysUnit")} × {rate.toFixed(2)}{" "}
                        {resolvedCurrency}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium uppercase tracking-wider text-pin-muted">
                      {t("timesheet.grandTotal")}
                    </p>
                    <p className="text-xl font-extrabold tabular-nums text-pin-accent">
                      {totals.grandTotal.toFixed(2)} {resolvedCurrency}
                    </p>
                  </div>
                </div>

                {canImport ? (
                  <div className="mt-5 flex justify-end">
                    <button
                      type="button"
                      onClick={importToInvoice}
                      className="pin-btn-primary min-h-11 rounded-xl px-5 py-2.5 text-sm font-semibold"
                    >
                      {t("timesheet.importInvoice")}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        )}
      </div>
    </main>
  );
}

function TimesheetFallback() {
  const t = useT();
  return (
    <main className="pin-page pb-8 md:pb-10">
      <p className="text-sm text-pin-muted">{t("common.loading")}</p>
    </main>
  );
}

export default function TimesheetPage() {
  return (
    <Suspense fallback={<TimesheetFallback />}>
      <TimesheetContent />
    </Suspense>
  );
}
