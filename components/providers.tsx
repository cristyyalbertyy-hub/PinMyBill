"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "@/components/session-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LocaleProvider } from "@/lib/i18n/context";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <LocaleProvider>
        <LanguageSwitcher />
        {children}
      </LocaleProvider>
    </SessionProvider>
  );
}
