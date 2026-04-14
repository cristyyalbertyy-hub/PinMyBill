"use client";

import Link from "next/link";
import Image from "next/image";
import { DashboardIllustration } from "@/components/dashboard-illustration";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LegacyDataBanner } from "@/components/legacy-data-banner";
import { useT } from "@/lib/i18n/context";
import { signOut, useSession } from "next-auth/react";

const shortcuts = [
  {
    href: "/despesas",
    emoji: "📷",
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
] as const;

export default function Home() {
  const t = useT();
  const { data: session } = useSession();

  return (
    <main className="pin-page px-4 pb-8 pt-4 md:p-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-3 flex items-center justify-end gap-2 md:mb-4">
          {session ? (
            <button
              type="button"
              onClick={() => void signOut({ callbackUrl: "/login" })}
              className="min-h-9 rounded-full px-3 py-1.5 text-xs font-semibold text-pin-muted ring-1 ring-stone-200/90 transition hover:bg-pin-teal-soft hover:text-pin-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pin-accent/40 focus-visible:ring-offset-2 dark:ring-stone-600 dark:hover:bg-stone-800"
            >
              {t("auth.signOut")}
            </button>
          ) : null}
          <LanguageSwitcher variant="inline" />
        </div>
        <header className="grid items-center gap-8 md:grid-cols-[1fr_min(42%,18rem)] md:gap-10">
          <div className="pin-dash-animate min-w-0">
            <div className="pin-dash-animate pin-dash-animate-d1 mb-3 flex items-center">
              <div className="relative aspect-[264/119] w-[150px] sm:w-[180px]">
                <Image
                  src="/brand/prologue.png"
                  alt="Prologue"
                  fill
                  priority
                  className="object-contain drop-shadow-sm"
                />
              </div>
            </div>
            <p className="pin-dash-animate pin-dash-animate-d1 mb-3 inline-flex items-center gap-2 rounded-full border border-teal-200/60 bg-pin-teal-soft/90 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-pin-accent shadow-sm transition-shadow duration-200 hover:shadow-md dark:border-teal-800/50 dark:bg-teal-950/40 dark:text-teal-300 dark:hover:shadow-teal-900/40">
              <span className="relative flex h-2 w-2" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pin-accent opacity-40 motion-reduce:animate-none dark:opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-pin-accent" />
              </span>
              {t("home.badge")}
            </p>
            <div className="pin-dash-animate pin-dash-animate-d1 flex flex-wrap items-baseline gap-3">
              <h1 className="pin-hero-title mb-0 text-balance text-4xl font-extrabold tracking-tight md:text-5xl lg:text-[3.25rem]">
                PinMyBill
              </h1>
              <span
                className="rounded-full border border-amber-400/70 bg-amber-100/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-950 shadow-sm dark:border-amber-600/60 dark:bg-amber-950/70 dark:text-amber-100"
                title={t("home.betaTitle")}
              >
                Beta
              </span>
            </div>
            <p className="pin-dash-animate pin-dash-animate-d2 pin-lead mt-5 max-w-xl text-pretty md:mt-6 md:text-[1.0625rem] md:leading-relaxed">
              {t("home.tagline")}
            </p>
          </div>

          <div className="pin-dash-animate pin-dash-animate-d2 flex justify-center md:justify-end">
            <div className="relative">
              <DashboardIllustration />
              <Link
                href="/despesas?quickPhoto=1"
                className="pin-quick-photo-pulse absolute right-2 top-3 inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-400 text-neutral-900 shadow-lg shadow-amber-500/35 ring-2 ring-white/80 transition hover:scale-105 hover:bg-amber-300 active:scale-95 motion-reduce:animate-none dark:ring-stone-900"
                aria-label={t("home.quickPhotoAria")}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-7 w-7"
                  aria-hidden
                >
                  <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                  <circle cx="12" cy="13" r="3" />
                </svg>
              </Link>
            </div>
          </div>
        </header>

        <section
          className="pin-dash-animate pin-dash-animate-d3 mt-8 grid grid-cols-3 gap-3 sm:mx-auto sm:max-w-xl md:mt-10 lg:max-w-none"
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

      </div>
    </main>
  );
}
