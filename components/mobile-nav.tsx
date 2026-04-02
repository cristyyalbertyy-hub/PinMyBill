"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/lib/i18n/context";

const links = [
  { href: "/", key: "mobile.home", icon: "🏠" },
  { href: "/despesas", key: "mobile.receipts", icon: "📷" },
  { href: "/historico", key: "mobile.history", icon: "🗂️" },
  { href: "/exportar", key: "mobile.pdf", icon: "📄" },
  { href: "/categorias", key: "mobile.categories", icon: "🏷️" },
] as const;

export function MobileNav() {
  const pathname = usePathname();
  const t = useT();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-teal-200/40 bg-white/92 shadow-[0_-10px_40px_-10px_rgba(13,148,136,0.18),0_-1px_0_rgba(255,255,255,0.8)_inset] backdrop-blur-xl dark:border-stone-700 dark:bg-stone-950/92 dark:shadow-[0_-12px_40px_-8px_rgba(0,0,0,0.55)] md:hidden"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      aria-label={t("mobile.aria")}
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around gap-1 px-1 pt-2">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <li key={link.href} className="min-w-0 flex-1">
              <Link
                href={link.href}
                className={`flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1 text-[11px] font-semibold leading-tight transition-all duration-200 ease-out active:scale-[0.94] ${
                  isActive
                    ? "bg-pin-accent text-white shadow-md shadow-teal-700/25 ring-1 ring-white/15 dark:bg-teal-700 dark:text-white dark:shadow-lg dark:shadow-black/35 dark:ring-teal-500/30"
                    : "text-pin-muted hover:bg-pin-teal-soft active:bg-stone-200/80 dark:hover:bg-stone-800 dark:active:bg-stone-700/90"
                }`}
              >
                <span className="text-lg leading-none" aria-hidden>
                  {link.icon}
                </span>
                <span className="truncate">{t(link.key)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
