/**
 * Com `signIn(..., { redirect: false })`, o cliente do next-auth faz `new URL(data.url)`.
 * O servidor devolve `callbackUrl` tal como foi enviado; se for relativo (`/` ou `/foo`),
 * `new URL` rebenta no browser e o login/registo falha em silêncio ou com erro genérico.
 */
export function sameOriginCallbackUrl(pathOrUrl: string): string {
  if (typeof window === "undefined") {
    return pathOrUrl.startsWith("/") ? pathOrUrl : "/";
  }
  const base = window.location.origin;
  const trimmed = pathOrUrl.trim() || "/";
  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      const u = new URL(trimmed);
      if (u.origin !== base) return `${base}/`;
      return u.href;
    }
    if (trimmed.startsWith("//")) return `${base}/`;
    const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return `${base}${path}`;
  } catch {
    return `${base}/`;
  }
}
