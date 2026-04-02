"use client";

import { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { TopNav } from "@/components/top-nav";
import { useT } from "@/lib/i18n/context";
import type { CurrencyCode, ExpenseItem } from "@/lib/mock-data";

type ExportMode =
  | "periodo-empresa"
  | "periodo-pessoal"
  | "cliente-todo"
  | "cliente-periodo";

type DbHealth = {
  ok: boolean;
  db?: {
    hasUrl: boolean;
    host: string | null;
    provider: "missing" | "local" | "neon" | "remote";
  };
};

function fmtAmount(n: number) {
  if (!Number.isFinite(n)) return "";
  return n.toFixed(2);
}

function toCSVRow(values: string[]) {
  const esc = (v: string) => {
    const s = v ?? "";
    const needs = /[;"\n\r]/.test(s);
    const normalized = s.replace(/\r?\n/g, " ");
    return needs ? `"${normalized.replace(/"/g, '""')}"` : normalized;
  };
  return values.map(esc).join(";");
}

/** Carrega imagem do mesmo site (ex.: /receipts/...) para data URL (jsPDF). */
async function fetchImageAsDataUrl(
  path: string,
  readFailMessage: string,
): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const url = path.startsWith("http")
    ? path
    : `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(new Error(readFailMessage));
    fr.readAsDataURL(blob);
  });
}

function dataUrlToImageFormat(dataUrl: string): "PNG" | "JPEG" | "WEBP" {
  if (/^data:image\/png/i.test(dataUrl)) return "PNG";
  if (/^data:image\/webp/i.test(dataUrl)) return "WEBP";
  return "JPEG";
}

export default function ExportarPage() {
  const t = useT();
  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>([]);
  const [clients, setClients] = useState<string[]>([]);
  const [mode, setMode] = useState<ExportMode>("periodo-empresa");
  const [clientName, setClientName] = useState("");
  const [startDate, setStartDate] = useState("2026-03-01");
  const [endDate, setEndDate] = useState("2026-03-31");
  const [hiddenRows, setHiddenRows] = useState<string[]>([]);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dbHealth, setDbHealth] = useState<DbHealth | null>(null);

  useEffect(() => {
    void Promise.all([fetch("/api/expenses"), fetch("/api/clients")])
      .then(async ([ex, cl]) => {
        if (!ex.ok || !cl.ok) throw new Error(t("export.fetchDataFail"));
        const expenses = (await ex.json()) as ExpenseItem[];
        const clRows = (await cl.json()) as { name: string }[];
        if (Array.isArray(expenses)) setExpenseItems(expenses);
        const names = clRows.map((r) => r.name);
        setClients(names);
        if (names[0]) setClientName((prev) => prev || names[0]);
        setLoadError(null);
      })
      .catch(async () => {
        setLoadError(t("export.loadError"));
        try {
          const healthRes = await fetch("/api/health/db");
          const health = (await healthRes.json()) as DbHealth;
          setDbHealth(health);
        } catch {
          setDbHealth(null);
        }
      });
  }, [t]);

  useEffect(() => {
    void fetch("/api/health/db")
      .then(async (res) => {
        const health = (await res.json()) as DbHealth;
        setDbHealth(health);
      })
      .catch(() => {
        setDbHealth(null);
      });
  }, []);

  const filteredRows = useMemo(() => {
    const base = expenseItems.filter((item) => !hiddenRows.includes(item.id));

    const inDateRange = (d: string) => d >= startDate && d <= endDate;

    if (mode === "periodo-empresa") {
      return base.filter((item) => item.type === "empresa" && inDateRange(item.date));
    }
    if (mode === "periodo-pessoal") {
      return base.filter((item) => item.type === "pessoal" && inDateRange(item.date));
    }
    if (mode === "cliente-todo") {
      return base.filter((item) => item.type === "cliente" && item.clientName === clientName);
    }
    // cliente-periodo
    return base.filter(
      (item) => item.type === "cliente" && item.clientName === clientName && inDateRange(item.date),
    );
  }, [clientName, endDate, expenseItems, hiddenRows, mode, startDate]);

  const visibleRows = filteredRows;

  const totalsByCurrency = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of visibleRows) {
      const key = row.currency as CurrencyCode;
      map.set(key, (map.get(key) ?? 0) + row.amount);
    }
    return Array.from(map.entries()).map(([currency, total]) => ({ currency, total }));
  }, [visibleRows]);

  function expenseTypeLabel(type: ExpenseItem["type"]) {
    if (type === "empresa") return t("type.empresa");
    if (type === "pessoal") return t("type.pessoal");
    return t("type.cliente");
  }

  function downloadCSV() {
    const headers = [
      t("export.table.num"),
      t("export.table.date"),
      t("export.col.type"),
      t("export.table.category"),
      t("export.table.merchant"),
      t("export.table.value"),
      t("export.col.currency"),
      t("export.table.id"),
    ];

    const lines = visibleRows.map((r, idx) => {
      const type = expenseTypeLabel(r.type);
      return toCSVRow([
        String(idx + 1),
        r.date,
        type,
        r.category,
        r.merchant,
        fmtAmount(r.amount),
        r.currency,
        r.id,
      ]);
    });

    const csv = [toCSVRow(headers), ...lines].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const fileSafeMode = mode.replace(/[^a-z0-9]+/gi, "-");
    a.download = `pinmybill-${fileSafeMode}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function generatePDF() {
    if (visibleRows.length === 0) return;
    setPdfGenerating(true);
    setPdfError(null);
    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const title =
        mode === "periodo-empresa"
          ? t("export.pdfTitlePeriodCompany", { start: startDate, end: endDate })
          : mode === "periodo-pessoal"
            ? t("export.pdfTitlePeriodPersonal", { start: startDate, end: endDate })
            : mode === "cliente-todo"
              ? t("export.pdfTitleClientAll", { name: clientName })
              : t("export.pdfTitleClientPeriod", {
                  name: clientName,
                  start: startDate,
                  end: endDate,
                });

      doc.setFontSize(14);
      doc.text(t("export.pdfDocumentTitle"), 40, 30);
      doc.setFontSize(12);
      doc.text(title, 40, 52);

      const head = [
        [
          t("export.table.num"),
          t("export.table.date"),
          t("export.col.type"),
          t("export.table.category"),
          t("export.table.merchant"),
          t("export.table.value"),
          t("export.col.currency"),
        ],
      ];
      const body = visibleRows.map((r, idx) => {
        const type = expenseTypeLabel(r.type);
        return [
          String(idx + 1),
          r.date,
          type,
          r.category,
          r.merchant,
          fmtAmount(r.amount),
          r.currency,
        ];
      });

      autoTable(doc, {
        head,
        body,
        startY: 70,
        styles: { fontSize: 8, cellPadding: 2.5 },
        columnStyles: {
          0: { cellWidth: 26, halign: "center", fontStyle: "bold" },
        },
        headStyles: { fillColor: [13, 148, 136], textColor: 255 },
        theme: "grid",
        pageBreak: "auto",
      });

      type DocWithTable = typeof doc & { lastAutoTable?: { finalY: number } };
      const afterTable = doc as DocWithTable;
      let yAfterTable = afterTable.lastAutoTable?.finalY ?? 120;

      if (totalsByCurrency.length > 0) {
        yAfterTable += 14;
        doc.setFontSize(9);
        doc.setTextColor(13, 148, 136);
        doc.text(t("export.pdfTotalsVisibleRows"), 40, yAfterTable);
        yAfterTable += 14;
        doc.setTextColor(28, 25, 23);
        for (const t of totalsByCurrency) {
          doc.text(`${t.currency}: ${fmtAmount(t.total)}`, 40, yAfterTable);
          yAfterTable += 12;
        }
      }

      const margin = 40;
      for (let i = 0; i < visibleRows.length; i++) {
        doc.addPage("a4", "p");
        const row = visibleRows[i];
        const n = i + 1;
        doc.setFontSize(12);
        doc.setTextColor(28, 25, 23);
        doc.text(t("export.pdfReceiptHeading", { n: String(n) }), margin, 36);
        doc.setFontSize(9);
        doc.text(`${row.id} · ${row.merchant} · ${row.date}`, margin, 52);

        if (!row.receiptImageUrl) {
          doc.setFontSize(10);
          doc.text(t("export.pdfNoImageBody"), margin, 76);
          continue;
        }

        try {
          const dataUrl = await fetchImageAsDataUrl(
            row.receiptImageUrl,
            t("export.imageReadFail"),
          );
          if (!dataUrl) {
            doc.setFontSize(10);
            doc.text(t("export.pdfImageFetchFail"), margin, 76);
            continue;
          }
          const fmt = dataUrlToImageFormat(dataUrl);
          const props = doc.getImageProperties(dataUrl);
          const pageW = doc.internal.pageSize.getWidth();
          const pageH = doc.internal.pageSize.getHeight();
          const maxW = pageW - 2 * margin;
          const maxH = pageH - 80;
          let w = props.width;
          let h = props.height;
          const scale = Math.min(maxW / w, maxH / h, 1);
          w *= scale;
          h *= scale;
          doc.addImage(dataUrl, fmt, margin, 62, w, h);
        } catch {
          doc.setFontSize(10);
          doc.text(t("export.pdfImagePageError"), margin, 76);
        }
      }

      doc.save(`pinmybill-${mode}.pdf`);
    } catch (e) {
      setPdfError(e instanceof Error ? e.message : t("export.pdfGenerateFail"));
    } finally {
      setPdfGenerating(false);
    }
  }

  function removeRow(id: string, merchant: string) {
    if (!globalThis.confirm(t("export.removeRow", { merchant }))) {
      return;
    }
    setHiddenRows((prev) => [...prev, id]);
  }

  return (
    <main className="pin-page px-4 pb-8 pt-4 md:p-10">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-6 text-3xl font-extrabold tracking-tight text-pin-ink md:mb-8 md:text-4xl">
          {t("export.title")}
        </h1>

        <TopNav />

        {loadError ? (
          <p className="mt-4 rounded-xl bg-pin-warm-soft px-4 py-3 text-sm font-medium text-amber-950 ring-1 ring-amber-200/80 dark:bg-amber-950/30 dark:text-amber-100 dark:ring-amber-800">
            {loadError}
            {dbHealth?.db?.provider === "local" ? t("hist.dbLocal") : ""}
            {dbHealth?.db?.provider === "missing" ? t("hist.dbMissing") : ""}
          </p>
        ) : null}

        <section className="pin-card p-6 text-pin-ink">
          <h2 className="text-lg font-bold text-pin-ink">{t("export.filters")}</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-pin-muted">
              {t("export.exportType")}
              <select
                value={mode}
                onChange={(event) => {
                  setHiddenRows([]);
                  setMode(event.target.value as ExportMode);
                }}
                className="pin-field"
              >
                <option value="periodo-empresa">{t("export.modePeriodCompany")}</option>
                <option value="periodo-pessoal">{t("export.modePeriodPersonal")}</option>
                <option value="cliente-todo">{t("export.modeClientAll")}</option>
                <option value="cliente-periodo">{t("export.modeClientPeriod")}</option>
              </select>
            </label>

            {(mode === "cliente-todo" || mode === "cliente-periodo") && (
              <label className="flex flex-col gap-2 text-sm font-medium text-pin-muted">
                {t("export.client")}
                <select
                  value={clientName}
                  onChange={(event) => {
                    setHiddenRows([]);
                    setClientName(event.target.value);
                  }}
                  className="pin-field"
                >
                  {clients.map((client) => (
                    <option key={client} value={client}>
                      {client}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {mode === "periodo-empresa" ||
            mode === "periodo-pessoal" ||
            mode === "cliente-periodo" ? (
              <div className="col-span-full grid grid-cols-2 gap-3 sm:gap-4">
                <label className="flex min-w-0 flex-col gap-2 text-sm font-medium text-pin-muted">
                  {t("export.startDate")}
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => {
                      setHiddenRows([]);
                      setStartDate(event.target.value);
                    }}
                    className="pin-field min-w-0"
                  />
                </label>
                <label className="flex min-w-0 flex-col gap-2 text-sm font-medium text-pin-muted">
                  {t("export.endDate")}
                  <input
                    type="date"
                    value={endDate}
                    onChange={(event) => {
                      setHiddenRows([]);
                      setEndDate(event.target.value);
                    }}
                    className="pin-field min-w-0"
                  />
                </label>
              </div>
            ) : null}
          </div>

          {visibleRows.length > 0 ? (
            <div className="mt-6 rounded-xl border border-teal-200/60 bg-pin-teal-soft/50 px-4 py-3 dark:border-teal-800/50 dark:bg-teal-950/30">
              <p className="text-xs font-semibold uppercase tracking-wide text-pin-muted">
                {t("export.totalsTitle")}
              </p>
              <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm font-semibold text-pin-ink">
                {totalsByCurrency.map((t) => (
                  <li key={t.currency}>
                    {t.currency}{" "}
                    <span className="text-pin-accent">{fmtAmount(t.total)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={downloadCSV}
              className="pin-btn-secondary min-h-11 rounded-full px-5 py-2.5 text-sm disabled:opacity-50"
              disabled={visibleRows.length === 0}
            >
              {t("export.csv")}
            </button>
            <button
              type="button"
              onClick={() => void generatePDF()}
              className="min-h-11 rounded-full border border-teal-700/25 bg-gradient-to-b from-white to-teal-50/90 px-5 py-2.5 text-sm font-semibold text-teal-900 shadow-sm ring-1 ring-teal-900/5 transition hover:border-teal-700/40 hover:to-teal-100/95 active:scale-[0.99] disabled:opacity-50 dark:border-teal-500/30 dark:from-stone-900 dark:to-teal-950/50 dark:text-teal-100 dark:ring-teal-400/10 dark:hover:border-teal-400/45 dark:hover:to-teal-900/40"
              disabled={visibleRows.length === 0 || pdfGenerating}
            >
              {pdfGenerating ? t("export.pdfGenerating") : t("export.pdf")}
            </button>
          </div>
          {pdfError ? (
            <p className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">{pdfError}</p>
          ) : null}

          <div className="mt-6 overflow-hidden rounded-xl border border-stone-200/80 dark:border-stone-700">
            <p className="border-b border-stone-200/80 bg-pin-teal-soft/30 px-3 py-2 text-xs text-pin-muted dark:border-stone-700 dark:bg-teal-950/20">
              {t("export.reminder")}
            </p>
            <table className="w-full text-left text-sm text-pin-ink">
              <thead className="bg-pin-teal-soft/90 text-pin-muted dark:bg-teal-950/40 dark:text-stone-400">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">{t("export.table.num")}</th>
                  <th className="px-3 py-2.5 font-semibold">{t("export.table.id")}</th>
                  <th className="px-3 py-2.5 font-semibold">{t("export.table.date")}</th>
                  <th className="px-3 py-2.5 font-semibold">{t("export.table.merchant")}</th>
                  <th className="px-3 py-2.5 font-semibold">{t("export.table.category")}</th>
                  <th className="px-3 py-2.5 font-semibold">{t("export.table.value")}</th>
                  <th className="px-3 py-2.5 font-semibold">{t("export.table.action")}</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((item, idx) => {
                  const hasImage = Boolean(item.receiptImageUrl);
                  return (
                  <tr
                    key={item.id}
                    className="border-t border-stone-200/80 transition-colors duration-150 hover:bg-pin-teal-soft/50 dark:border-stone-700 dark:hover:bg-teal-950/25"
                  >
                    <td
                      className={`px-3 py-2.5 font-bold tabular-nums ${
                        hasImage ? "text-pin-accent" : "text-red-600 dark:text-red-400"
                      }`}
                      title={hasImage ? undefined : t("export.noImageTitle")}
                    >
                      {idx + 1}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-pin-ink">{item.id}</td>
                    <td className="px-3 py-2.5 tabular-nums text-pin-muted">{item.date}</td>
                    <td className="px-3 py-2.5 text-pin-muted">{item.merchant}</td>
                    <td className="px-3 py-2.5 text-pin-muted">{item.category}</td>
                    <td className="px-3 py-2.5 font-semibold text-pin-accent">
                      {item.currency} {item.amount}
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => removeRow(item.id, item.merchant)}
                        className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg bg-red-50 text-base font-bold leading-none text-red-700 shadow-sm ring-1 ring-red-200/90 transition-all duration-150 hover:bg-red-100 hover:shadow active:scale-95 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-800/60"
                        aria-label={t("export.removeRowAria")}
                        title={t("export.removeRowAria")}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                  );
                })}
                {visibleRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-4 text-pin-muted">
                      {t("export.empty")}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
