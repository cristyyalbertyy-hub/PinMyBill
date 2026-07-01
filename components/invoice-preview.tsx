"use client";

import type { InvoiceFormData, InvoiceLabels } from "@/lib/invoice-types";
import { INVOICE_ORANGE, computeTaxAmount, fmtInvoiceAmount } from "@/lib/invoice-types";

type Props = {
  data: InvoiceFormData;
  labels: InvoiceLabels;
};

export function InvoicePreview({ data, labels }: Props) {
  const taxAmount = computeTaxAmount(data.amount, data.taxPercent);
  const lineItems =
    data.lineItems.length > 0
      ? data.lineItems
      : [
          {
            description: labels.itemDescription,
            duration: 1,
            rate: data.amount,
            amount: data.amount,
          },
        ];

  const taxLabel =
    data.taxPercent === 0
      ? labels.taxZero
      : `${labels.tax} (${fmtInvoiceAmount(data.taxPercent)}%)`;

  const totalDisplay = data.currency
    ? `${data.currency === "EUR" ? "€" : data.currency}${fmtInvoiceAmount(data.totalAmount)}`
    : fmtInvoiceAmount(data.totalAmount);

  return (
    <article className="overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-950">
      <div className="p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 text-sm text-pin-ink">
            {data.fromName ? <p>{data.fromName}</p> : null}
            {data.fromPhone ? <p>{data.fromPhone}</p> : null}
            {data.fromEmail ? <p>{data.fromEmail}</p> : null}
            {data.fromAddress ? (
              <p className="mt-1 whitespace-pre-wrap text-pin-muted">{data.fromAddress}</p>
            ) : null}
          </div>
          <div className="text-right">
            <p
              className="text-3xl font-bold tracking-tight"
              style={{ color: `rgb(${INVOICE_ORANGE.join(",")})` }}
            >
              {labels.documentTitle}
            </p>
            <p className="mt-1 text-sm text-pin-ink">
              {labels.billNumber} {data.billNumber}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-between gap-4">
          <div className="min-w-[min(100%,14rem)]">
            <p className="text-sm font-bold text-pin-ink">{labels.billTo}</p>
            <p className="mt-2 text-sm font-bold text-pin-ink">{data.toName || "—"}</p>
            {data.toAddress ? (
              <p className="mt-1 whitespace-pre-wrap text-sm text-pin-muted">{data.toAddress}</p>
            ) : null}
          </div>
          <div className="text-right text-sm text-pin-ink">
            <p>
              {labels.date} : {data.date}
            </p>
            <p className="mt-1">
              {labels.terms} : {data.terms || "—"}
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm text-pin-ink">
          <span className="font-bold">{labels.projectName} :</span> {data.projectName || "—"}
        </p>

        <div className="mt-4 overflow-hidden rounded-sm border border-stone-200/80 dark:border-stone-700">
          <table className="w-full text-left text-sm">
            <thead style={{ backgroundColor: `rgb(${INVOICE_ORANGE.join(",")})` }} className="text-white">
              <tr>
                <th className="px-2 py-2 font-semibold">{labels.tableNum}</th>
                <th className="px-2 py-2 font-semibold">{labels.description}</th>
                <th className="px-2 py-2 text-right font-semibold">{labels.duration}</th>
                <th className="px-2 py-2 text-right font-semibold">{labels.rate}</th>
                <th className="px-2 py-2 text-right font-semibold">{labels.amount}</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, idx) => (
                <tr
                  key={`${item.description}-${idx}`}
                  className="border-t border-stone-200/80 dark:border-stone-700"
                >
                  <td className="px-2 py-2 text-center text-pin-muted">{idx + 1}</td>
                  <td className="px-2 py-2 text-pin-ink">{item.description}</td>
                  <td className="px-2 py-2 text-right text-pin-ink">
                    {fmtInvoiceAmount(item.duration)}
                  </td>
                  <td className="px-2 py-2 text-right text-pin-ink">
                    {fmtInvoiceAmount(item.rate)}
                  </td>
                  <td className="px-2 py-2 text-right font-medium text-pin-ink">
                    {fmtInvoiceAmount(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-end">
          <dl className="w-full max-w-[14rem] space-y-1.5 text-sm text-pin-ink">
            <div className="flex justify-between gap-4">
              <dt>{labels.subtotal}</dt>
              <dd>{fmtInvoiceAmount(data.amount)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>{taxLabel}</dt>
              <dd>{fmtInvoiceAmount(taxAmount)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-stone-300 pt-2 font-bold dark:border-stone-600">
              <dt>{labels.total}</dt>
              <dd>{totalDisplay}</dd>
            </div>
          </dl>
        </div>

        {data.notes.trim() ? (
          <div className="mt-5 max-w-[55%]">
            <p className="text-sm font-bold text-pin-ink">{labels.notes}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-pin-muted">{data.notes.trim()}</p>
          </div>
        ) : null}

        <div className="mt-5 max-w-[55%]">
          <p className="text-sm font-bold text-pin-ink">{labels.bankDetails}</p>
          <dl className="mt-2 space-y-1 text-sm text-pin-muted">
            <div>
              {labels.bankAccountName} {data.bank.accountName}
            </div>
            <div>
              {labels.bankName} {data.bank.bankName}
            </div>
            <div>
              {labels.bankAccountNo} {data.bank.accountNo}
            </div>
            <div>
              {labels.bankIban} {data.bank.iban}
            </div>
            <div>
              {labels.bankSwift} {data.bank.swift}
            </div>
            <div>
              {labels.bankCurrency} {data.bank.currency}
            </div>
          </dl>
        </div>
      </div>
    </article>
  );
}
