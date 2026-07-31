"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "@/components/session-provider";
import { AppTopBar } from "@/components/app-top-bar";
import { ThemeProvider } from "@/components/theme-provider";
import { LocaleProvider } from "@/lib/i18n/context";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <SessionProvider>
        <LocaleProvider>
          <AppTopBar />
          {children}
        </LocaleProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
