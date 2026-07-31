"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TopNav } from "@/components/top-nav";
import { useT } from "@/lib/i18n/context";
import { useProject } from "@/lib/project-context";
import type { ClientDetail, TimesheetImportPayload, TimesheetRow } from "@/lib/profile-types";
import { TIMESHEET_IMPORT_KEY } from "@/lib/profile-types";
import { computeTotalHours, formatHours } from "@/lib/timesheet-utils";

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
  const { ready: projectReady, activeProject, projects, setActiveProject } = useProject();

  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientDetail[]>([]);
  const [clientName, setClientName] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
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
      setHourlyRate(String(data[data.length - 1].rate));
      setCurrency(data[data.length - 1].currency);
    }
  }, []);

  useEffect(() => {
    if (!projectReady) return;
    void Promise.all([fetch("/api/clients"), fetch("/api/account/profile")])
      .then(async ([cl, pr]) => {
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

        if (pr.ok) {
          const profile = (await pr.json()) as { bank: { currency: string } };
          if (profile.bank.currency) setCurrency(profile.bank.currency);
          else if (activeProject?.bank.currency) setCurrency(activeProject.bank.currency);
        }
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
    void loadRows(clientName).catch(() => setLoadError(t("timesheet.loadError")));
  }, [clientName, loadRows, ready, t]);

  const rate = parseNum(hourlyRate);

  const totals = useMemo(() => {
    let totalHours = 0;
    for (const row of rows) {
      totalHours += row.totalHours;
    }
    return {
      totalHours,
      grandTotal: totalHours * rate,
    };
  }, [rate, rows]);

  async function addRow() {
    if (!clientName.trim() || rate <= 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/timesheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: clientName.trim(),
          workDate: todayIso(),
          startTime: "09:00",
          endTime: "17:00",
          breakMinutes: 60,
          rate,
          currency: currency.trim().toUpperCase(),
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

  async function updateRow(
    id: string,
    patch: Partial<Pick<TimesheetRow, "workDate" | "startTime" | "endTime" | "breakMinutes">>,
  ) {
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
    if (rows.length === 0 || totals.grandTotal <= 0 || rate <= 0) return;
    const payload: TimesheetImportPayload = {
      clientName,
      currency: currency.trim().toUpperCase(),
      total: totals.grandTotal,
      lineItems: [
        {
          description: t("timesheet.invoiceLine", { client: clientName }),
          duration: totals.totalHours,
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

  return (
    <main className="pin-page px-4 pb-8 md:p-10">
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
                {t("timesheet.hourlyRate")}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
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

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-xs font-bold uppercase tracking-wider text-pin-muted dark:border-stone-700">
                    <th className="pb-2 pr-2">{t("timesheet.date")}</th>
                    <th className="pb-2 pr-2">{t("timesheet.startTime")}</th>
                    <th className="pb-2 pr-2">{t("timesheet.endTime")}</th>
                    <th className="pb-2 pr-2">{t("timesheet.break")}</th>
                    <th className="pb-2 pr-2 text-right">{t("timesheet.totalHours")}</th>
                    <th className="pb-2 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const liveHours = computeTotalHours(
                      row.startTime,
                      row.endTime,
                      row.breakMinutes,
                    );
                    return (
                      <tr
                        key={row.id}
                        className="border-b border-stone-100 dark:border-stone-800"
                      >
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
                            type="time"
                            defaultValue={row.startTime}
                            onBlur={(e) => {
                              if (e.target.value !== row.startTime) {
                                void updateRow(row.id, { startTime: e.target.value });
                              }
                            }}
                            className="pin-field min-w-[6rem] py-1 text-sm"
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <input
                            type="time"
                            defaultValue={row.endTime}
                            onBlur={(e) => {
                              if (e.target.value !== row.endTime) {
                                void updateRow(row.id, { endTime: e.target.value });
                              }
                            }}
                            className="pin-field min-w-[6rem] py-1 text-sm"
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <input
                            type="number"
                            min="0"
                            step="5"
                            defaultValue={row.breakMinutes}
                            onBlur={(e) => {
                              const brk = Math.max(0, parseNum(e.target.value));
                              if (brk !== row.breakMinutes) {
                                void updateRow(row.id, { breakMinutes: brk });
                              }
                            }}
                            className="pin-field w-20 py-1 text-sm"
                            title={t("timesheet.breakHint")}
                          />
                        </td>
                        <td className="py-2 pr-2 text-right font-semibold tabular-nums text-pin-ink">
                          {formatHours(liveHours)} h
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
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-stone-200 dark:border-stone-700">
                    <td colSpan={4} className="pt-4 pr-2">
                      <button
                        type="button"
                        onClick={() => void addRow()}
                        disabled={saving || !clientName || rate <= 0}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-pin-teal-soft text-xl font-bold text-pin-accent ring-1 ring-teal-200 transition hover:bg-teal-100 active:scale-95 disabled:opacity-50 dark:bg-teal-950/50 dark:ring-teal-800"
                        aria-label={t("timesheet.addDay")}
                        title={t("timesheet.addDay")}
                      >
                        +
                      </button>
                      {rows.length === 0 ? (
                        <span className="ml-3 text-sm text-pin-muted">{t("timesheet.empty")}</span>
                      ) : null}
                    </td>
                    <td className="pt-4 pr-2 text-right">
                      <p className="text-xs font-medium uppercase tracking-wider text-pin-muted">
                        {t("timesheet.totalHours")}
                      </p>
                      <p className="text-lg font-extrabold tabular-nums text-pin-ink">
                        {formatHours(totals.totalHours)} h
                      </p>
                    </td>
                    <td />
                  </tr>
                  {rows.length > 0 && rate > 0 ? (
                    <tr>
                      <td colSpan={4} className="pb-2 pt-1 text-sm text-pin-muted">
                        {formatHours(totals.totalHours)} h × {rate.toFixed(2)} {currency.trim().toUpperCase()}
                      </td>
                      <td className="pb-2 pt-1 text-right">
                        <p className="text-xs font-medium uppercase tracking-wider text-pin-muted">
                          {t("timesheet.grandTotal")}
                        </p>
                        <p className="text-xl font-extrabold tabular-nums text-pin-accent">
                          {totals.grandTotal.toFixed(2)} {currency.trim().toUpperCase()}
                        </p>
                      </td>
                      <td />
                    </tr>
                  ) : null}
                </tfoot>
              </table>
            </div>

            {rows.length > 0 && rate > 0 ? (
              <div className="mt-5 flex justify-end border-t border-stone-200/80 pt-5 dark:border-stone-700">
                <button
                  type="button"
                  onClick={importToInvoice}
                  className="pin-btn-primary min-h-11 rounded-xl px-5 py-2.5 text-sm font-semibold"
                >
                  {t("timesheet.importInvoice")}
                </button>
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
    <main className="pin-page px-4 pb-8 md:p-10">
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
