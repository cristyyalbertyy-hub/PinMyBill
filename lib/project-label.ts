import type { ClientDetail } from "@/lib/profile-types";

export function projectDisplayName(
  client: Pick<ClientDetail, "projectName" | "name"> | null | undefined,
): string {
  if (!client) return "";
  const projectName = client.projectName?.trim();
  if (projectName) return projectName;
  return client.name.trim();
}

export function invoiceProjectName(
  client: Pick<ClientDetail, "projectName" | "name" | "projectDirector"> | null | undefined,
): string {
  if (!client) return "";
  const projectName = client.projectName?.trim();
  if (projectName) return projectName;
  // Legacy fallback for records saved before projectName existed.
  const legacy = client.projectDirector?.trim();
  if (legacy) return legacy;
  return client.name.trim();
}
