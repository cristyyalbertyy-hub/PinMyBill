"use client";

import Image from "next/image";
import type { ExpenseItem } from "@/lib/mock-data";

type Props = {
  item: ExpenseItem;
  onModify: () => void;
};

function typeLabel(type: ExpenseItem["type"]) {
  if (type === "empresa") return "Emp";
  if (type === "cliente") return "Cli";
  return "Pes";
}

export function ExpenseHistoryCard({ item, onModify }: Props) {
  return (
    <article className="pin-card relative overflow-hidden border-l-4 border-l-pin-accent p-4 pl-4">
      <button
        type="button"
        onClick={onModify}
        className="pin-btn-secondary absolute right-3 top-3 min-h-10 rounded-xl px-3 py-2 text-sm active:scale-[0.98]"
      >
        Modificar
      </button>

      <div className="flex gap-3 pt-2">
        <div className="shrink-0">
          {item.receiptImageUrl ? (
            <Image
              src={item.receiptImageUrl}
              alt=""
              width={56}
              height={56}
              className="h-14 w-14 rounded-xl object-cover ring-1 ring-stone-200 dark:ring-stone-600"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-pin-teal-soft text-xs text-pin-soft dark:bg-stone-800">
              —
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 pr-20">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate font-bold text-pin-ink">{item.merchant}</p>
          </div>
          <p className="mt-0.5 text-xs font-medium text-pin-muted">
            {item.id} · {item.date}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-pin-muted">Tipo</span>
          <span className="font-semibold text-pin-ink">{typeLabel(item.type)}</span>
        </div>

        {item.type === "cliente" ? (
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-pin-muted">Cliente</span>
            <span className="max-w-[55%] truncate text-right font-semibold text-pin-ink">
              {item.clientName ?? ""}
            </span>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-pin-muted">Categoria</span>
          <span className="max-w-[55%] truncate text-right font-semibold text-pin-ink">
            {item.category}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-pin-muted">Valor</span>
          <span className="font-bold text-pin-accent">{item.currency} {item.amount}</span>
        </div>
      </div>
    </article>
  );
}
