import jsPDF from "jspdf";

export type InvoicePdfData = {
  billNumber: string;
  date: string;
  toName: string;
  fromName: string;
  fromAddress: string;
  fromPhone: string;
  currency: string;
  amount: number;
  taxPercent: number;
  totalAmount: number;
  notes?: string;
  lineItems?: { description: string; amount: number; date?: string }[];
  labels: {
    documentTitle: string;
    billNumber: string;
    date: string;
    to: string;
    from: string;
    address: string;
    phone: string;
    description: string;
    amount: string;
    subtotal: string;
    tax: string;
    total: string;
    notes: string;
    lineItems: string;
  };
};

function fmtAmount(n: number) {
  if (!Number.isFinite(n)) return "0.00";
  return n.toFixed(2);
}

export function generateInvoicePdf(data: InvoicePdfData): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const margin = 48;
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 48;

  doc.setFontSize(20);
  doc.setTextColor(13, 148, 136);
  doc.text(data.labels.documentTitle, margin, y);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`${data.labels.billNumber}: ${data.billNumber}`, pageWidth - margin, y, { align: "right" });
  y += 16;
  doc.text(`${data.labels.date}: ${data.date}`, pageWidth - margin, y, { align: "right" });
  y += 28;

  doc.setTextColor(28, 25, 23);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(data.labels.from, margin, y);
  doc.text(data.labels.to, pageWidth / 2 + 12, y);
  y += 16;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const fromLines = [data.fromName, data.fromAddress, data.fromPhone].filter(Boolean);
  const toLines = [data.toName].filter(Boolean);
  const colMid = pageWidth / 2 + 12;
  const maxLines = Math.max(fromLines.length, toLines.length, 1);

  for (let i = 0; i < maxLines; i++) {
    if (fromLines[i]) doc.text(fromLines[i], margin, y);
    if (toLines[i]) doc.text(toLines[i], colMid, y);
    y += 14;
  }

  y += 16;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 24;

  if (data.lineItems && data.lineItems.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(data.labels.lineItems, margin, y);
    y += 18;

    doc.setFont("helvetica", "normal");
    for (const item of data.lineItems) {
      const desc = item.date ? `${item.description} (${item.date})` : item.description;
      doc.text(desc.slice(0, 72), margin, y);
      doc.text(`${data.currency} ${fmtAmount(item.amount)}`, pageWidth - margin, y, { align: "right" });
      y += 14;
      if (y > 680) {
        doc.addPage();
        y = 48;
      }
    }
    y += 12;
    doc.line(margin, y, pageWidth - margin, y);
    y += 20;
  }

  const taxAmount = data.amount * (data.taxPercent / 100);
  const summaryX = pageWidth - margin - 160;

  doc.setFontSize(10);
  doc.text(data.labels.subtotal, summaryX, y);
  doc.text(`${data.currency} ${fmtAmount(data.amount)}`, pageWidth - margin, y, { align: "right" });
  y += 16;

  doc.text(`${data.labels.tax} (${fmtAmount(data.taxPercent)}%)`, summaryX, y);
  doc.text(`${data.currency} ${fmtAmount(taxAmount)}`, pageWidth - margin, y, { align: "right" });
  y += 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(data.labels.total, summaryX, y);
  doc.text(`${data.currency} ${fmtAmount(data.totalAmount)}`, pageWidth - margin, y, { align: "right" });
  y += 28;

  if (data.notes?.trim()) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(data.labels.notes, margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(data.notes.trim(), pageWidth - margin * 2);
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
