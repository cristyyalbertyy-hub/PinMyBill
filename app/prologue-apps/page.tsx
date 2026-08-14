"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { StarfieldCanvas } from "@/components/prologue/starfield-canvas";
import { PrologueLocaleSwitcher } from "@/components/prologue/locale-switcher";
import { usePrologueT } from "@/lib/prologue-i18n/context";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const COMING_SOON_IDS = [
  { id: "events", emoji: "🎬" },
  { id: "learning", emoji: "🎓" },
  { id: "mystery", emoji: "✨" },
] as const;

function cardGlow(event: React.MouseEvent<HTMLElement>) {
  const el = event.currentTarget;
  const rect = el.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.height) * 100;
  el.style.setProperty("--mx", `${x}%`);
  el.style.setProperty("--my", `${y}%`);
}

export default function PrologueAppsPage() {
  const t = usePrologueT();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = "dark";
  }, []);

  useEffect(() => {
    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  async function handleInstall() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  function onHeroMove(event: React.MouseEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: x * 12, y: y * -8 });
  }

  const pinTags = ["receipts", "timesheet", "invoice", "i18n"] as const;
  const dotTags = ["puzzle", "focus", "unwind"] as const;

  return (
    <div className="prologue-root relative overflow-x-hidden pb-16">
      <StarfieldCanvas />

      <div className="relative z-10 mx-auto max-w-5xl px-5 pt-[max(2rem,env(safe-area-inset-top))]">
        <header className="prologue-reveal mb-16 flex flex-wrap items-center justify-between gap-4">
          <nav className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-widest text-stone-500">
            <span className="text-stone-600">Prologue</span>
            <span aria-hidden>·</span>
            <span className="text-orange-400">Apps</span>
            <span aria-hidden>·</span>
            <span className="opacity-50">Events</span>
            <span aria-hidden>·</span>
            <span className="opacity-50">Learning</span>
          </nav>
          <div className="flex flex-wrap items-center gap-3">
            <PrologueLocaleSwitcher />
            <span className="prologue-apps-badge">
              <span className="prologue-apps-badge-dot" aria-hidden />
              {t("nav.badge")}
            </span>
          </div>
        </header>

        <section
          className="prologue-reveal prologue-reveal-d1 relative mb-20 text-center"
          onMouseMove={onHeroMove}
          onMouseLeave={() => setTilt({ x: 0, y: 0 })}
        >
          <div className="prologue-logo-wrap mx-auto mb-8 w-[min(100%,22rem)]">
            <div
              className="prologue-logo-composite"
              style={{
                transform: `perspective(800px) rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)`,
              }}
            >
              <div className="prologue-logo-orb" aria-hidden />
              <Image
                src="/brand/prologue-wordmark.png"
                alt="Prologue"
                width={1024}
                height={415}
                priority
                className="prologue-logo-text h-auto w-full"
              />
              <span className="prologue-logo-period" aria-hidden />
            </div>
          </div>
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-orange-400/90">
            {t("hero.appsLabel")}
          </p>
          <h1 className="mx-auto max-w-2xl text-balance text-2xl font-extrabold leading-tight text-white md:text-4xl">
            {t("hero.title")}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-base text-stone-400 md:text-lg">
            {t("hero.subtitle", { apps: t("hero.appsLabel") })}
          </p>
          <p className="prologue-counter mt-8 text-3xl font-black md:text-5xl">
            2 <span className="text-xl font-bold text-stone-500 md:text-2xl">{t("hero.available")}</span>{" "}
            · ∞{" "}
            <span className="text-xl font-bold text-stone-500 md:text-2xl">{t("hero.incoming")}</span>
          </p>
        </section>

        <section className="prologue-reveal prologue-reveal-d2 mb-6">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
            {t("section.live")}
          </h2>
          <article className="prologue-card prologue-card-live" onMouseMove={cardGlow}>
            <div className="prologue-card-inner relative grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center md:p-8">
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-orange-500/20 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-orange-300">
                    Live
                  </span>
                  <span className="text-2xl" aria-hidden>
                    📌
                  </span>
                </div>
                <h3 className="text-2xl font-extrabold text-white">PinMyBill</h3>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-stone-400 md:text-base">
                  {t("pinmybill.desc")}
                </p>
                <ul className="mt-4 flex flex-wrap gap-2 text-xs text-stone-500">
                  {pinTags.map((tag) => (
                    <li key={tag} className="rounded-lg bg-white/5 px-2 py-1">
                      {t(`pinmybill.tag.${tag}`)}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
                <Link href="/login" className="prologue-btn-primary">
                  {t("pinmybill.open")}
                </Link>
                {installPrompt ? (
                  <button
                    type="button"
                    onClick={() => void handleInstall()}
                    className="prologue-btn-ghost"
                  >
                    {t("pinmybill.install")}
                  </button>
                ) : (
                  <Link href="/" className="prologue-btn-ghost">
                    {t("pinmybill.dashboard")}
                  </Link>
                )}
              </div>
            </div>
          </article>
          <article className="prologue-card prologue-card-live mt-4" onMouseMove={cardGlow}>
            <div className="prologue-card-inner relative grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center md:p-8">
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-orange-500/20 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-orange-300">
                    Live
                  </span>
                  <span className="text-2xl" aria-hidden>
                    🧩
                  </span>
                </div>
                <h3 className="text-2xl font-extrabold text-white">Dot Connect Five</h3>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-stone-400 md:text-base">
                  {t("dotfive.desc")}
                </p>
                <ul className="mt-4 flex flex-wrap gap-2 text-xs text-stone-500">
                  {dotTags.map((tag) => (
                    <li key={tag} className="rounded-lg bg-white/5 px-2 py-1">
                      {t(`dotfive.tag.${tag}`)}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
                <a href="/dot-connect-five" className="prologue-btn-primary">
                  {t("dotfive.play")}
                </a>
              </div>
            </div>
          </article>
        </section>

        <section className="prologue-reveal prologue-reveal-d3">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
            {t("section.soon")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {COMING_SOON_IDS.map((app) => (
              <article
                key={app.id}
                className="prologue-card prologue-card-soon"
                onMouseMove={cardGlow}
              >
                <div className="prologue-card-inner p-5">
                  <span className="text-2xl" aria-hidden>
                    {app.emoji}
                  </span>
                  <h3 className="mt-3 font-bold text-stone-200">{t(`soon.${app.id}.name`)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-500">
                    {t(`soon.${app.id}.hint`)}
                  </p>
                  <p className="mt-4 text-xs font-bold uppercase tracking-wider text-orange-400/70">
                    {t("soon.badge")}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <footer className="prologue-reveal prologue-reveal-d4 mt-20 border-t border-white/5 pt-8 text-center text-sm text-stone-600">
          <p>{t("footer.line1")}</p>
          <p className="mt-2 text-xs text-stone-700">{t("footer.line2")}</p>
        </footer>
      </div>
    </div>
  );
}
