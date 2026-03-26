"use client";

import { useCallback, useEffect, useState } from "react";
import { TopNav } from "@/components/top-nav";

type CategoryRow = { id: string; name: string };
type ClientRow = { id: string; name: string };

type GroupedCategories = {
  pessoal: CategoryRow[];
  empresa: CategoryRow[];
  cliente: CategoryRow[];
};

export default function CategoriasPage() {
  const [grouped, setGrouped] = useState<GroupedCategories>({
    pessoal: [],
    empresa: [],
    cliente: [],
  });
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [newPessoal, setNewPessoal] = useState("");
  const [newEmpresa, setNewEmpresa] = useState("");
  const [newClienteCat, setNewClienteCat] = useState("");
  const [newClient, setNewClient] = useState("");

  const loadAll = useCallback(async () => {
    setLoadError(null);
    try {
      const [catRes, clRes] = await Promise.all([
        fetch("/api/categories"),
        fetch("/api/clients"),
      ]);
      if (!catRes.ok || !clRes.ok) throw new Error("Falha ao carregar dados.");
      const cat = (await catRes.json()) as GroupedCategories;
      const cl = (await clRes.json()) as ClientRow[];
      setGrouped(cat);
      setClients(cl);
    } catch {
      setLoadError("Nao foi possivel ligar a base de dados. Verifica DATABASE_URL e corre db:push.");
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  async function patchCategoryName(id: string, name: string) {
    const clean = name.trim();
    if (!clean) return;
    const res = await fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: clean }),
    });
    if (res.ok) await loadAll();
  }

  async function deleteCategory(id: string) {
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    if (res.ok) await loadAll();
  }

  async function addCategory(scope: keyof GroupedCategories, name: string, reset: () => void) {
    const clean = name.trim();
    if (!clean) return;
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope, name: clean }),
    });
    if (res.ok) {
      reset();
      await loadAll();
    }
  }

  async function patchClientName(id: string, name: string) {
    const clean = name.trim();
    if (!clean) return;
    const res = await fetch(`/api/clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: clean }),
    });
    if (res.ok) await loadAll();
  }

  async function deleteClient(id: string) {
    const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
    if (res.ok) await loadAll();
  }

  async function addClient(name: string, reset: () => void) {
    const clean = name.trim();
    if (!clean) return;
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: clean }),
    });
    if (res.ok) {
      reset();
      await loadAll();
    }
  }

  function CategoryBlock(props: {
    title: string;
    scope: keyof GroupedCategories;
    rows: CategoryRow[];
    newValue: string;
    setNewValue: (v: string) => void;
    placeholder: string;
  }) {
    const { title, scope, rows, newValue, setNewValue, placeholder } = props;
    return (
      <div className="pin-card p-6">
        <h2 className="text-lg font-bold text-pin-ink">{title}</h2>
        <ul className="mt-4 space-y-2">
          {rows.map((row) => (
            <li key={row.id} className="flex gap-2">
              <input
                defaultValue={row.name}
                onBlur={(e) => {
                  if (e.target.value.trim() !== row.name) {
                    void patchCategoryName(row.id, e.target.value);
                  }
                }}
                className="pin-field bg-pin-teal-soft/50 dark:bg-stone-800/80"
              />
              <button
                type="button"
                onClick={() => void deleteCategory(row.id)}
                aria-label="Apagar categoria"
                title="Apagar categoria"
                className="rounded-xl bg-red-50 px-3 text-sm font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100 dark:bg-red-950/50 dark:text-red-200 dark:ring-red-900"
              >
                🗑
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex gap-2">
          <input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder={placeholder}
            className="pin-field"
          />
          <button
            type="button"
            onClick={() => void addCategory(scope, newValue, () => setNewValue(""))}
            className="pin-btn-primary shrink-0 rounded-xl px-4 py-2 text-sm"
          >
            Adicionar
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="pin-page px-4 pb-8 pt-4 md:p-10">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-pin-ink md:text-4xl">Categorias</h1>
        <p className="pin-lead mb-8 text-base">
          Subcategorias e clientes guardados na base de dados (Neon).
        </p>

        <TopNav />

        {loadError ? (
          <p className="mb-4 rounded-xl bg-pin-warm-soft px-4 py-3 text-sm font-medium text-amber-950 ring-1 ring-amber-200/80 dark:bg-amber-950/30 dark:text-amber-100 dark:ring-amber-800">
            {loadError}
          </p>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2">
          <CategoryBlock
            title="Pessoal"
            scope="pessoal"
            rows={grouped.pessoal}
            newValue={newPessoal}
            setNewValue={setNewPessoal}
            placeholder="Nova categoria pessoal"
          />
          <CategoryBlock
            title="Empresa"
            scope="empresa"
            rows={grouped.empresa}
            newValue={newEmpresa}
            setNewValue={setNewEmpresa}
            placeholder="Nova categoria empresa"
          />
          <CategoryBlock
            title="Cliente (categorias)"
            scope="cliente"
            rows={grouped.cliente}
            newValue={newClienteCat}
            setNewValue={setNewClienteCat}
            placeholder="Nova categoria para despesas de cliente"
          />

          <div className="pin-card border-l-4 border-l-pin-warm p-6">
            <h2 className="text-lg font-bold text-pin-ink">Clientes</h2>
            <p className="mt-1 text-sm text-pin-muted">
              Nomes de clientes para exportacao e despesas tipo Cli.
            </p>
            <ul className="mt-4 space-y-2">
              {clients.map((row) => (
                <li key={row.id} className="flex gap-2">
                  <input
                    defaultValue={row.name}
                    onBlur={(e) => {
                      if (e.target.value.trim() !== row.name) {
                        void patchClientName(row.id, e.target.value);
                      }
                    }}
                    className="pin-field bg-pin-warm-soft/40 dark:bg-stone-800/80"
                  />
                  <button
                    type="button"
                    onClick={() => void deleteClient(row.id)}
                    aria-label="Apagar cliente"
                    title="Apagar cliente"
                    className="rounded-xl bg-red-50 px-3 text-sm font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100 dark:bg-red-950/50 dark:text-red-200 dark:ring-red-900"
                  >
                    🗑
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex gap-2">
              <input
                value={newClient}
                onChange={(e) => setNewClient(e.target.value)}
                placeholder="Novo cliente"
                className="pin-field"
              />
              <button
                type="button"
                onClick={() => void addClient(newClient, () => setNewClient(""))}
                className="pin-btn-primary shrink-0 rounded-xl px-4 py-2 text-sm"
              >
                Adicionar
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
