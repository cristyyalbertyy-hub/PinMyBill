"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/despesas", label: "Entrada" },
  { href: "/historico", label: "Historico" },
  { href: "/categorias", label: "Categorias" },
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
            className={`min-h-11 rounded-full px-4 py-2.5 text-sm font-semibold transition touch-manipulation ${
              isActive
                ? "bg-pin-accent text-white shadow-md shadow-teal-600/25 ring-1 ring-teal-500/30 dark:bg-teal-700 dark:ring-teal-600"
                : "bg-white/80 text-pin-muted ring-1 ring-stone-200/90 backdrop-blur-sm hover:bg-pin-teal-soft hover:text-pin-ink dark:bg-stone-900/60 dark:ring-stone-700 dark:hover:bg-stone-800"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
