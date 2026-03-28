"use client";

import { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { TopNav } from "@/components/top-nav";
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
async function fetchImageAsDataUrl(path: string): Promise<string | null> {
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
    fr.onerror = () => reject(new Error("Leitura da imagem falhou."));
    fr.readAsDataURL(blob);
  });
}

function dataUrlToImageFormat(dataUrl: string): "PNG" | "JPEG" | "WEBP" {
  if (/^data:image\/png/i.test(dataUrl)) return "PNG";
  if (/^data:image\/webp/i.test(dataUrl)) return "WEBP";
  return "JPEG";
}

export default function ExportarPage() {
  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>([]);
  const [clients, setClients] = useState<string[]>([]);
  const [mode, setMode] = useState<ExportMode>("periodo-empresa");
  const [clientName, setClientName] = useState("");
  const [startDate, setStartDate] = useState("2026-03-01");
  const [endDate, setEndDate] = useState("2026-03-31");
  const [hiddenRows, setHiddenRows] = useState<string[]>([]);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  /** Se true, o PDF inclui uma secao com totais por moeda apos a tabela (antes das fotos). */
  const [pdfIncludeTotals, setPdfIncludeTotals] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dbHealth, setDbHealth] = useState<DbHealth | null>(null);

  useEffect(() => {
    void Promise.all([fetch("/api/expenses"), fetch("/api/clients")])
      .then(async ([ex, cl]) => {
        if (!ex.ok || !cl.ok) throw new Error("Falha a carregar dados.");
        const expenses = (await ex.json()) as ExpenseItem[];
        const clRows = (await cl.json()) as { name: string }[];
        if (Array.isArray(expenses)) setExpenseItems(expenses);
        const names = clRows.map((r) => r.name);
        setClients(names);
        if (names[0]) setClientName((prev) => prev || names[0]);
        setLoadError(null);
      })
      .catch(async () => {
        setLoadError("Nao foi possivel carregar exportacao (timeout ou erro Neon/Prisma).");
        try {
          const healthRes = await fetch("/api/health/db");
          const health = (await healthRes.json()) as DbHealth;
          setDbHealth(health);
        } catch {
          setDbHealth(null);
        }
      });
  }, []);

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

  function downloadCSV() {
    const headers = [
      "#",
      "Data",
      "Tipo",
      "Cliente",
      "Categoria",
      "Comerciante",
      "Valor",
      "Moeda",
      "ID",
    ];

    const lines = visibleRows.map((r, idx) => {
      const type =
        r.type === "empresa" ? "Empresa" : r.type === "pessoal" ? "Pessoal" : "Cliente";
      const client = r.type === "cliente" ? r.clientName ?? "" : "";
      return toCSVRow([
        String(idx + 1),
        r.date,
        type,
        client,
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
          ? `Periodo - Empresa (${startDate} a ${endDate})`
          : mode === "periodo-pessoal"
            ? `Periodo - Pessoal (${startDate} a ${endDate})`
            : mode === "cliente-todo"
              ? `Cliente - ${clientName} (tudo)`
              : `Cliente - ${clientName} (${startDate} a ${endDate})`;

      doc.setFontSize(14);
      doc.text(`PinMyBill - Exportacao`, 40, 30);
      doc.setFontSize(12);
      doc.text(title, 40, 52);

      const head = [["#", "Data", "Tipo", "Cliente", "Categoria", "Comerciante", "Valor", "Moeda"]];
      const body = visibleRows.map((r, idx) => {
        const type =
          r.type === "empresa" ? "Empresa" : r.type === "pessoal" ? "Pessoal" : "Cliente";
        return [
          String(idx + 1),
          r.date,
          type,
          r.type === "cliente" ? r.clientName ?? "" : "",
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

      if (pdfIncludeTotals && totalsByCurrency.length > 0) {
        yAfterTable += 14;
        doc.setFontSize(9);
        doc.setTextColor(13, 148, 136);
        doc.text("Totais por moeda (linhas visiveis):", 40, yAfterTable);
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
        doc.text(`Recibo ${n} (mesmo numero da coluna #)`, margin, 36);
        doc.setFontSize(9);
        doc.text(`${row.id} · ${row.merchant} · ${row.date}`, margin, 52);

        if (!row.receiptImageUrl) {
          doc.setFontSize(10);
          doc.text("Sem imagem de recibo anexada.", margin, 76);
          continue;
        }

        try {
          const dataUrl = await fetchImageAsDataUrl(row.receiptImageUrl);
          if (!dataUrl) {
            doc.setFontSize(10);
            doc.text("Nao foi possivel carregar a imagem (URL ou rede).", margin, 76);
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
          doc.text("Erro ao incluir a imagem nesta pagina.", margin, 76);
        }
      }

      doc.save(`pinmybill-${mode}.pdf`);
    } catch (e) {
      setPdfError(e instanceof Error ? e.message : "Falha ao gerar PDF.");
    } finally {
      setPdfGenerating(false);
    }
  }

  function removeRow(id: string) {
    setHiddenRows((prev) => [...prev, id]);
  }

  return (
    <main className="pin-page px-4 pb-8 pt-4 md:p-10">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-pin-ink md:text-4xl">Exportacao</h1>
        <p className="pin-lead mb-8 text-base">
          Seleciona o tipo de exportacao, define o periodo nas datas (podes usar do dia 1 ao ultimo dia do mes),
          remove linhas que nao queres e exporta para Excel (CSV) ou PDF (tabela com # e fotos dos recibos a seguir).
          No PDF podes optar por incluir ou nao os totais por moeda.
        </p>

        <TopNav />

        {dbHealth ? (
          <div className="mt-4 flex justify-end">
            <p className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-pin-teal-soft/65 px-3 py-1 text-[11px] font-semibold text-pin-muted ring-1 ring-teal-200/70 dark:bg-teal-950/25 dark:ring-teal-800/60">
              <span aria-hidden>●</span>
              <span>DB:</span>
              <strong className="text-pin-ink">
                {dbHealth.db?.provider === "neon"
                  ? "Neon"
                  : dbHealth.db?.provider === "local"
                    ? "localhost"
                    : dbHealth.db?.provider === "missing"
                      ? "em falta"
                      : "remota"}
              </strong>
              {dbHealth.db?.host ? (
                <span className="max-w-[14rem] truncate text-pin-soft" title={dbHealth.db.host}>
                  {dbHealth.db.host}
                </span>
              ) : null}
            </p>
          </div>
        ) : null}

        {loadError ? (
          <p className="mt-4 rounded-xl bg-pin-warm-soft px-4 py-3 text-sm font-medium text-amber-950 ring-1 ring-amber-200/80 dark:bg-amber-950/30 dark:text-amber-100 dark:ring-amber-800">
            {loadError}
            {dbHealth?.db?.provider === "local"
              ? " Diagnostico: esta a usar localhost; remove override DATABASE_URL neste terminal."
              : ""}
            {dbHealth?.db?.provider === "missing"
              ? " Diagnostico: DATABASE_URL nao definida no ambiente deste processo."
              : ""}
          </p>
        ) : null}

        <section className="pin-card p-6 text-pin-ink">
          <h2 className="text-lg font-bold text-pin-ink">Filtros de exportacao</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-pin-muted">
              Tipo de exportacao
              <select
                value={mode}
                onChange={(event) => {
                  setHiddenRows([]);
                  setMode(event.target.value as ExportMode);
                }}
                className="pin-field"
              >
                <option value="periodo-empresa">Periodo - Empresa</option>
                <option value="periodo-pessoal">Periodo - Pessoal</option>
                <option value="cliente-todo">Cliente - Tudo</option>
                <option value="cliente-periodo">Cliente - Periodo</option>
              </select>
            </label>

            {(mode === "cliente-todo" || mode === "cliente-periodo") && (
              <label className="flex flex-col gap-2 text-sm font-medium text-pin-muted">
                Cliente
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
              <>
                <label className="flex flex-col gap-2 text-sm font-medium text-pin-muted">
                  Data inicial
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => {
                      setHiddenRows([]);
                      setStartDate(event.target.value);
                    }}
                    className="pin-field"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-pin-muted">
                  Data final
                  <input
                    type="date"
                    value={endDate}
                    onChange={(event) => {
                      setHiddenRows([]);
                      setEndDate(event.target.value);
                    }}
                    className="pin-field"
                  />
                </label>
              </>
            ) : null}
          </div>

          {visibleRows.length > 0 ? (
            <div className="mt-6 rounded-xl border border-teal-200/60 bg-pin-teal-soft/50 px-4 py-3 dark:border-teal-800/50 dark:bg-teal-950/30">
              <p className="text-xs font-semibold uppercase tracking-wide text-pin-muted">
                Totais por moeda (ecra; opcional no PDF — ver opcao acima da lista)
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

          <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-stone-200/80 bg-white/60 px-4 py-3 text-sm text-pin-ink dark:border-stone-700 dark:bg-stone-900/40">
            <input
              type="checkbox"
              checked={pdfIncludeTotals}
              onChange={(e) => setPdfIncludeTotals(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-stone-300 text-pin-accent focus:ring-pin-accent"
            />
            <span>
              <span className="font-semibold">Incluir totais por moeda no PDF</span>
              <span className="mt-0.5 block text-pin-muted">
                Se desmarcado, o PDF fica so com a tabela e as fotos (como antes).
              </span>
            </span>
          </label>

          <div className="mt-6 overflow-hidden rounded-xl border border-stone-200/80 dark:border-stone-700">
            <p className="border-b border-stone-200/80 bg-pin-teal-soft/30 px-3 py-2 text-xs text-pin-muted dark:border-stone-700 dark:bg-teal-950/20">
              Lembrete: <span className="font-semibold text-red-600 dark:text-red-400">#</span> a vermelho = sem
              imagem de recibo.
            </p>
            <table className="w-full text-left text-sm text-pin-ink">
              <thead className="bg-pin-teal-soft/90 text-pin-muted dark:bg-teal-950/40 dark:text-stone-400">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">#</th>
                  <th className="px-3 py-2.5 font-semibold">ID</th>
                  <th className="px-3 py-2.5 font-semibold">Comerciante</th>
                  <th className="px-3 py-2.5 font-semibold">Categoria</th>
                  <th className="px-3 py-2.5 font-semibold">Cliente</th>
                  <th className="px-3 py-2.5 font-semibold">Valor</th>
                  <th className="px-3 py-2.5 font-semibold">Acao</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((item, idx) => {
                  const hasImage = Boolean(item.receiptImageUrl);
                  return (
                  <tr key={item.id} className="border-t border-stone-200/80 dark:border-stone-700">
                    <td
                      className={`px-3 py-2.5 font-bold tabular-nums ${
                        hasImage ? "text-pin-accent" : "text-red-600 dark:text-red-400"
                      }`}
                      title={hasImage ? undefined : "Sem imagem de recibo anexada"}
                    >
                      {idx + 1}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-pin-ink">{item.id}</td>
                    <td className="px-3 py-2.5 text-pin-muted">{item.merchant}</td>
                    <td className="px-3 py-2.5 text-pin-muted">{item.category}</td>
                    <td className="px-3 py-2.5 text-pin-muted">{item.type === "cliente" ? item.clientName ?? "" : ""}</td>
                    <td className="px-3 py-2.5 font-semibold text-pin-accent">
                      {item.currency} {item.amount}
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => removeRow(item.id)}
                        className="rounded-lg bg-red-50 px-2 py-1.5 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-200"
                      >
                        Remover linha
                      </button>
                    </td>
                  </tr>
                  );
                })}
                {visibleRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-4 text-pin-muted">
                      Sem linhas para exportar com os filtros atuais.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={downloadCSV}
              className="pin-btn-secondary min-h-11 rounded-full px-5 py-2.5 text-sm disabled:opacity-50"
              disabled={visibleRows.length === 0}
            >
              Baixar CSV (Excel)
            </button>
            <button
              type="button"
              onClick={() => void generatePDF()}
              className="pin-btn-primary min-h-11 rounded-full px-5 py-2.5 text-sm disabled:opacity-50"
              disabled={visibleRows.length === 0 || pdfGenerating}
            >
              {pdfGenerating ? "A gerar PDF..." : "Gerar PDF (tabela + fotos)"}
            </button>
          </div>
          {pdfError ? (
            <p className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">{pdfError}</p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
