"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/despesas", label: "Entrada" },
  { href: "/historico", label: "Historico" },
  { href: "/exportar", label: "Exportar PDF" },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <nav
      className="mb-6 hidden flex-wrap gap-2 md:mb-8 md:flex"
      aria-label="Navegacao secundaria"
    >
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
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
