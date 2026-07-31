"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useT } from "@/lib/i18n/context";
import { isAuthPublicPath } from "@/lib/auth-public-paths";

export function AppTopBar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const t = useT();
  const isHome = pathname === "/";

  if (isAuthPublicPath(pathname)) return null;

  return (
    <div
      className="pointer-events-none fixed z-[45] flex items-center gap-2"
      style={{
        top: "max(0.75rem, env(safe-area-inset-top))",
        right: "max(0.75rem, env(safe-area-inset-right))",
      }}
    >
      <div className="pointer-events-auto flex items-center gap-2">
        {!isHome ? (
          <Link
            href="/"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-200/90 bg-white/95 text-lg leading-none shadow-md backdrop-blur-sm transition hover:bg-pin-teal-soft active:scale-95 dark:border-stone-600 dark:bg-stone-900/95"
            aria-label={t("nav.homeAria")}
            title={t("nav.homeAria")}
          >
            <span aria-hidden>🏠</span>
          </Link>
        ) : session ? (
          <button
            type="button"
            onClick={() => void signOut({ callbackUrl: "/login" })}
            className="min-h-9 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-pin-muted shadow-md ring-1 ring-stone-200/90 backdrop-blur-sm transition hover:bg-pin-teal-soft hover:text-pin-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pin-accent/40 dark:bg-stone-900/95 dark:ring-stone-600 dark:hover:bg-stone-800"
          >
            {t("auth.signOut")}
          </button>
        ) : null}
        <LanguageSwitcher variant="inline" />
      </div>
    </div>
  );
}
