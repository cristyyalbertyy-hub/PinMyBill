export type InvoiceLineItem = {
  description: string;
  amount: number;
  date?: string;
};

export type InvoiceFormData = {
  billNumber: string;
  date: string;
  toName: string;
  toEmail: string;
  toPhone: string;
  fromName: string;
  fromEmail: string;
  fromPhone: string;
  currency: string;
  amount: number;
  taxPercent: number;
  totalAmount: number;
  notes: string;
  lineItems: InvoiceLineItem[];
};

export type InvoiceLabels = {
  documentTitle: string;
  billNumber: string;
  date: string;
  billTo: string;
  from: string;
  email: string;
  phone: string;
  description: string;
  amount: string;
  subtotal: string;
  tax: string;
  total: string;
  notes: string;
  lineItems: string;
  tableDate: string;
};

export function computeTaxAmount(amount: number, taxPercent: number) {
  return amount * (taxPercent / 100);
}

export function computeTotalAmount(amount: number, taxPercent: number) {
  return amount + computeTaxAmount(amount, taxPercent);
}
