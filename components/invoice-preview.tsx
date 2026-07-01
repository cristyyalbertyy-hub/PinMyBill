"use client";

import type { InvoiceFormData, InvoiceLabels } from "@/lib/invoice-types";
import { computeTaxAmount } from "@/lib/invoice-types";

type Props = {
  data: InvoiceFormData;
  labels: InvoiceLabels;
};

function fmtAmount(n: number) {
  if (!Number.isFinite(n)) return "0.00";
  return n.toFixed(2);
}

export function InvoicePreview({ data, labels }: Props) {
  const taxAmount = computeTaxAmount(data.amount, data.taxPercent);
  const lineItems =
    data.lineItems.length > 0
      ? data.lineItems
      : [{ description: labels.description, amount: data.amount, date: data.date }];

  return (
    <article className="overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-950">
      <div className="h-1.5 bg-pin-accent" />

      <div className="p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-200/80 pb-5 dark:border-stone-700">
          <div className="min-w-0">
            <p className="text-lg font-bold text-pin-ink">{data.fromName || "—"}</p>
            {data.fromEmail ? (
              <p className="mt-1 text-sm text-pin-muted">
                {labels.email}: {data.fromEmail}
              </p>
            ) : null}
            {data.fromPhone ? (
              <p className="mt-0.5 text-sm text-pin-muted">
                {labels.phone}: {data.fromPhone}
              </p>
            ) : null}
          </div>
          <div className="text-right">
            <p className="text-2xl font-extrabold tracking-tight text-pin-accent">
              {labels.documentTitle}
            </p>
            <p className="mt-1 text-sm text-pin-muted">
              {labels.billNumber}: <span className="font-medium text-pin-ink">{data.billNumber}</span>
            </p>
            <p className="text-sm text-pin-muted">
              {labels.date}: <span className="font-medium text-pin-ink">{data.date}</span>
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-xl bg-stone-50 px-4 py-3 dark:bg-stone-900/70">
          <p className="text-[11px] font-bold uppercase tracking-wider text-pin-accent">
            {labels.billTo}
          </p>
          <p className="mt-1 text-base font-bold text-pin-ink">{data.toName || "—"}</p>
          {data.toEmail ? <p className="mt-1 text-sm text-pin-muted">{data.toEmail}</p> : null}
          {data.toPhone ? <p className="mt-0.5 text-sm text-pin-muted">{data.toPhone}</p> : null}
        </div>

        <div className="mt-5 overflow-hidden rounded-xl border border-stone-200/80 dark:border-stone-700">
          <table className="w-full text-left text-sm">
            <thead className="bg-pin-accent text-white">
              <tr>
                <th className="px-3 py-2.5 font-semibold">{labels.description}</th>
                <th className="px-3 py-2.5 font-semibold">{labels.tableDate}</th>
                <th className="px-3 py-2.5 text-right font-semibold">{labels.amount}</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, idx) => (
                <tr
                  key={`${item.description}-${idx}`}
                  className="border-t border-stone-200/80 dark:border-stone-700"
                >
                  <td className="px-3 py-2.5 text-pin-ink">{item.description}</td>
                  <td className="px-3 py-2.5 text-pin-muted">{item.date ?? ""}</td>
                  <td className="px-3 py-2.5 text-right font-medium text-pin-ink">
                    {data.currency} {fmtAmount(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex justify-end">
          <dl className="w-full max-w-xs space-y-2 text-sm">
            <div className="flex justify-between gap-4 text-pin-muted">
              <dt>{labels.subtotal}</dt>
              <dd className="font-medium text-pin-ink">
                {data.currency} {fmtAmount(data.amount)}
              </dd>
            </div>
            <div className="flex justify-between gap-4 text-pin-muted">
              <dt>
                {labels.tax} ({fmtAmount(data.taxPercent)}%)
              </dt>
              <dd className="font-medium text-pin-ink">
                {data.currency} {fmtAmount(taxAmount)}
              </dd>
            </div>
            <div className="flex justify-between gap-4 rounded-lg bg-pin-accent px-3 py-2.5 font-bold text-white">
              <dt>{labels.total}</dt>
              <dd>
                {data.currency} {fmtAmount(data.totalAmount)}
              </dd>
            </div>
          </dl>
        </div>

        {data.notes.trim() ? (
          <div className="mt-5 border-t border-stone-200/80 pt-4 dark:border-stone-700">
            <p className="text-sm font-semibold text-pin-ink">{labels.notes}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-pin-muted">{data.notes.trim()}</p>
          </div>
        ) : null}
      </div>
    </article>
  );
}
