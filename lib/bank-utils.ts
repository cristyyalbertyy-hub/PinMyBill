import type { InvoiceBankDetails } from "@/lib/invoice-types";

export const EMPTY_BANK: InvoiceBankDetails = {
  accountName: "",
  bankName: "",
  accountNo: "",
  iban: "",
  swift: "",
  currency: "",
};

export function emptyBank(): InvoiceBankDetails {
  return { ...EMPTY_BANK };
}

export function hasBankData(bank: InvoiceBankDetails): boolean {
  return Boolean(bank.accountName || bank.iban || bank.bankName || bank.accountNo);
}

export function normalizeBank(raw: Partial<InvoiceBankDetails> | null | undefined): InvoiceBankDetails {
  return {
    accountName: raw?.accountName?.trim() ?? "",
    bankName: raw?.bankName?.trim() ?? "",
    accountNo: raw?.accountNo?.trim() ?? "",
    iban: raw?.iban?.trim() ?? "",
    swift: raw?.swift?.trim() ?? "",
    currency: raw?.currency?.trim() ?? "",
  };
}

export function parseExtraBanks(raw: unknown): InvoiceBankDetails[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => normalizeBank(item as Partial<InvoiceBankDetails>))
    .filter(hasBankData);
}

export function listBankAccounts(
  primary: InvoiceBankDetails,
  extras: InvoiceBankDetails[],
): InvoiceBankDetails[] {
  const accounts: InvoiceBankDetails[] = [];
  if (hasBankData(primary)) accounts.push(normalizeBank(primary));
  for (const extra of extras) {
    const normalized = normalizeBank(extra);
    if (hasBankData(normalized)) accounts.push(normalized);
  }
  return accounts;
}

export function bankAccountLabel(bank: InvoiceBankDetails, index: number): string {
  if (bank.accountName.trim()) return bank.accountName.trim();
  if (bank.iban.trim()) return bank.iban.trim();
  if (bank.bankName.trim()) return bank.bankName.trim();
  return index === 0 ? "Primary" : `Account ${index + 1}`;
}

export function sanitizeExtraBanks(extras: InvoiceBankDetails[]): InvoiceBankDetails[] {
  return extras.map(normalizeBank).filter(hasBankData);
}
