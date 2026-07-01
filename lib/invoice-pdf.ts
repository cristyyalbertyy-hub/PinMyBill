import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { InvoiceFormData, InvoiceLabels } from "@/lib/invoice-types";
import {
  INVOICE_ORANGE,
  computeTaxAmount,
  fmtInvoiceAmount,
} from "@/lib/invoice-types";

export type InvoicePdfData = InvoiceFormData & { labels: InvoiceLabels };

function drawMultiline(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

export function generateInvoicePdf(data: InvoicePdfData): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const margin = 48;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - margin * 2;
  const orange = INVOICE_ORANGE;

  let y = 48;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(28, 25, 23);
  if (data.fromName) {
    doc.text(data.fromName, margin, y);
    y += 14;
  }
  if (data.fromPhone) {
    doc.text(data.fromPhone, margin, y);
    y += 14;
  }
  if (data.fromEmail) {
    doc.text(data.fromEmail, margin, y);
    y += 14;
  }
  if (data.fromAddress) {
    y = drawMultiline(doc, data.fromAddress, margin, y, contentWidth * 0.45, 13);
  }

  const headerLeftBottom = y;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(...orange);
  doc.text(data.labels.documentTitle, pageWidth - margin, 52, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(28, 25, 23);
  doc.text(`${data.labels.billNumber} ${data.billNumber}`, pageWidth - margin, 72, {
    align: "right",
  });

  y = Math.max(headerLeftBottom, 88) + 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(28, 25, 23);
  doc.text(data.labels.billTo, margin, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`${data.labels.date} : ${data.date}`, pageWidth - margin, y, { align: "right" });
  y += 16;
  doc.text(`${data.labels.terms} : ${data.terms || "—"}`, pageWidth - margin, y, {
    align: "right",
  });

  y += 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(data.toName || "—", margin, y);
  y += 14;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  if (data.toAddress) {
    y = drawMultiline(doc, data.toAddress, margin, y, contentWidth * 0.5, 13);
  }
  if (data.toEmail) {
    doc.text(data.toEmail, margin, y);
    y += 13;
  }
  if (data.toPhone) {
    doc.text(data.toPhone, margin, y);
    y += 13;
  }

  y += 8;
  doc.setTextColor(28, 25, 23);
  doc.setFont("helvetica", "bold");
  doc.text(`${data.labels.projectName} :`, margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.projectName || "—", margin + doc.getTextWidth(`${data.labels.projectName} : `) + 4, y);
  y += 22;

  const tableBody =
    data.lineItems.length > 0
      ? data.lineItems.map((item, idx) => [
          String(idx + 1),
          item.description,
          fmtInvoiceAmount(item.duration),
          fmtInvoiceAmount(item.rate),
          fmtInvoiceAmount(item.amount),
        ])
      : [
          [
            "1",
            data.labels.itemDescription,
            "1.00",
            fmtInvoiceAmount(data.amount),
            fmtInvoiceAmount(data.amount),
          ],
        ];

  autoTable(doc, {
    startY: y,
    head: [
      [
        data.labels.tableNum,
        data.labels.description,
        data.labels.duration,
        data.labels.rate,
        data.labels.amount,
      ],
    ],
    body: tableBody,
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 5, textColor: [28, 25, 23] },
    headStyles: {
      fillColor: orange,
      textColor: 255,
      fontStyle: "bold",
      halign: "left",
    },
    columnStyles: {
      0: { cellWidth: 28, halign: "center" },
      1: { cellWidth: contentWidth * 0.38 },
      2: { cellWidth: contentWidth * 0.14, halign: "right" },
      3: { cellWidth: contentWidth * 0.18, halign: "right" },
      4: { cellWidth: contentWidth * 0.18, halign: "right" },
    },
    theme: "grid",
  });

  type DocWithTable = typeof doc & { lastAutoTable?: { finalY: number } };
  y = ((doc as DocWithTable).lastAutoTable?.finalY ?? y + 40) + 18;

  const taxAmount = computeTaxAmount(data.amount, data.taxPercent);
  const summaryX = pageWidth - margin - 150;
  const valueX = pageWidth - margin;
  const taxLabel =
    data.taxPercent === 0
      ? data.labels.taxZero
      : `${data.labels.tax} (${fmtInvoiceAmount(data.taxPercent)}%)`;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(28, 25, 23);
  doc.text(data.labels.subtotal, summaryX, y);
  doc.text(fmtInvoiceAmount(data.amount), valueX, y, { align: "right" });
  y += 16;

  doc.text(taxLabel, summaryX, y);
  doc.text(fmtInvoiceAmount(taxAmount), valueX, y, { align: "right" });
  y += 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(data.labels.total, summaryX, y);
  const totalStr = data.currency
    ? `${data.currency === "EUR" ? "€" : data.currency}${fmtInvoiceAmount(data.totalAmount)}`
    : fmtInvoiceAmount(data.totalAmount);
  doc.text(totalStr, valueX, y, { align: "right" });
  y += 28;

  const footerStartY = y;

  if (data.notes.trim()) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(data.labels.notes, margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    y = drawMultiline(doc, data.notes.trim(), margin, y, contentWidth * 0.55, 12);
    y += 8;
  }

  const bankY = Math.max(footerStartY, y);
  let bankLineY = bankY;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(28, 25, 23);
  doc.text(data.labels.bankDetails, margin, bankLineY);
  bankLineY += 16;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);

  const bankRows: [string, string][] = [
    [data.labels.bankAccountName, data.bank.accountName],
    [data.labels.bankName, data.bank.bankName],
    [data.labels.bankAccountNo, data.bank.accountNo],
    [data.labels.bankIban, data.bank.iban],
    [data.labels.bankSwift, data.bank.swift],
    [data.labels.bankCurrency, data.bank.currency],
  ];

  for (const [label, value] of bankRows) {
    doc.text(`${label} ${value || ""}`, margin, bankLineY);
    bankLineY += 13;
  }

  return doc;
}

export function downloadInvoicePdf(data: InvoicePdfData, filename: string) {
  const doc = generateInvoicePdf(data);
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
