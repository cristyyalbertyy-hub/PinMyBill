import type { ClientDetail, UserProfileData } from "@/lib/profile-types";
import type { InvoiceBankDetails } from "@/lib/invoice-types";

const EMPTY_BANK: InvoiceBankDetails = {
  accountName: "",
  bankName: "",
  accountNo: "",
  iban: "",
  swift: "",
  currency: "",
};

function hasBankData(bank: InvoiceBankDetails) {
  return Boolean(bank.accountName || bank.iban || bank.bankName);
}

function hasBillerData(client: Pick<ClientDetail, "fromName" | "fromEmail">) {
  return Boolean(client.fromName || client.fromEmail);
}

/** Merge project-specific client data with global profile fallbacks. */
export function mergeProjectDefaults(
  client: ClientDetail | null | undefined,
  profile: UserProfileData | null | undefined,
): {
  fromName: string;
  fromAddress: string;
  fromEmail: string;
  fromPhone: string;
  projectDirector: string;
  bank: InvoiceBankDetails;
} {
  const profileBank = profile?.bank ?? EMPTY_BANK;
  const profileBiller = {
    fromName: profile?.fromName ?? "",
    fromAddress: profile?.fromAddress ?? "",
    fromEmail: profile?.fromEmail ?? "",
    fromPhone: profile?.fromPhone ?? "",
    projectDirector: profile?.projectDirector ?? profile?.fromName ?? "",
  };

  if (!client) {
    return { ...profileBiller, bank: { ...EMPTY_BANK, ...profileBank } };
  }

  return {
    fromName: hasBillerData(client) ? client.fromName : profileBiller.fromName,
    fromAddress: client.fromAddress || profileBiller.fromAddress,
    fromEmail: client.fromEmail || profileBiller.fromEmail,
    fromPhone: client.fromPhone || profileBiller.fromPhone,
    projectDirector:
      client.projectDirector || profileBiller.projectDirector || profileBiller.fromName,
    bank: hasBankData(client.bank) ? client.bank : { ...EMPTY_BANK, ...profileBank },
  };
}
