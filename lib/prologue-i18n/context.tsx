"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  PROLOGUE_DEFAULT_LOCALE,
  PROLOGUE_STORAGE_KEY,
  prologueDictionaries,
  type PrologueLocale,
} from "./dictionaries";

type TParams = Record<string, string | number>;

type PrologueLocaleContextValue = {
  locale: PrologueLocale;
  setLocale: (locale: PrologueLocale) => void;
  t: (key: string, params?: TParams) => string;
};

const PrologueLocaleContext = createContext<PrologueLocaleContextValue | null>(null);

function readStoredLocale(): PrologueLocale {
  if (typeof window === "undefined") return PROLOGUE_DEFAULT_LOCALE;
  try {
    const raw = window.localStorage.getItem(PROLOGUE_STORAGE_KEY);
    if (raw === "en" || raw === "ar") return raw;
  } catch {
    /* ignore */
  }
  return PROLOGUE_DEFAULT_LOCALE;
}

export function PrologueLocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<PrologueLocale>(PROLOGUE_DEFAULT_LOCALE);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLocaleState(readStoredLocale());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    try {
      window.localStorage.setItem(PROLOGUE_STORAGE_KEY, locale);
    } catch {
      /* ignore */
    }
  }, [locale, mounted]);

  const setLocale = useCallback((next: PrologueLocale) => {
    setLocaleState(next);
  }, []);

  const t = useCallback(
    (key: string, params?: TParams) => {
      const dict = prologueDictionaries[locale];
      let s = dict[key] ?? prologueDictionaries.en[key] ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          s = s.split(`{{${k}}}`).join(String(v));
        }
      }
      return s;
    },
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return (
    <PrologueLocaleContext.Provider value={value}>{children}</PrologueLocaleContext.Provider>
  );
}

export function usePrologueLocale() {
  const ctx = useContext(PrologueLocaleContext);
  if (!ctx) {
    throw new Error("usePrologueLocale must be used within PrologueLocaleProvider");
  }
  return ctx;
}

export function usePrologueT(): (key: string, params?: TParams) => string {
  return usePrologueLocale().t;
}
