const MARKETING_PATHS = new Set(["/prologue-apps"]);

export function isMarketingPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return MARKETING_PATHS.has(pathname);
}
