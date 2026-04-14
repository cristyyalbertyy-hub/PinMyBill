"use client";

import type { Locale } from "@/lib/i18n/dictionaries";
import { useLocaleContext } from "@/lib/i18n/context";

const FLAGS: { locale: Locale; emoji: string; labelKey: string }[] = [
  { locale: "en", emoji: "🇬🇧", labelKey: "lang.en" },
  { locale: "fr", emoji: "🇫🇷", labelKey: "lang.fr" },
  { locale: "pt", emoji: "🇵🇹", labelKey: "lang.pt" },
];

const pillClass =
  "flex shrink-0 gap-1 rounded-full border border-stone-200/90 bg-white/95 p-1 shadow-md backdrop-blur-sm transition-shadow duration-200 focus-within:shadow-lg focus-within:ring-2 focus-within:ring-pin-accent/25 dark:border-stone-600 dark:bg-stone-900/95 dark:focus-within:ring-teal-400/20";

type LanguageSwitcherProps = {
  /** `floating`: fixed top-right (mobile only). `inline`: sits in the top nav row on desktop. */
  variant?: "floating" | "inline";
  className?: string;
};

export function LanguageSwitcher({
  variant = "floating",
  className = "",
}: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useLocaleContext();

  return (
    <div
      className={`pointer-events-auto z-[45] ${pillClass} ${
        variant === "floating"
          ? "fixed md:hidden"
          : "relative"
      } ${className}`.trim()}
      style={
        variant === "floating"
          ? {
              top: "max(0.75rem, env(safe-area-inset-top))",
              right: "max(0.75rem, env(safe-area-inset-right))",
            }
          : undefined
      }
      role="group"
      aria-label={t("i18n.pickLanguage")}
    >
      {FLAGS.map(({ locale: loc, emoji, labelKey }) => {
        const active = locale === loc;
        return (
          <button
            key={loc}
            type="button"
            onClick={() => setLocale(loc)}
            className={`flex h-9 w-9 items-center justify-center rounded-full text-lg leading-none transition touch-manipulation active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pin-accent/50 focus-visible:ring-offset-2 ${
              active
                ? "bg-pin-teal-soft ring-2 ring-pin-accent dark:bg-teal-950/80 dark:ring-teal-500"
                : "opacity-75 hover:opacity-100 hover:bg-stone-100 dark:hover:bg-stone-800"
            }`}
            title={t(labelKey)}
            aria-label={t(labelKey)}
            aria-pressed={active}
          >
            <span aria-hidden>{emoji}</span>
          </button>
        );
      })}
    </div>
  );
}
