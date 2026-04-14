/** Rotas públicas de autenticação: tema visual fixo (noite), sem usar preferências guardadas no browser. */
const AUTH_PUBLIC_PATHS = new Set(["/login", "/register"]);

export function isAuthPublicPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return AUTH_PUBLIC_PATHS.has(pathname);
}
