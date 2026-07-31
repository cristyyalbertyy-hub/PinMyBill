"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TopNav } from "@/components/top-nav";
import { useT } from "@/lib/i18n/context";
import type { ClientDetail, TimesheetImportPayload, TimesheetRow } from "@/lib/profile-types";
import { TIMESHEET_IMPORT_KEY } from "@/lib/profile-types";

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

  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientDetail[]>([]);
  const [clientName, setClientName] = useState("");
  const [dailyRate, setDailyRate] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [rows, setRows] = useState<TimesheetRow[]>([]);
  const [saving, setSaving] = useState(false);

  const loadRows = useCallback(async (client: string) => {
    if (!client) {
      setRows([]);
      return;
    }
    const res = await fetch(`/api/timesheet?client=${encodeURIComponent(client)}`);
    if (!res.ok) throw new Error("fetch");
    const data = (await res.json()) as TimesheetRow[];
    setRows(data);
    if (data.length > 0) {
      setDailyRate(String(data[data.length - 1].rate));
      setCurrency(data[data.length - 1].currency);
    }
  }, []);

  useEffect(() => {
    void Promise.all([fetch("/api/clients"), fetch("/api/account/profile")])
      .then(async ([cl, pr]) => {
        if (!cl.ok) throw new Error("fetch");
        const clientRows = (await cl.json()) as ClientDetail[];
        setClients(clientRows);

        const paramClient = searchParams.get("client");
        const initial =
          paramClient && clientRows.some((c) => c.name === paramClient)
            ? paramClient
            : clientRows[0]?.name ?? "";
        setClientName(initial);

        if (pr.ok) {
          const profile = (await pr.json()) as { bank: { currency: string } };
          if (profile.bank.currency) setCurrency(profile.bank.currency);
        }
      })
      .catch(() => setLoadError(t("timesheet.loadError")))
      .finally(() => setReady(true));
  }, [searchParams, t]);

  useEffect(() => {
    if (!ready || !clientName) return;
    void loadRows(clientName).catch(() => setLoadError(t("timesheet.loadError")));
  }, [clientName, loadRows, ready, t]);

  const totals = useMemo(() => {
    let totalDays = 0;
    let grandTotal = 0;
    for (const row of rows) {
      totalDays += row.days;
      grandTotal += row.days * row.rate;
    }
    return { totalDays, grandTotal };
  }, [rows]);

  async function addRow() {
    if (!clientName.trim()) return;
    const rate = parseNum(dailyRate);
    if (rate <= 0) return;
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
          currency: currency.trim().toUpperCase(),
          description: t("timesheet.description"),
        }),
      });
      if (!res.ok) throw new Error("save");
      await loadRows(clientName);
    } catch {
      globalThis.alert(t("timesheet.saveError"));
    } finally {
      setSaving(false);
    }
  }

  async function updateRow(id: string, patch: Partial<TimesheetRow>) {
    const res = await fetch(`/api/timesheet/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      globalThis.alert(t("timesheet.saveError"));
      return;
    }
    await loadRows(clientName);
  }

  async function removeRow(id: string) {
    const res = await fetch(`/api/timesheet/${id}`, { method: "DELETE" });
    if (!res.ok) {
      globalThis.alert(t("timesheet.saveError"));
      return;
    }
    await loadRows(clientName);
  }

  function importToInvoice() {
    if (rows.length === 0 || totals.grandTotal <= 0) return;
    const payload: TimesheetImportPayload = {
      clientName,
      currency: currency.trim().toUpperCase(),
      total: totals.grandTotal,
      lineItems: rows.map((row) => ({
        description: row.description || row.workDate,
        duration: row.days,
        rate: row.rate,
        amount: row.days * row.rate,
      })),
    };
    try {
      sessionStorage.setItem(TIMESHEET_IMPORT_KEY, JSON.stringify(payload));
    } catch {
      // ignore
    }
    router.push(`/faturar?client=${encodeURIComponent(clientName)}&fromTimesheet=1`);
  }

  return (
    <main className="pin-page px-4 pb-8 pt-4 md:p-10">
      <div className="mx-auto max-w-4xl">
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
          <div className="grid gap-4">
            <section className="pin-card p-4 md:p-6">
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
                  {t("timesheet.client")}
                  <select
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
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
                <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
                  {t("timesheet.currency")}
                  <input
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                    className="pin-field"
                    maxLength={12}
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={() => void addRow()}
                disabled={saving || !clientName || parseNum(dailyRate) <= 0}
                className="mt-4 pin-btn-primary min-h-10 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
              >
                {t("timesheet.addRow")}
              </button>
            </section>

            {rows.length === 0 ? (
              <p className="text-sm text-pin-muted">{t("timesheet.empty")}</p>
            ) : (
              <>
                <section className="pin-card overflow-x-auto p-4 md:p-6">
                  <table className="w-full min-w-[36rem] text-left text-sm">
                    <thead>
                      <tr className="border-b border-stone-200 text-xs font-bold uppercase tracking-wider text-pin-muted dark:border-stone-700">
                        <th className="pb-2 pr-2">{t("timesheet.date")}</th>
                        <th className="pb-2 pr-2">{t("timesheet.days")}</th>
                        <th className="pb-2 pr-2">{t("timesheet.rate")}</th>
                        <th className="pb-2 pr-2">{t("timesheet.description")}</th>
                        <th className="pb-2 pr-2 text-right">{t("timesheet.lineTotal")}</th>
                        <th className="pb-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.id} className="border-b border-stone-100 dark:border-stone-800">
                          <td className="py-2 pr-2">
                            <input
                              type="date"
                              defaultValue={row.workDate}
                              onBlur={(e) => {
                                if (e.target.value !== row.workDate) {
                                  void updateRow(row.id, { workDate: e.target.value });
                                }
                              }}
                              className="pin-field min-w-[9rem] py-1 text-sm"
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <input
                              type="number"
                              min="0.25"
                              step="0.25"
                              defaultValue={row.days}
                              onBlur={(e) => {
                                const days = parseNum(e.target.value);
                                if (days !== row.days) void updateRow(row.id, { days });
                              }}
                              className="pin-field w-20 py-1 text-sm"
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              defaultValue={row.rate}
                              onBlur={(e) => {
                                const rate = parseNum(e.target.value);
                                if (rate !== row.rate) void updateRow(row.id, { rate });
                              }}
                              className="pin-field w-24 py-1 text-sm"
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <input
                              defaultValue={row.description ?? ""}
                              onBlur={(e) => {
                                const desc = e.target.value.trim();
                                if (desc !== (row.description ?? "")) {
                                  void updateRow(row.id, { description: desc || null });
                                }
                              }}
                              className="pin-field min-w-[8rem] py-1 text-sm"
                            />
                          </td>
                          <td className="py-2 pr-2 text-right font-semibold text-pin-ink">
                            {(row.days * row.rate).toFixed(2)} {row.currency}
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
                  </table>
                </section>

                <section className="pin-card flex flex-wrap items-center justify-between gap-4 p-4 md:p-6">
                  <div>
                    <p className="text-sm text-pin-muted">
                      {t("timesheet.totalDays")}:{" "}
                      <span className="font-bold text-pin-ink">{totals.totalDays}</span>
                    </p>
                    <p className="mt-1 text-lg font-extrabold text-pin-ink">
                      {t("timesheet.grandTotal")}: {totals.grandTotal.toFixed(2)}{" "}
                      {currency.trim().toUpperCase()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={importToInvoice}
                    className="pin-btn-primary min-h-11 rounded-xl px-5 py-2.5 text-sm font-semibold"
                  >
                    {t("timesheet.importInvoice")}
                  </button>
                </section>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function TimesheetFallback() {
  const t = useT();
  return (
    <main className="pin-page px-4 pb-8 pt-4 md:p-10">
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
