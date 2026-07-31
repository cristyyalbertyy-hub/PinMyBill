import { parseExtraBanks, sanitizeExtraBanks } from "@/lib/bank-utils";
import type { ClientDetail } from "@/lib/profile-types";
import type { InvoiceBankDetails } from "@/lib/invoice-types";

type ClientRow = {
  id: string;
  name: string;
  projectName: string;
  startDate: Date | null;
  projectDirector: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  fromName: string;
  fromAddress: string;
  fromEmail: string;
  fromPhone: string;
  bankAccountName: string;
  bankName: string;
  bankAccountNo: string;
  bankIban: string;
  bankSwift: string;
  bankCurrency: string;
  extraBanks: unknown;
};

export function formatClient(row: ClientRow): ClientDetail {
  return {
    id: row.id,
    name: row.name,
    projectName: row.projectName,
    startDate: row.startDate ? row.startDate.toISOString().slice(0, 10) : null,
    projectDirector: row.projectDirector,
    address: row.address,
    email: row.email,
    phone: row.phone,
    fromName: row.fromName,
    fromAddress: row.fromAddress,
    fromEmail: row.fromEmail,
    fromPhone: row.fromPhone,
    bank: {
      accountName: row.bankAccountName,
      bankName: row.bankName,
      accountNo: row.bankAccountNo,
      iban: row.bankIban,
      swift: row.bankSwift,
      currency: row.bankCurrency,
    },
    extraBanks: parseExtraBanks(row.extraBanks),
  };
}

export type ClientWritePayload = {
  name?: string;
  projectName?: string;
  startDate?: string | null;
  projectDirector?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  fromName?: string;
  fromAddress?: string;
  fromEmail?: string;
  fromPhone?: string;
  bank?: InvoiceBankDetails;
  extraBanks?: InvoiceBankDetails[];
};

export function clientWriteData(body: ClientWritePayload): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name.trim();
  if (body.projectName !== undefined) data.projectName = body.projectName.trim();
  if (body.startDate !== undefined) {
    data.startDate = body.startDate ? new Date(body.startDate) : null;
  }
  if (body.projectDirector !== undefined) {
    data.projectDirector = body.projectDirector?.trim() || null;
  }
  if (body.address !== undefined) data.address = body.address?.trim() || null;
  if (body.email !== undefined) data.email = body.email?.trim() || null;
  if (body.phone !== undefined) data.phone = body.phone?.trim() || null;
  if (body.fromName !== undefined) data.fromName = body.fromName.trim();
  if (body.fromAddress !== undefined) data.fromAddress = body.fromAddress.trim();
  if (body.fromEmail !== undefined) data.fromEmail = body.fromEmail.trim();
  if (body.fromPhone !== undefined) data.fromPhone = body.fromPhone.trim();
  const bank = body.bank;
  if (bank) {
    data.bankAccountName = bank.accountName?.trim() ?? "";
    data.bankName = bank.bankName?.trim() ?? "";
    data.bankAccountNo = bank.accountNo?.trim() ?? "";
    data.bankIban = bank.iban?.trim() ?? "";
    data.bankSwift = bank.swift?.trim() ?? "";
    data.bankCurrency = bank.currency?.trim() ?? "";
  }
  if (body.extraBanks !== undefined) {
    data.extraBanks = sanitizeExtraBanks(body.extraBanks);
  }
  return data;
}
