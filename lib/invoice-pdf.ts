import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { InvoiceFormData, InvoiceLabels } from "@/lib/invoice-types";
import { computeTaxAmount } from "@/lib/invoice-types";

export type InvoicePdfData = InvoiceFormData & { labels: InvoiceLabels };

function fmtAmount(n: number) {
  if (!Number.isFinite(n)) return "0.00";
  return n.toFixed(2);
}

export function generateInvoicePdf(data: InvoicePdfData): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const margin = 48;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - margin * 2;
  const accent: [number, number, number] = [13, 148, 136];

  doc.setFillColor(...accent);
  doc.rect(0, 0, pageWidth, 6, "F");

  let y = 42;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...accent);
  doc.text(data.labels.documentTitle, pageWidth - margin, y, { align: "right" });

  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.setFont("helvetica", "normal");
  doc.text(`${data.labels.billNumber}: ${data.billNumber}`, pageWidth - margin, y + 18, {
    align: "right",
  });
  doc.text(`${data.labels.date}: ${data.date}`, pageWidth - margin, y + 32, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(28, 25, 23);
  doc.text(data.fromName || "—", margin, y);

  y += 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  if (data.fromEmail) {
    doc.text(`${data.labels.email}: ${data.fromEmail}`, margin, y);
    y += 14;
  }
  if (data.fromPhone) {
    doc.text(`${data.labels.phone}: ${data.fromPhone}`, margin, y);
    y += 14;
  }

  y = Math.max(y + 10, 118);

  doc.setFillColor(245, 245, 244);
  doc.roundedRect(margin, y, contentWidth, 62, 4, 4, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...accent);
  doc.text(data.labels.billTo.toUpperCase(), margin + 14, y + 18);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(28, 25, 23);
  doc.text(data.toName || "—", margin + 14, y + 36);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  let toDetailY = y + 50;
  if (data.toEmail) {
    doc.text(data.toEmail, margin + 14, toDetailY);
    toDetailY += 12;
  }
  if (data.toPhone) {
    doc.text(data.toPhone, margin + 14, toDetailY);
  }

  y += 78;

  const tableBody =
    data.lineItems.length > 0
      ? data.lineItems.map((item) => [
          item.description,
          item.date ?? "",
          `${data.currency} ${fmtAmount(item.amount)}`,
        ])
      : [[data.labels.description, data.date, `${data.currency} ${fmtAmount(data.amount)}`]];

  autoTable(doc, {
    startY: y,
    head: [[data.labels.description, data.labels.tableDate, data.labels.amount]],
    body: tableBody,
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 6, textColor: [28, 25, 23] },
    headStyles: {
      fillColor: accent,
      textColor: 255,
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.52 },
      1: { cellWidth: contentWidth * 0.22 },
      2: { cellWidth: contentWidth * 0.26, halign: "right" },
    },
    theme: "grid",
  });

  type DocWithTable = typeof doc & { lastAutoTable?: { finalY: number } };
  y = ((doc as DocWithTable).lastAutoTable?.finalY ?? y + 40) + 24;

  const taxAmount = computeTaxAmount(data.amount, data.taxPercent);
  const summaryX = pageWidth - margin - 170;
  const valueX = pageWidth - margin;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(data.labels.subtotal, summaryX, y);
  doc.text(`${data.currency} ${fmtAmount(data.amount)}`, valueX, y, { align: "right" });
  y += 16;

  doc.text(`${data.labels.tax} (${fmtAmount(data.taxPercent)}%)`, summaryX, y);
  doc.text(`${data.currency} ${fmtAmount(taxAmount)}`, valueX, y, { align: "right" });
  y += 22;

  doc.setFillColor(...accent);
  doc.roundedRect(summaryX - 8, y - 12, 178, 28, 4, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text(data.labels.total, summaryX, y + 4);
  doc.text(`${data.currency} ${fmtAmount(data.totalAmount)}`, valueX - 8, y + 4, {
    align: "right",
  });
  y += 36;

  if (data.notes.trim()) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(28, 25, 23);
    doc.text(data.labels.notes, margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    const lines = doc.splitTextToSize(data.notes.trim(), contentWidth);
    doc.text(lines, margin, y);
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
