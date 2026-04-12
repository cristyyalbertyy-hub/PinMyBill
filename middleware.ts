import { auth } from "@/auth";
import { NextResponse } from "next/server";

/** Só páginas: as rotas /api/* devolvem 401 no handler, não redirecionam para HTML. */
export default auth((req) => {
  const path = req.nextUrl.pathname;
  const isLoggedIn = Boolean(req.auth);

  const isPublic = path.startsWith("/login") || path.startsWith("/register");

  if (!isLoggedIn && !isPublic) {
    const login = new URL("/login", req.nextUrl.origin);
    login.searchParams.set("callbackUrl", path + req.nextUrl.search);
    return NextResponse.redirect(login);
  }

  if (isLoggedIn && (path === "/login" || path === "/register")) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api/|receipts/|_next/static|_next/image|favicon.ico|icons/|brand/|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
