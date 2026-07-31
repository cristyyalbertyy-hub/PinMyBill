import type { ClientDetail } from "@/lib/profile-types";

type ClientRow = {
  id: string;
  name: string;
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
};

export function formatClient(row: ClientRow): ClientDetail {
  return {
    id: row.id,
    name: row.name,
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
  };
}

export type ClientWritePayload = {
  name?: string;
  startDate?: string | null;
  projectDirector?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  fromName?: string;
  fromAddress?: string;
  fromEmail?: string;
  fromPhone?: string;
  bank?: {
    accountName?: string;
    bankName?: string;
    accountNo?: string;
    iban?: string;
    swift?: string;
    currency?: string;
  };
};

export function clientWriteData(body: ClientWritePayload): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name.trim();
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
    if (bank.accountName !== undefined) data.bankAccountName = bank.accountName.trim();
    if (bank.bankName !== undefined) data.bankName = bank.bankName.trim();
    if (bank.accountNo !== undefined) data.bankAccountNo = bank.accountNo.trim();
    if (bank.iban !== undefined) data.bankIban = bank.iban.trim();
    if (bank.swift !== undefined) data.bankSwift = bank.swift.trim();
    if (bank.currency !== undefined) data.bankCurrency = bank.currency.trim();
  }
  return data;
}
