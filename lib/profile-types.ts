import type { InvoiceBankDetails } from "@/lib/invoice-types";

export type UserProfileData = {
  fromName: string;
  fromAddress: string;
  fromEmail: string;
  fromPhone: string;
  projectDirector: string;
  activeClientId: string | null;
  bank: InvoiceBankDetails;
  extraBanks: InvoiceBankDetails[];
};

export type ClientDetail = {
  id: string;
  name: string;
  projectName: string;
  startDate: string | null;
  projectDirector: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  fromName: string;
  fromAddress: string;
  fromEmail: string;
  fromPhone: string;
  bank: InvoiceBankDetails;
  extraBanks: InvoiceBankDetails[];
};

export type TimesheetRow = {
  id: string;
  clientName: string;
  workDate: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  totalHours: number;
  rate: number;
  currency: string;
};

export const TIMESHEET_IMPORT_KEY = "pinmybill-timesheet-import";

export type TimesheetImportPayload = {
  clientName: string;
  currency: string;
  lineItems: Array<{
    description: string;
    duration: number;
    rate: number;
    amount: number;
  }>;
  total: number;
};
