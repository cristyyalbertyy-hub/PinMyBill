"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardIllustration } from "@/components/dashboard-illustration";
import { LegacyDataBanner } from "@/components/legacy-data-banner";
import { useT } from "@/lib/i18n/context";

const shortcuts = [
  {
    href: "/new",
    emoji: "✨",
    labelKey: "home.shortcutNew",
    delayClass: "pin-dash-animate-d0",
  },
  {
    href: "/despesas",
    emoji: "➕",
    labelKey: "home.shortcutReceipt",
    delayClass: "pin-dash-animate-d1",
  },
  {
    href: "/historico",
    emoji: "🗂️",
    labelKey: "home.shortcutHistory",
    delayClass: "pin-dash-animate-d2",
  },
  {
    href: "/exportar",
    emoji: "📄",
    labelKey: "home.shortcutExport",
    delayClass: "pin-dash-animate-d3",
  },
  {
    href: "/faturar",
    emoji: "🧾",
    labelKey: "home.shortcutBill",
    delayClass: "pin-dash-animate-d4",
  },
  {
    href: "/timesheet",
    emoji: "📅",
    labelKey: "home.shortcutTimesheet",
    delayClass: "pin-dash-animate-d5",
  },
] as const;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function Home() {
  const t = useT();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  async function handleInstallApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  return (
    <main className="pin-page pb-8 md:pb-10">
      <div className="mx-auto max-w-5xl">
        <header className="grid items-center gap-8 md:grid-cols-[1fr_min(42%,18rem)] md:gap-10">
          <div className="pin-dash-animate min-w-0">
            <p className="pin-dash-animate pin-dash-animate-d1 mb-5 inline-flex items-center gap-2 rounded-full border border-teal-200/60 bg-pin-teal-soft/90 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-pin-accent shadow-sm transition-shadow duration-200 hover:shadow-md dark:border-teal-800/50 dark:bg-teal-950/40 dark:text-teal-300 dark:hover:shadow-teal-900/40 md:mb-6">
              <span className="relative flex h-2 w-2" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pin-accent opacity-40 motion-reduce:animate-none dark:opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-pin-accent" />
              </span>
              {t("home.badge")}
            </p>
            <div className="pin-dash-animate pin-dash-animate-d1">
              <h1 className="pin-hero-title mb-0 text-balance text-4xl font-extrabold tracking-tight md:text-5xl lg:text-[3.25rem]">
                PinMyBill
              </h1>
            </div>
            <p className="pin-dash-animate pin-dash-animate-d2 pin-lead mt-5 max-w-xl text-pretty md:mt-6 md:text-[1.0625rem] md:leading-relaxed">
              {t("home.tagline")}
            </p>
          </div>

          <div className="pin-dash-animate pin-dash-animate-d2 flex justify-center md:justify-end">
            <DashboardIllustration />
          </div>
        </header>

        <section
          className="pin-dash-animate pin-dash-animate-d3 mt-8 grid grid-cols-2 gap-3 sm:mx-auto sm:max-w-2xl sm:grid-cols-3 md:mt-10 lg:max-w-none lg:grid-cols-6"
          aria-label={t("home.shortcutsAria")}
        >
          {shortcuts.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              aria-label={t(s.labelKey)}
              className={`pin-card pin-dash-shortcut pin-dash-animate ${s.delayClass} flex flex-col items-center justify-center gap-2 py-6 no-underline ring-0 transition-[box-shadow,transform] duration-200 hover:ring-2 hover:ring-pin-accent/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pin-accent/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] dark:focus-visible:ring-offset-[#0c0a09]`}
            >
              <span className="text-4xl leading-none" aria-hidden>
                {s.emoji}
              </span>
              <span className="text-center text-xs font-bold text-pin-ink">{t(s.labelKey)}</span>
            </Link>
          ))}
        </section>

        <LegacyDataBanner />
        {installPrompt ? (
          <div className="mt-4 flex justify-center md:justify-start">
            <button
              type="button"
              onClick={() => void handleInstallApp()}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-pin-accent px-4 py-2 text-sm font-semibold text-white shadow-md shadow-teal-700/25 ring-1 ring-teal-400/30 transition hover:brightness-105 active:scale-[0.98]"
            >
              <span aria-hidden>⬇</span>
              <span>{t("home.installApp")}</span>
            </button>
          </div>
        ) : null}

      </div>
    </main>
  );
}
