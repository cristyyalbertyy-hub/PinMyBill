"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Inicio", icon: "🏠" },
  { href: "/despesas", label: "Recibos", icon: "📷" },
  { href: "/historico", label: "Historico", icon: "🗂️" },
  { href: "/categorias", label: "Tipos", icon: "🏷️" },
  { href: "/exportar", label: "PDF", icon: "📄" },
] as const;

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-teal-200/40 bg-white/90 shadow-[0_-8px_32px_-8px_rgba(13,148,136,0.12)] backdrop-blur-lg dark:border-stone-700 dark:bg-stone-950/90 dark:shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.4)] md:hidden"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      aria-label="Navegacao principal"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around gap-1 px-1 pt-2">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <li key={link.href} className="min-w-0 flex-1">
              <Link
                href={link.href}
                className={`flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1 text-[11px] font-semibold leading-tight transition active:scale-[0.97] ${
                  isActive
                    ? "bg-pin-accent text-white shadow-md shadow-teal-700/20 dark:bg-teal-700 dark:text-white dark:shadow-black/30"
                    : "text-pin-muted hover:bg-pin-teal-soft dark:hover:bg-stone-800"
                }`}
              >
                <span className="text-lg leading-none" aria-hidden>
                  {link.icon}
                </span>
                <span className="truncate">{link.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
