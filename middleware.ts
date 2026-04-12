import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const STATIC_EXT = /\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$/i;

/** Em HTTPS o Auth.js usa o prefixo `__Secure-` no nome do cookie. */
function requestIsHttps(req: NextRequest): boolean {
  const forwarded = req.headers.get("x-forwarded-proto");
  if (forwarded === "https") return true;
  if (forwarded === "http") return false;
  return req.nextUrl.protocol === "https:";
}

function shouldSkipAuthMiddleware(path: string): boolean {
  return (
    path.startsWith("/api") ||
    path.startsWith("/_next") ||
    path.startsWith("/receipts") ||
    path === "/favicon.ico" ||
    path.startsWith("/icons/") ||
    path.startsWith("/brand/") ||
    STATIC_EXT.test(path)
  );
}

/** Lê o JWT da sessão; tenta o nome de cookie correto para HTTP vs HTTPS. */
async function readSessionToken(req: NextRequest, secret: string) {
  const https = requestIsHttps(req);
  let token = await getToken({ req, secret, secureCookie: https });
  if (!token) {
    token = await getToken({ req, secret, secureCookie: !https });
  }
  return token;
}

/** Middleware leve: sem `auth()` de @/auth (limite Edge). Ver nota no fim do ficheiro. */
export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  if (shouldSkipAuthMiddleware(path)) {
    return NextResponse.next();
  }

  const secret = process.env.AUTH_SECRET;
  const isPublic = path.startsWith("/login") || path.startsWith("/register");

  let isLoggedIn = false;
  if (secret) {
    try {
      const token = await readSessionToken(req, secret);
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

/**
 * Sem `export const config` / matcher: o middleware corre em todos os pedidos; o bypass no
 * início evita `_next`, API e estáticos. A raiz `/` fica protegida (regex no matcher falhava
 * no dev). Se o bundle Edge ultrapassar 1 MB na Vercel, volta um `matcher` mínimo ou corta deps.
 */
