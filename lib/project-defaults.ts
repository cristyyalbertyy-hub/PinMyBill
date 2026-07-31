import type { ClientDetail, UserProfileData } from "@/lib/profile-types";
import { EMPTY_BANK, hasBankData, parseExtraBanks } from "@/lib/bank-utils";
import type { InvoiceBankDetails } from "@/lib/invoice-types";

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
  extraBanks: InvoiceBankDetails[];
} {
  const profileBank = profile?.bank ?? EMPTY_BANK;
  const profileExtras = profile?.extraBanks ?? [];
  const profileBiller = {
    fromName: profile?.fromName ?? "",
    fromAddress: profile?.fromAddress ?? "",
    fromEmail: profile?.fromEmail ?? "",
    fromPhone: profile?.fromPhone ?? "",
    projectDirector: profile?.projectDirector ?? profile?.fromName ?? "",
  };

  if (!client) {
    return {
      ...profileBiller,
      bank: { ...EMPTY_BANK, ...profileBank },
      extraBanks: profileExtras,
    };
  }

  const clientExtras = client.extraBanks?.length ? client.extraBanks : profileExtras;

  return {
    fromName: hasBillerData(client) ? client.fromName : profileBiller.fromName,
    fromAddress: client.fromAddress || profileBiller.fromAddress,
    fromEmail: client.fromEmail || profileBiller.fromEmail,
    fromPhone: client.fromPhone || profileBiller.fromPhone,
    projectDirector:
      client.projectDirector || profileBiller.projectDirector || profileBiller.fromName,
    bank: hasBankData(client.bank) ? client.bank : { ...EMPTY_BANK, ...profileBank },
    extraBanks: clientExtras,
  };
}

export { parseExtraBanks };
