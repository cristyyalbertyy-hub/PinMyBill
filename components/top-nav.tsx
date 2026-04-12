"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useT } from "@/lib/i18n/context";

const links = [
  { href: "/", key: "nav.dashboard" },
  { href: "/despesas", key: "nav.entry" },
  { href: "/historico", key: "nav.history" },
  { href: "/exportar", key: "nav.exportPdf" },
  { href: "/categorias", key: "nav.categories" },
] as const;

export function TopNav() {
  const pathname = usePathname();
  const t = useT();
  const { data: session } = useSession();

  return (
    <div className="mb-6 hidden w-full flex-wrap items-center justify-between gap-3 md:mb-8 md:flex">
      <nav className="flex flex-wrap gap-2" aria-label={t("nav.aria")}>
        {links.map((link) => {
          const isActive = pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`min-h-11 rounded-full px-4 py-2.5 text-sm font-semibold touch-manipulation transition-all duration-200 ease-out active:scale-[0.98] ${
                isActive
                  ? "bg-pin-accent text-white shadow-md shadow-teal-600/25 ring-1 ring-teal-500/30 dark:bg-teal-700 dark:ring-teal-600"
                  : "bg-white/80 text-pin-muted shadow-sm ring-1 ring-stone-200/90 backdrop-blur-sm hover:-translate-y-0.5 hover:bg-pin-teal-soft hover:text-pin-ink hover:shadow-md motion-reduce:hover:translate-y-0 dark:bg-stone-900/60 dark:ring-stone-700 dark:hover:bg-stone-800 dark:hover:shadow-lg dark:hover:shadow-black/25"
              }`}
            >
              {t(link.key)}
            </Link>
          );
        })}
      </nav>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {session ? (
          <button
            type="button"
            onClick={() => void signOut({ callbackUrl: "/login" })}
            className="min-h-9 rounded-full px-3 py-1.5 text-xs font-semibold text-pin-muted ring-1 ring-stone-200/90 transition hover:bg-pin-teal-soft hover:text-pin-ink dark:ring-stone-600 dark:hover:bg-stone-800"
          >
            {t("auth.signOut")}
          </button>
        ) : null}
        <LanguageSwitcher variant="inline" />
      </div>
    </div>
  );
}
