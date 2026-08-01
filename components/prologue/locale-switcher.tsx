"use client";

import { usePrologueLocale } from "@/lib/prologue-i18n/context";
import type { PrologueLocale } from "@/lib/prologue-i18n/dictionaries";

const LOCALES: PrologueLocale[] = ["en", "ar"];

export function PrologueLocaleSwitcher() {
  const { locale, setLocale, t } = usePrologueLocale();

  return (
    <div
      className="prologue-lang-switcher"
      role="group"
      aria-label={t("lang.switch")}
    >
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          className={`prologue-lang-btn${locale === code ? " prologue-lang-btn-active" : ""}`}
          aria-pressed={locale === code}
          onClick={() => setLocale(code)}
        >
          {t(`lang.${code}`)}
        </button>
      ))}
    </div>
  );
}
