"use client";

import type { ReactNode } from "react";
import { LocaleProvider } from "@/lib/i18n/context";
import { LanguageSwitcher } from "@/components/language-switcher";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LocaleProvider>
      <LanguageSwitcher />
      {children}
    </LocaleProvider>
  );
}
