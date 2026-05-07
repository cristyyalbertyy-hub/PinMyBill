"use client";

import { useCallback, useEffect, useState } from "react";
import { TopNav } from "@/components/top-nav";
import { ExpenseTypeCircle } from "@/components/expense-type-circle";
import { useT } from "@/lib/i18n/context";

type CategoryRow = { id: string; name: string };
type ClientRow = { id: string; name: string };

type GroupedCategories = {
  pessoal: CategoryRow[];
  empresa: CategoryRow[];
  cliente: CategoryRow[];
};

type CategoryBlockProps = {
  title: string;
  scope: keyof GroupedCategories;
  rows: CategoryRow[];
  newValue: string;
  setNewValue: (v: string) => void;
  placeholder: string;
  addButtonLabel: string;
  deleteCategoryAria: string;
  patchCategoryName: (id: string, name: string) => void | Promise<void>;
  deleteCategory: (id: string, displayName: string) => void | Promise<void>;
  addCategory: (scope: keyof GroupedCategories, name: string, reset: () => void) => void | Promise<void>;
};

/** Fora do page: se for definido dentro do pai, cada tecla remonta o bloco e o input perde o foco. */
function CategoryBlock({
  title,
  scope,
  rows,
  newValue,
  setNewValue,
  placeholder,
  addButtonLabel,
  deleteCategoryAria,
  patchCategoryName,
  deleteCategory,
  addCategory,
}: CategoryBlockProps) {
  const typeByScope = {
    pessoal: "pessoal",
    empresa: "empresa",
    cliente: "cliente",
  } as const;

  return (
    <div className="pin-card p-6">
      <h2 className="inline-flex items-center gap-2 text-lg font-bold text-pin-ink">
        <ExpenseTypeCircle type={typeByScope[scope]} size="sm" />
        <span>{title}</span>
      </h2>
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
              onClick={() => void deleteCategory(row.id, row.name)}
              aria-label={deleteCategoryAria}
              title={deleteCategoryAria}
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
          className="pin-field pin-field-orange-focus"
        />
        <button
          type="button"
          onClick={() => void addCategory(scope, newValue, () => setNewValue(""))}
          className="pin-btn-primary shrink-0 rounded-xl px-4 py-2 text-sm"
        >
          {addButtonLabel}
        </button>
      </div>
    </div>
  );
}

export default function CategoriasPage() {
  const t = useT();
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
      if (!catRes.ok || !clRes.ok) throw new Error("load fail");
      const cat = (await catRes.json()) as GroupedCategories;
      const cl = (await clRes.json()) as ClientRow[];
      setGrouped(cat);
      setClients(cl);
    } catch {
      setLoadError(t("cat.loadError"));
    }
  }, [t]);

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
    if (res.ok) {
      await loadAll();
      return;
    }

    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    globalThis.alert(data?.error ?? t("confirm.updateCategoryFail"));
  }

  async function deleteCategory(id: string, displayName: string) {
    if (!globalThis.confirm(t("confirm.deleteCategory", { name: displayName }))) {
      return;
    }
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    if (res.ok) {
      await loadAll();
      return;
    }

    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    globalThis.alert(data?.error ?? t("cat.deleteCategoryFail"));
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

  async function deleteClient(id: string, displayName: string) {
    if (!globalThis.confirm(t("confirm.deleteClient", { name: displayName }))) {
      return;
    }
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

  return (
    <main className="pin-page px-4 pb-8 pt-4 md:p-10">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-6 text-3xl font-extrabold tracking-tight text-pin-ink md:mb-8 md:text-4xl">
          {t("cat.title")}
        </h1>

        <TopNav />

        {loadError ? (
          <p className="mb-4 rounded-xl bg-pin-warm-soft px-4 py-3 text-sm font-medium text-amber-950 ring-1 ring-amber-200/80 dark:bg-amber-950/30 dark:text-amber-100 dark:ring-amber-800">
            {loadError}
          </p>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2">
          <CategoryBlock
            title={t("cat.personal")}
            scope="pessoal"
            rows={grouped.pessoal}
            newValue={newPessoal}
            setNewValue={setNewPessoal}
            placeholder={t("cat.newPersonalPh")}
            addButtonLabel={t("common.add")}
            deleteCategoryAria={t("cat.deleteCatAria")}
            patchCategoryName={patchCategoryName}
            deleteCategory={deleteCategory}
            addCategory={addCategory}
          />
          <CategoryBlock
            title={t("cat.company")}
            scope="empresa"
            rows={grouped.empresa}
            newValue={newEmpresa}
            setNewValue={setNewEmpresa}
            placeholder={t("cat.newCompanyPh")}
            addButtonLabel={t("common.add")}
            deleteCategoryAria={t("cat.deleteCatAria")}
            patchCategoryName={patchCategoryName}
            deleteCategory={deleteCategory}
            addCategory={addCategory}
          />
          <CategoryBlock
            title={t("cat.clientCats")}
            scope="cliente"
            rows={grouped.cliente}
            newValue={newClienteCat}
            setNewValue={setNewClienteCat}
            placeholder={t("cat.newClientCatPh")}
            addButtonLabel={t("common.add")}
            deleteCategoryAria={t("cat.deleteCatAria")}
            patchCategoryName={patchCategoryName}
            deleteCategory={deleteCategory}
            addCategory={addCategory}
          />

          <div className="pin-card border-l-4 border-l-fuchsia-500 bg-fuchsia-50/30 p-6 dark:bg-fuchsia-950/20">
            <h2 className="inline-flex items-center gap-2 text-lg font-bold text-pin-ink">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-fuchsia-500 text-[11px] font-bold text-white ring-2 ring-fuchsia-300/60 dark:bg-fuchsia-400 dark:text-neutral-900">
                U
              </span>
              <span>{t("cat.clients")}</span>
            </h2>
            <p className="mt-1 text-sm text-pin-muted">{t("cat.clientCatsLead")}</p>
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
                    onClick={() => void deleteClient(row.id, row.name)}
                    aria-label={t("cat.deleteClientAria")}
                    title={t("cat.deleteClientAria")}
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
                placeholder={t("cat.newClientPh")}
                className="pin-field"
              />
              <button
                type="button"
                onClick={() => void addClient(newClient, () => setNewClient(""))}
                className="pin-btn-primary shrink-0 rounded-xl px-4 py-2 text-sm"
              >
                {t("common.add")}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
