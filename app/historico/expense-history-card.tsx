"use client";

import Image from "next/image";
import { ExpenseTypeCircle } from "@/components/expense-type-circle";
import { useT } from "@/lib/i18n/context";
import type { ExpenseItem } from "@/lib/mock-data";

const BORDER_BY_TYPE: Record<ExpenseItem["type"], string> = {
  empresa: "border-l-indigo-500 dark:border-l-indigo-400",
  pessoal: "border-l-teal-500 dark:border-l-teal-400",
  cliente: "border-l-amber-500 dark:border-l-amber-400",
};

type Props = {
  item: ExpenseItem;
  onModify: () => void;
  onDelete: () => void;
};

export function ExpenseHistoryCard({ item, onModify, onDelete }: Props) {
  const t = useT();

  return (
    <article
      className={`pin-card pin-card-hover relative overflow-hidden border-l-4 p-4 pl-4 ${BORDER_BY_TYPE[item.type]}`}
    >
      <div className="absolute right-3 top-3 flex items-center gap-1.5">
        <button
          type="button"
          onClick={onModify}
          className="pin-btn-secondary min-h-10 rounded-xl px-3 py-2 text-sm active:scale-[0.98]"
        >
          {t("common.modify")}
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-bold leading-none text-red-600 ring-1 ring-red-200/90 transition hover:bg-red-50 active:scale-[0.98] dark:text-red-400 dark:ring-red-900/80 dark:hover:bg-red-950/50"
          aria-label={t("hist.removeReceiptAria")}
          title={t("common.remove")}
        >
          ×
        </button>
      </div>

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

        <div className="min-w-0 flex-1 pr-[10.5rem]">
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
          <span className="text-pin-muted">{t("common.type")}</span>
          <ExpenseTypeCircle type={item.type} />
        </div>

        {item.type === "cliente" ? (
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-pin-muted">{t("common.client")}</span>
            <span className="max-w-[55%] truncate text-right font-semibold text-pin-ink">
              {item.clientName ?? ""}
            </span>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-pin-muted">{t("common.category")}</span>
          <span className="max-w-[55%] truncate text-right font-semibold text-pin-ink">
            {item.category}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-pin-muted">{t("common.value")}</span>
          <span className="font-bold text-pin-accent">{item.currency} {item.amount}</span>
        </div>
      </div>
    </article>
  );
}
