import type { ExpenseType } from "@/lib/mock-data";

const TYPE_STYLE: Record<
  ExpenseType,
  { letter: string; label: string; className: string }
> = {
  empresa: {
    letter: "E",
    label: "Empresa",
    className:
      "bg-indigo-600 text-white shadow-md shadow-indigo-900/25 ring-2 ring-indigo-400/40 dark:bg-indigo-500 dark:ring-indigo-300/30",
  },
  pessoal: {
    letter: "P",
    label: "Pessoal",
    className:
      "bg-teal-600 text-white shadow-md shadow-teal-900/25 ring-2 ring-teal-400/40 dark:bg-teal-500 dark:ring-teal-300/30",
  },
  cliente: {
    letter: "C",
    label: "Cliente",
    className:
      "bg-amber-500 text-neutral-950 shadow-md shadow-amber-900/20 ring-2 ring-amber-300/60 dark:bg-amber-400 dark:text-neutral-950 dark:ring-amber-200/40",
  },
};

type Props = {
  type: ExpenseType;
  size?: "sm" | "md";
  className?: string;
};

export function ExpenseTypeCircle({ type, size = "md", className = "" }: Props) {
  const cfg = TYPE_STYLE[type];
  const sizeClass =
    size === "sm" ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-sm";

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold tabular-nums ${sizeClass} ${cfg.className} ${className}`}
      title={cfg.label}
      aria-label={cfg.label}
    >
      {cfg.letter}
    </span>
  );
}

/** Legenda compacta (E / P / C) para páginas de despesa ou histórico */
export function ExpenseTypeLegend({ className = "" }: { className?: string }) {
  const types: ExpenseType[] = ["empresa", "pessoal", "cliente"];
  return (
    <div
      className={`flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-pin-muted ${className}`}
    >
      {types.map((t) => (
        <span key={t} className="inline-flex items-center gap-2">
          <ExpenseTypeCircle type={t} size="sm" />
          <span className="text-pin-ink/80">{TYPE_STYLE[t].label}</span>
        </span>
      ))}
    </div>
  );
}
