"use client";

import { useMemo, useState } from "react";
import type { CurrencyCode, ExpenseItem, ExpenseType } from "@/lib/mock-data";

type Props = {
  open: boolean;
  item: ExpenseItem | null;
  categoryOptions: Record<ExpenseType, string[]>;
  clientNames: string[];
  onClose: () => void;
  onSave: (code: string, updates: Record<string, unknown>) => Promise<void> | void;
  onCategoryCreated?: () => Promise<void> | void;
  onClientCreated?: () => Promise<void> | void;
};

const currencyOptions: CurrencyCode[] = ["AED", "QAR", "SAR", "USD", "EUR", "OUTRO"];
const OTHER_CATEGORY_SENTINEL = "__OUTRA__";

export function EditExpenseModal({
  open,
  item,
  categoryOptions,
  clientNames,
  onClose,
  onSave,
  onCategoryCreated,
  onClientCreated,
}: Props) {
  const [type, setType] = useState<ExpenseType>(() => item?.type ?? "empresa");
  const [clientName, setClientName] = useState<string>(
    () => item?.clientName ?? clientNames[0] ?? "",
  );
  const [category, setCategory] = useState<string>(() => item?.category ?? "");
  const [otherCategoryName, setOtherCategoryName] = useState("");
  const [amount, setAmount] = useState<string>(() => String(item?.amount ?? 0));
  const [currency, setCurrency] = useState<CurrencyCode>(() => item?.currency ?? "AED");

  const [newClientOpen, setNewClientOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientError, setNewClientError] = useState<string | null>(null);
  const [newClientSaving, setNewClientSaving] = useState(false);

  const availableCategories = useMemo(() => {
    const list = categoryOptions[type] ?? [];
    if (category && !list.includes(category)) return [category, ...list];
    return list;
  }, [category, categoryOptions, type]);

  if (!open || !item) return null;
  const currentItem = item;

  const clientsList = clientNames.length ? clientNames : [""];

  async function saveNewClient() {
    const clean = newClientName.trim();
    if (!clean) {
      setNewClientError("Escreve o nome do cliente.");
      return;
    }
    setNewClientSaving(true);
    setNewClientError(null);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: clean }),
      });
      const data = (await res.json()) as { name?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Nao foi possivel criar o cliente.");
      }
      const name = data.name ?? clean;
      if (onClientCreated) await onClientCreated();
      setClientName(name);
      setNewClientName("");
      setNewClientOpen(false);
    } catch (e) {
      setNewClientError(e instanceof Error ? e.message : "Erro ao criar cliente.");
    } finally {
      setNewClientSaving(false);
    }
  }

  function closeNewClientModal() {
    setNewClientOpen(false);
    setNewClientName("");
    setNewClientError(null);
    setNewClientSaving(false);
  }

  async function handleSave() {
    closeNewClientModal();

    const parsed = Number(amount);
    const safeAmount = Number.isNaN(parsed) ? 0 : parsed;

    let finalCategory = category;
    if (category === OTHER_CATEGORY_SENTINEL) {
      const other = otherCategoryName.trim();
      if (!other) throw new Error("Escreve o nome da categoria 'Outra'.");

      const createCatRes = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: type, name: other }),
      });

      if (!createCatRes.ok) {
        throw new Error("Falha ao criar a categoria 'Outra' (pode ser duplicada).");
      }

      const createdCat = (await createCatRes.json()) as { name: string };
      finalCategory = createdCat.name;
      setCategory(createdCat.name);
      setOtherCategoryName("");

      if (onCategoryCreated) await onCategoryCreated();
    }

    const updates: Record<string, unknown> = {
      type,
      amount: safeAmount,
      currency,
      category: finalCategory,
      clientName: type === "cliente" ? clientName : null,
    };

    await onSave(currentItem.id, updates);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-stone-900/45 backdrop-blur-[2px] md:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Modificar recibo"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="pin-card w-full max-w-xl rounded-t-3xl border-t-4 border-t-pin-accent p-4 shadow-2xl md:rounded-2xl md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-pin-ink">Modificar recibo</h2>
            <p className="mt-1 text-sm text-pin-muted">
              {item.merchant} · {item.id}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="pin-btn-secondary min-h-10 rounded-xl px-3 py-2 text-sm"
          >
            Fechar
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
            Tipo
            <select
              value={type}
              onChange={(e) => {
                const next = e.target.value as ExpenseType;
                setType(next);
                const nextCats = categoryOptions[next] ?? [];
                if (nextCats.length) setCategory(nextCats[0]);
                if (next !== "cliente") setClientName("");
                else setClientName((prev) => prev || clientNames[0] || "");
              }}
              className="pin-field pin-field-lg"
            >
              <option value="empresa">Emp</option>
              <option value="cliente">Cli</option>
              <option value="pessoal">Pes</option>
            </select>
          </label>

          {type === "cliente" ? (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-end gap-2">
                <label className="flex min-w-[min(100%,14rem)] flex-1 flex-col gap-1 text-sm font-medium text-pin-muted">
                  Cliente
                  <select
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="pin-field pin-field-lg"
                  >
                    {clientsList.map((c) => (
                      <option key={c || "empty"} value={c}>
                        {c || "(sem clientes — usa Novo cliente)"}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setNewClientError(null);
                    setNewClientOpen(true);
                  }}
                  className="pin-btn-secondary min-h-12 shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold touch-manipulation"
                >
                  Novo cliente
                </button>
              </div>
            </div>
          ) : null}

          <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
            Categoria
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="pin-field pin-field-lg"
            >
              {availableCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value={OTHER_CATEGORY_SENTINEL}>Outra...</option>
            </select>
          </label>

          {category === OTHER_CATEGORY_SENTINEL ? (
            <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
              Nome da outra categoria
              <input
                value={otherCategoryName}
                onChange={(e) => setOtherCategoryName(e.target.value)}
                className="pin-field pin-field-lg"
                placeholder="Ex: Eventos, Marketing, etc."
              />
            </label>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
              Moeda
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                className="pin-field pin-field-lg"
              >
                {currencyOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
              Valor
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pin-field pin-field-lg"
              />
            </label>
          </div>

          {/* Estado nao e editavel no historico (definido aquando da confirmacao). */}
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="pin-btn-primary min-h-12 flex-1 rounded-xl px-4 py-3 text-sm"
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={onClose}
            className="pin-btn-secondary min-h-12 rounded-xl px-4 py-3 text-sm"
          >
            Cancelar
          </button>
        </div>

        {newClientOpen ? (
          <div
            className="fixed inset-0 z-[70] flex items-end justify-center bg-stone-900/55 backdrop-blur-[2px] md:items-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-new-client-title"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeNewClientModal();
            }}
          >
            <div className="pin-card w-full max-w-md rounded-t-3xl border-t-4 border-t-pin-warm p-4 shadow-2xl md:rounded-2xl md:p-6">
              <h3 id="edit-new-client-title" className="text-lg font-bold text-pin-ink">
                Novo cliente
              </h3>
              <p className="mt-1 text-sm text-pin-muted">
                O nome fica guardado na base de dados e aparece nesta lista.
              </p>
              <label className="mt-4 flex flex-col gap-1 text-sm font-medium text-pin-muted">
                Nome
                <input
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="pin-field pin-field-lg"
                  placeholder="Ex: Hotel X, Cliente Y"
                  autoComplete="organization"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void saveNewClient();
                    }
                  }}
                />
              </label>
              {newClientError ? (
                <p className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">{newClientError}</p>
              ) : null}
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={newClientSaving}
                  onClick={() => void saveNewClient()}
                  className="pin-btn-primary min-h-12 flex-1 rounded-xl px-4 py-3 text-sm"
                >
                  {newClientSaving ? "A guardar..." : "Guardar"}
                </button>
                <button
                  type="button"
                  onClick={closeNewClientModal}
                  className="pin-btn-secondary min-h-12 rounded-xl px-4 py-3 text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

