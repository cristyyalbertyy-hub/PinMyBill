export type InvoiceLineItem = {
  description: string;
  duration: number;
  rate: number;
  amount: number;
};

export type InvoiceBankDetails = {
  accountName: string;
  bankName: string;
  accountNo: string;
  iban: string;
  swift: string;
  currency: string;
};

export type InvoiceFormData = {
  billNumber: string;
  date: string;
  terms: string;
  projectName: string;
  toName: string;
  toAddress: string;
  toEmail: string;
  toPhone: string;
  fromName: string;
  fromAddress: string;
  fromEmail: string;
  fromPhone: string;
  currency: string;
  amount: number;
  taxPercent: number;
  totalAmount: number;
  notes: string;
  lineItems: InvoiceLineItem[];
  bank: InvoiceBankDetails;
};

export type InvoiceLabels = {
  documentTitle: string;
  billNumber: string;
  date: string;
  terms: string;
  projectName: string;
  billTo: string;
  from: string;
  email: string;
  phone: string;
  address: string;
  description: string;
  duration: string;
  rate: string;
  amount: string;
  subtotal: string;
  tax: string;
  taxZero: string;
  total: string;
  notes: string;
  bankDetails: string;
  bankAccountName: string;
  bankName: string;
  bankAccountNo: string;
  bankIban: string;
  bankSwift: string;
  bankCurrency: string;
  tableNum: string;
  itemDescription: string;
};

export const INVOICE_ORANGE: [number, number, number] = [249, 115, 22];

export function computeTaxAmount(amount: number, taxPercent: number) {
  return amount * (taxPercent / 100);
}

export function computeTotalAmount(amount: number, taxPercent: number) {
  return amount + computeTaxAmount(amount, taxPercent);
}

export function fmtInvoiceAmount(n: number) {
  if (!Number.isFinite(n)) return "0.00";
  return n.toFixed(3).replace(/(\.\d*[1-9])0+$|\.0+$/, "$1");
}
