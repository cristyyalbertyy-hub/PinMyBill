"use client";

import Image from "next/image";
import type { CurrencyCode, ExpenseItem, ExpenseType } from "@/lib/mock-data";

type Props = {
  item: ExpenseItem;
  categoryNamesForType: string[];
  clientNames: string[];
  isEditable: boolean;
  editOpen: boolean;
  onCategory: (id: string, v: string) => void;
  onType: (id: string, v: ExpenseType) => void;
  onAmount: (id: string, v: string) => void;
  onCurrency: (id: string, v: CurrencyCode) => void;
  onClient: (id: string, v: string) => void;
  onMarkProcessed: (id: string) => void;
  onToggleEdit: (id: string) => void;
};

export function ExpenseMobileCard(props: Props) {
  const {
    item,
    categoryNamesForType,
    clientNames,
    isEditable,
    editOpen,
    onCategory,
    onType,
    onAmount,
    onCurrency,
    onClient,
    onMarkProcessed,
    onToggleEdit,
  } = props;

  const list = categoryNamesForType.length ? categoryNamesForType : [item.category];

  return (
    <article
      className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"
    >
      <div className="flex gap-3">
        <div className="shrink-0">
          {item.receiptImageUrl ? (
            <Image
              src={item.receiptImageUrl}
              alt=""
              width={56}
              height={56}
              className="h-14 w-14 rounded-xl object-cover ring-1 ring-neutral-200"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-neutral-100 text-xs text-neutral-400">
              —
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate font-semibold text-neutral-900">{item.merchant}</p>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                item.status === "processado"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {item.status}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-neutral-500">
            {item.id} · {item.date}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <label className="block text-xs font-medium text-neutral-600">
          Tipo
          <select
            value={item.type}
            onChange={(e) => onType(item.id, e.target.value as ExpenseType)}
            disabled={!isEditable}
            className="mt-1 min-h-12 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-base outline-none focus:border-neutral-500 disabled:bg-neutral-100"
          >
            <option value="empresa">Emp</option>
            <option value="cliente">Cli</option>
            <option value="pessoal">Pes</option>
          </select>
        </label>

        {item.type === "cliente" ? (
          <label className="block text-xs font-medium text-neutral-600">
            Cliente
            <select
              value={item.clientName ?? clientNames[0] ?? ""}
              onChange={(e) => onClient(item.id, e.target.value)}
              disabled={!isEditable}
              className="mt-1 min-h-12 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-base outline-none focus:border-neutral-500 disabled:bg-neutral-100"
            >
              {clientNames.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="block text-xs font-medium text-neutral-600">
          Categoria
          <select
            value={item.category}
            onChange={(e) => onCategory(item.id, e.target.value)}
            disabled={!isEditable}
            className="mt-1 min-h-12 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-base outline-none focus:border-neutral-500 disabled:bg-neutral-100"
          >
            {!list.includes(item.category) ? (
              <option value={item.category}>{item.category}</option>
            ) : null}
            {list.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-medium text-neutral-600">
            Moeda
            <select
              value={item.currency}
              onChange={(e) => onCurrency(item.id, e.target.value as CurrencyCode)}
              disabled={!isEditable}
              className="mt-1 min-h-12 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-base outline-none focus:border-neutral-500 disabled:bg-neutral-100"
            >
              <option value="AED">AED</option>
              <option value="QAR">QAR</option>
              <option value="SAR">SAR</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="OUTRO">Outro</option>
            </select>
          </label>
          <label className="block text-xs font-medium text-neutral-600">
            Valor
            <input
              type="number"
              min={0}
              step="0.01"
              value={item.amount}
              onChange={(e) => onAmount(item.id, e.target.value)}
              disabled={!isEditable}
              className="mt-1 min-h-12 w-full rounded-xl border border-neutral-300 px-3 py-2 text-base outline-none focus:border-neutral-500 disabled:bg-neutral-100"
            />
          </label>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {item.status === "rever" ? (
          <button
            type="button"
            onClick={() => onMarkProcessed(item.id)}
            className="min-h-12 flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white active:bg-emerald-700"
          >
            Marcar como processado
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onToggleEdit(item.id)}
            className="min-h-12 flex-1 rounded-xl bg-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-900 active:bg-neutral-300"
          >
            {editOpen ? "Fechar edicao" : "Modificar"}
          </button>
        )}
      </div>

    </article>
  );
}
