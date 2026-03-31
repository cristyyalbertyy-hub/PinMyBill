"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ExpenseTypeCircle, ExpenseTypeLegend } from "@/components/expense-type-circle";
import { TopNav } from "@/components/top-nav";
import type { ExpenseItem, ExpenseType } from "@/lib/mock-data";
import { ExpenseHistoryCard } from "./expense-history-card";
import { EditExpenseModal } from "./edit-expense-modal";

type GroupedNames = {
  pessoal: string[];
  empresa: string[];
  cliente: string[];
};

type DbHealth = {
  ok: boolean;
  db?: {
    hasUrl: boolean;
    host: string | null;
    provider: "missing" | "local" | "neon" | "remote";
  };
};

export default function HistoricoPage() {
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [categoryNames, setCategoryNames] = useState<GroupedNames>({
    pessoal: [],
    empresa: [],
    cliente: [],
  });
  const [clientNames, setClientNames] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dbHealth, setDbHealth] = useState<DbHealth | null>(null);

  const [editingCode, setEditingCode] = useState<string | null>(null);

  const selectedItem = useMemo(() => {
    if (!editingCode) return null;
    return items.find((i) => i.id === editingCode) ?? null;
  }, [editingCode, items]);

  const categoryOptions = useMemo(() => {
    return {
      pessoal: categoryNames.pessoal,
      empresa: categoryNames.empresa,
      cliente: categoryNames.cliente,
    } satisfies Record<ExpenseType, string[]>;
  }, [categoryNames]);

  const loadAll = useCallback(async () => {
    setLoadError(null);

    async function fetchJsonWithTimeout<T>(url: string, ms: number): Promise<T> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), ms);
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`Falha ao carregar (${res.status})`);
        return (await res.json()) as T;
      } finally {
        clearTimeout(timer);
      }
    }

    try {
      const [ex, cat, cl] = await Promise.all([
        fetchJsonWithTimeout<ExpenseItem[]>("/api/expenses", 10000),
        fetchJsonWithTimeout<{
          pessoal: { name: string }[];
          empresa: { name: string }[];
          cliente: { name: string }[];
        }>("/api/categories", 10000),
        fetchJsonWithTimeout<{ name: string }[]>("/api/clients", 10000),
      ]);

      setItems(ex);
      setCategoryNames({
        pessoal: cat.pessoal.map((r) => r.name),
        empresa: cat.empresa.map((r) => r.name),
        cliente: cat.cliente.map((r) => r.name),
      });
      setClientNames(cl.map((c) => c.name));
    } catch {
      try {
        const healthRes = await fetch("/api/health/db");
        const health = (await healthRes.json()) as DbHealth;
        setDbHealth(health);
      } catch {
        setDbHealth(null);
      }
      setLoadError("Nao foi possivel carregar o historico (timeout ou erro Neon/Prisma).");
    } finally {
      setReady(true);
    }
  }, []);

  const refreshCategoriesOnly = useCallback(async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch("/api/categories", { signal: controller.signal });
      if (!res.ok) return;
      const cat = (await res.json()) as {
        pessoal: { name: string }[];
        empresa: { name: string }[];
        cliente: { name: string }[];
      };
      setCategoryNames({
        pessoal: cat.pessoal.map((r) => r.name),
        empresa: cat.empresa.map((r) => r.name),
        cliente: cat.cliente.map((r) => r.name),
      });
    } catch {
      // Ignora falhas de refresh; o modal ja guarda a categoria criada no item.
    } finally {
      clearTimeout(timer);
    }
  }, []);

  const refreshClientsOnly = useCallback(async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch("/api/clients", { signal: controller.signal });
      if (!res.ok) return;
      const rows = (await res.json()) as { name: string }[];
      setClientNames(rows.map((r) => r.name));
    } catch {
      // Ignora falhas de refresh.
    } finally {
      clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    void fetch("/api/health/db")
      .then(async (res) => {
        const health = (await res.json()) as DbHealth;
        setDbHealth(health);
      })
      .catch(() => {
        setDbHealth(null);
      });
  }, []);

  const patchExpense = useCallback(async (code: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/expenses/${encodeURIComponent(code)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error ?? "Nao foi possivel guardar as alteracoes.");
    }
    const data = (await res.json()) as ExpenseItem;
    setItems((prev) => prev.map((i) => (i.id === code ? { ...i, ...data } : i)));
  }, []);

  const deleteExpense = useCallback(async (code: string) => {
    if (!globalThis.confirm("Remover este recibo? Esta accao nao pode ser anulada.")) return;
    try {
      const res = await fetch(`/api/expenses/${encodeURIComponent(code)}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        globalThis.alert(data.error ?? "Nao foi possivel remover.");
        return;
      }
      setItems((prev) => prev.filter((i) => i.id !== code));
      setEditingCode((prev) => (prev === code ? null : prev));
    } catch {
      globalThis.alert("Erro ao remover.");
    }
  }, []);

  async function handleSave(code: string, updates: Record<string, unknown>) {
    await patchExpense(code, updates);
  }

  return (
    <main className="pin-page px-4 pb-8 pt-4 md:p-10">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-pin-ink md:text-4xl">Historico</h1>

        <ExpenseTypeLegend className="mb-8" />

        <TopNav />

        {loadError ? (
          <p className="mb-4 rounded-xl bg-pin-warm-soft px-4 py-3 text-sm font-medium text-amber-950 ring-1 ring-amber-200/80 dark:bg-amber-950/30 dark:text-amber-100 dark:ring-amber-800">
            {loadError}
            {dbHealth?.db?.provider === "local"
              ? " Diagnostico: esta a usar localhost; remove override DATABASE_URL neste terminal."
              : ""}
            {dbHealth?.db?.provider === "missing"
              ? " Diagnostico: DATABASE_URL nao definida no ambiente deste processo."
              : ""}
          </p>
        ) : null}

        {!ready ? (
          <p className="text-sm font-medium text-pin-muted">A carregar...</p>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {items.length === 0 ? (
                <p className="pin-card border-dashed p-8 text-center text-sm font-medium text-pin-muted">
                  Ainda nao ha recibos.
                </p>
              ) : (
                items.map((item) => (
                  <ExpenseHistoryCard
                    key={item.id}
                    item={item}
                    onModify={() => setEditingCode(item.id)}
                    onDelete={() => void deleteExpense(item.id)}
                  />
                ))
              )}
            </div>

            <div className="pin-card hidden overflow-hidden p-0 md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-pin-teal-soft/80 text-pin-muted dark:bg-teal-950/40 dark:text-stone-400">
                  <tr>
                    <th className="px-4 py-3 font-semibold">ID</th>
                    <th className="px-4 py-3 font-semibold">Foto</th>
                    <th className="px-4 py-3 font-semibold">Comerciante</th>
                    <th className="px-4 py-3 font-semibold">Data</th>
                    <th className="px-4 py-3 font-semibold">Tipo</th>
                    <th className="px-4 py-3 font-semibold">Categoria</th>
                    <th className="px-4 py-3 font-semibold">Valor</th>
                    <th className="px-4 py-3 font-semibold">Acao</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-t border-stone-200/80 transition-colors duration-150 hover:bg-pin-teal-soft/55 dark:border-stone-700/80 dark:hover:bg-teal-950/30"
                    >
                      <td className="px-4 py-3 font-semibold text-pin-ink">{item.id}</td>
                      <td className="px-4 py-3">
                        {item.receiptImageUrl ? (
                          <Image
                            src={item.receiptImageUrl}
                            alt=""
                            width={48}
                            height={48}
                            className="h-12 w-12 rounded-lg object-cover ring-1 ring-stone-200 dark:ring-stone-600"
                          />
                        ) : (
                          <span className="text-xs text-pin-soft">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-pin-muted">{item.merchant}</td>
                      <td className="px-4 py-3 text-pin-muted">{item.date}</td>
                      <td className="px-4 py-3">
                        <ExpenseTypeCircle type={item.type} />
                      </td>
                      <td className="px-4 py-3 text-pin-muted">
                        {item.type === "cliente" ? item.category : item.category}
                      </td>
                      <td className="px-4 py-3 font-medium text-pin-ink">
                        {item.currency} {item.amount}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingCode(item.id)}
                            className="pin-btn-secondary min-h-10 rounded-xl px-3 py-2 text-sm"
                          >
                            Modificar
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteExpense(item.id)}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-red-600 ring-1 ring-red-200/90 hover:bg-red-50 dark:text-red-400 dark:ring-red-900/80 dark:hover:bg-red-950/50"
                            aria-label="Remover recibo"
                            title="Remover"
                          >
                            ×
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-6 text-pin-muted">
                        Ainda nao ha recibos.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <EditExpenseModal
        key={editingCode ?? "none"}
        open={!!editingCode}
        item={selectedItem}
        categoryOptions={categoryOptions}
        clientNames={clientNames}
        onClose={() => setEditingCode(null)}
        onSave={async (code, updates) => handleSave(code, updates)}
        onCategoryCreated={refreshCategoriesOnly}
        onClientCreated={refreshClientsOnly}
      />
    </main>
  );
}
