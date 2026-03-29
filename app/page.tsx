import Link from "next/link";
import Image from "next/image";
import { DashboardIllustration } from "@/components/dashboard-illustration";

const shortcuts = [
  {
    href: "/despesas",
    emoji: "📷",
    label: "Recibo",
    delayClass: "pin-dash-animate-d1",
  },
  {
    href: "/historico",
    emoji: "🗂️",
    label: "Histórico",
    delayClass: "pin-dash-animate-d2",
  },
  {
    href: "/exportar",
    emoji: "📄",
    label: "Exportar",
    delayClass: "pin-dash-animate-d3",
  },
] as const;

export default function Home() {
  return (
    <main className="pin-page px-4 pb-8 pt-4 md:p-10">
      <div className="mx-auto max-w-5xl">
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
              Recibos sem stress
            </p>
            <div className="pin-dash-animate pin-dash-animate-d1 flex flex-wrap items-baseline gap-3">
              <h1 className="pin-hero-title mb-0 text-4xl font-extrabold tracking-tight md:text-5xl lg:text-[3.25rem]">
                PinMyBill
              </h1>
              <span
                className="rounded-full border border-amber-400/70 bg-amber-100/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-950 shadow-sm dark:border-amber-600/60 dark:bg-amber-950/70 dark:text-amber-100"
                title="Versao Beta — em testes com utilizadores reais"
              >
                Beta
              </span>
            </div>
          </div>

          <div className="pin-dash-animate pin-dash-animate-d2 flex justify-center md:justify-end">
            <div className="relative">
              <DashboardIllustration />
              <Link
                href="/despesas?quickPhoto=1"
                className="pin-quick-photo-pulse absolute right-2 top-3 inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-400 text-neutral-900 shadow-lg shadow-amber-500/35 ring-2 ring-white/80 transition hover:scale-105 hover:bg-amber-300 active:scale-95 motion-reduce:animate-none dark:ring-stone-900"
                aria-label="Tirar foto do recibo"
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
          aria-label="Atalhos"
        >
          {shortcuts.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              aria-label={s.label}
              className={`pin-card pin-dash-shortcut pin-dash-animate ${s.delayClass} flex flex-col items-center justify-center gap-2 py-6 no-underline`}
            >
              <span className="text-4xl leading-none" aria-hidden>
                {s.emoji}
              </span>
              <span className="text-center text-xs font-bold text-pin-ink">{s.label}</span>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
