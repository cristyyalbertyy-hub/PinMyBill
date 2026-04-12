import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Em HTTPS o Auth.js usa o prefixo `__Secure-` no nome do cookie; `getToken` tem de espelhar isso. */
function requestIsHttps(req: NextRequest): boolean {
  const forwarded = req.headers.get("x-forwarded-proto");
  if (forwarded === "https") return true;
  if (forwarded === "http") return false;
  return req.nextUrl.protocol === "https:";
}

/**
 * Middleware leve para o limite de 1 MB da Vercel Hobby: não importar `auth()` de @/auth
 * (isso puxava Prisma + stack grande para a Edge Function).
 * A sessão JWT continua a ser validada com AUTH_SECRET; as APIs usam `auth()` em Node.
 */
export async function middleware(req: NextRequest) {
  const secret = process.env.AUTH_SECRET;
  const path = req.nextUrl.pathname;
  const isPublic = path.startsWith("/login") || path.startsWith("/register");

  let isLoggedIn = false;
  if (secret) {
    try {
      const token = await getToken({
        req,
        secret,
        secureCookie: requestIsHttps(req),
      });
      // Exige `sub` para não tratar payloads vazios / inválidos como sessão.
      isLoggedIn = Boolean(token?.sub);
    } catch {
      isLoggedIn = false;
    }
  }

  if (!isLoggedIn && !isPublic) {
    const login = new URL("/login", req.nextUrl.origin);
    login.searchParams.set("callbackUrl", path + req.nextUrl.search);
    return NextResponse.redirect(login);
  }

  if (isLoggedIn && (path === "/login" || path === "/register")) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // A raiz `/` por vezes não corresponde só ao padrão com `.*` — sem isto a home ficava sem middleware.
    "/",
    "/((?!api/|receipts/|_next/static|_next/image|favicon.ico|icons/|brand/|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
