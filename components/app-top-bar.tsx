"use client";

import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ProjectSwitcher } from "@/components/project-switcher";
import { useT } from "@/lib/i18n/context";
import { isAuthPublicPath } from "@/lib/auth-public-paths";
import { isMarketingPath } from "@/lib/marketing-paths";

export function AppTopBar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const t = useT();
  const isHome = pathname === "/";

  if (isAuthPublicPath(pathname) || isMarketingPath(pathname)) return null;

  return (
    <>
      <div
        className="pointer-events-none fixed z-[45]"
        style={{
          top: "max(0.75rem, env(safe-area-inset-top))",
          left: "max(0.75rem, env(safe-area-inset-left))",
        }}
      >
        <ProjectSwitcher />
      </div>
      <div
        className="pointer-events-none fixed z-[45] flex items-center gap-2"
        style={{
          top: "max(0.75rem, env(safe-area-inset-top))",
          right: "max(0.75rem, env(safe-area-inset-right))",
        }}
      >
        <div className="pointer-events-auto flex items-center gap-2">
          {isHome && session ? (
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
    </>
  );
}
