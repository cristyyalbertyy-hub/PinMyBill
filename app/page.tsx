import Link from "next/link";
import Image from "next/image";
import { DashboardIllustration } from "@/components/dashboard-illustration";
import { TopNav } from "@/components/top-nav";

const shortcuts = [
  {
    href: "/despesas",
    emoji: "📷",
    title: "Novo recibo",
    subtitle: "Foto, tipo e categoria",
    delayClass: "pin-dash-animate-d1",
  },
  {
    href: "/historico",
    emoji: "🗂️",
    title: "Historico",
    subtitle: "Ver e modificar",
    delayClass: "pin-dash-animate-d2",
  },
  {
    href: "/categorias",
    emoji: "🏷️",
    title: "Categorias",
    subtitle: "Tipos e clientes",
    delayClass: "pin-dash-animate-d3",
  },
  {
    href: "/exportar",
    emoji: "📄",
    title: "Exportar",
    subtitle: "CSV ou PDF",
    delayClass: "pin-dash-animate-d4",
  },
] as const;

const flowSteps = [
  {
    title: "Entrada (Recibos)",
    body:
      "Tira foto do recibo, escolhe o tipo (Empresa, Pessoal ou Cliente), a categoria (ou \"Outra...\" para criar uma nova), preenche valor e moeda. Ao guardar, o recibo entra diretamente no historico.",
  },
  {
    title: "Historico",
    body: "Consultas todos os recibos; se algo estiver errado, abres Modificar e ajustas.",
  },
  {
    title: "Categorias",
    body: "Geres subcategorias por tipo e os nomes dos clientes (para despesas de cliente e para exportar).",
  },
  {
    title: "Exportar",
    body: "Escolhes o modo (periodo empresa ou pessoal, por cliente, etc.), defines as datas do intervalo, removes linhas da lista se nao quiseres inclui-las e geras CSV (Excel) ou PDF.",
  },
] as const;

export default function Home() {
  return (
    <main className="pin-page px-4 pb-8 pt-4 md:p-10">
      <div className="mx-auto max-w-5xl">
        <header className="grid items-center gap-8 md:grid-cols-[1fr_min(42%,18rem)] md:gap-10">
          <div className="pin-dash-animate min-w-0">
            <div className="pin-dash-animate pin-dash-animate-d1 mb-3 flex items-center">
              <div className="relative w-[150px] sm:w-[180px] aspect-[264/119]">
                <Image
                  src="/brand/prologue.png"
                  alt="Prologue"
                  fill
                  priority
                  className="object-contain drop-shadow-sm"
                />
              </div>
            </div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-teal-200/60 bg-pin-teal-soft/90 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-pin-accent shadow-sm dark:border-teal-800/50 dark:bg-teal-950/40 dark:text-teal-300">
              <span className="relative flex h-2 w-2" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pin-accent opacity-40 motion-reduce:animate-none dark:opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-pin-accent" />
              </span>
              Recibos sem stress
            </p>
            <h1 className="pin-hero-title mb-3 text-4xl font-extrabold tracking-tight md:text-5xl lg:text-[3.25rem]">
              PinMyBill
            </h1>
            <p className="pin-lead text-[1.06rem] leading-relaxed">
              Captura, classifica e exporta despesas — num fluxo claro e rapido, feito para o dia a dia da
              empresa e da vida pessoal.
            </p>
          </div>

          <div className="pin-dash-animate pin-dash-animate-d2 flex justify-center md:justify-end">
            <DashboardIllustration />
          </div>
        </header>

        <div className="pin-dash-animate pin-dash-animate-d3 mt-8 md:mt-10">
          <TopNav />
        </div>

        <section
          className="pin-dash-animate pin-dash-animate-d3 mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          aria-label="Atalhos"
        >
          {shortcuts.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className={`pin-card pin-dash-shortcut pin-dash-animate ${s.delayClass} flex flex-col gap-1 p-4 no-underline`}
            >
              <span className="text-2xl" aria-hidden>
                {s.emoji}
              </span>
              <span className="font-bold text-pin-ink">{s.title}</span>
              <span className="text-sm text-pin-muted">{s.subtitle}</span>
              <span className="mt-2 text-xs font-semibold text-pin-accent">Abrir →</span>
            </Link>
          ))}
        </section>

        <section className="pin-dash-animate pin-dash-animate-d4 pin-card mt-8 p-6 md:mt-10 md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-xl font-bold text-pin-ink">Fluxo da app</h2>
            <p className="text-sm font-medium text-pin-muted">4 passos</p>
          </div>
          <ul className="mt-6 space-y-5">
            {flowSteps.map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-pin-accent to-teal-800 text-sm font-bold text-white shadow-md shadow-teal-600/25 dark:from-teal-500 dark:to-teal-800"
                  aria-hidden
                >
                  {i + 1}
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="font-bold text-pin-ink">{step.title}</p>
                  <p className="mt-1 text-pin-muted leading-relaxed">{step.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
