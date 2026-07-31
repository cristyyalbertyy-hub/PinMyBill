"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "@/components/session-provider";
import { AppTopBar } from "@/components/app-top-bar";
import { ThemeProvider } from "@/components/theme-provider";
import { LocaleProvider } from "@/lib/i18n/context";
import { ProjectProvider } from "@/lib/project-context";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <SessionProvider>
        <LocaleProvider>
          <ProjectProvider>
            <AppTopBar />
            {children}
          </ProjectProvider>
        </LocaleProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
