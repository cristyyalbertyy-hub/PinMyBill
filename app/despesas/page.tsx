"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TopNav } from "@/components/top-nav";
import type { CurrencyCode, ExpenseType } from "@/lib/mock-data";

type GroupedNames = {
  pessoal: string[];
  empresa: string[];
  cliente: string[];
};

export default function DespesasPage() {
  const OTHER_CATEGORY_SENTINEL = "__OUTRA__";
  const [categoryNames, setCategoryNames] = useState<GroupedNames>({
    pessoal: [],
    empresa: [],
    cliente: [],
  });
  const [clientNames, setClientNames] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<ExpenseType>("empresa");
  const [uploadCategory, setUploadCategory] = useState("");
  const [uploadOtherCategoryName, setUploadOtherCategoryName] = useState("");
  const [uploadAmount, setUploadAmount] = useState("0");
  const [uploadCurrency, setUploadCurrency] = useState<CurrencyCode>("AED");
  const [uploadClient, setUploadClient] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [newClientOpen, setNewClientOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientError, setNewClientError] = useState<string | null>(null);
  const [newClientSaving, setNewClientSaving] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  function handleCameraImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setUploadFile(file);
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  }

  function handleGalleryImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setUploadFile(file);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }

  const loadAll = useCallback(async () => {
    setLoadError(null);

    async function fetchJsonWithTimeout<T>(url: string, ms: number): Promise<T> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), ms);
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) {
          throw new Error(`Falha ao carregar (${res.status})`);
        }
        return (await res.json()) as T;
      } finally {
        clearTimeout(timer);
      }
    }

    try {
      const [catRes, clRes] = await Promise.all([
        fetchJsonWithTimeout<{
          pessoal: { name: string }[];
          empresa: { name: string }[];
          cliente: { name: string }[];
        }>("/api/categories", 10000),
        fetchJsonWithTimeout<{ name: string }[]>("/api/clients", 10000),
      ]);
      setCategoryNames({
        pessoal: catRes.pessoal.map((r) => r.name),
        empresa: catRes.empresa.map((r) => r.name),
        cliente: catRes.cliente.map((r) => r.name),
      });

      const names = clRes.map((c) => c.name);
      setClientNames(names);
      setUploadClient((prev) => {
        if (prev && names.includes(prev)) return prev;
        return names[0] ?? "";
      });
    } catch {
      setLoadError(
        "Nao foi possivel carregar os dados (timeout ou erro Neon/Prisma). Verifica DATABASE_URL e se o Neon esta acessivel."
      );
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    const list = categoryNames[uploadType];
    if (
      list.length &&
      (!uploadCategory || (!list.includes(uploadCategory) && uploadCategory !== OTHER_CATEGORY_SENTINEL))
    ) {
      setUploadCategory(list[0] ?? "");
    }
  }, [categoryNames, uploadType, uploadCategory]);

  const categoryOptions = useMemo(
    () => ({
      pessoal: categoryNames.pessoal,
      empresa: categoryNames.empresa,
      cliente: categoryNames.cliente,
    }),
    [categoryNames],
  );

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
      setClientNames((prev) =>
        [...new Set([...prev, name])].sort((a, b) => a.localeCompare(b, "pt")),
      );
      setUploadClient(name);
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

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!uploadFile) {
      setUploadError("Escolhe uma imagem de recibo.");
      return;
    }

    closeNewClientModal();

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);

      const response = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });

      const result = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !result.url) {
        throw new Error(result.error ?? "Falha no upload.");
      }

      let cat = uploadCategory || categoryOptions[uploadType][0] || "Geral";
      if (uploadCategory === OTHER_CATEGORY_SENTINEL) {
        const other = uploadOtherCategoryName.trim();
        if (!other) throw new Error("Escreve o nome da categoria 'Outra'.");

        const createCatRes = await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scope: uploadType, name: other }),
        });

        if (!createCatRes.ok) {
          throw new Error("Falha ao criar a categoria 'Outra' (pode ser duplicada).");
        }

        const createdCat = (await createCatRes.json()) as { id: string; name: string; scope: ExpenseType };
        cat = createdCat.name;

        setUploadCategory(createdCat.name);
        setUploadOtherCategoryName("");
        await loadAll();
      }

      const createRes = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant: uploadFile.name.replace(/\.[^/.]+$/, ""),
          amount: Number(uploadAmount) || 0,
          currency: uploadCurrency,
          type: uploadType,
          category: cat,
          clientName: uploadType === "cliente" ? uploadClient : null,
          status: "processado",
          receiptImageUrl: result.url,
        }),
      });

      if (!createRes.ok) throw new Error("Falha ao guardar despesa.");
      await createRes.json();
      setUploadFile(null);
      setUploadAmount("0");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao enviar recibo.";
      setUploadError(message);
    } finally {
      setUploading(false);
    }
  }

  const clientsList = clientNames.length ? clientNames : [""];

  return (
    <main className="pin-page px-4 pb-8 pt-4 md:p-10">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-pin-ink md:text-4xl">Despesas</h1>
        <p className="pin-lead mb-8 text-base">
          Entrada de dados: tirar foto, preencher e guardar. O historico fica em{" "}
          <strong className="text-pin-ink">Historico</strong>.
        </p>

        <TopNav />

        {loadError ? (
          <p className="mb-4 rounded-xl bg-pin-warm-soft px-4 py-3 text-sm font-medium text-amber-950 ring-1 ring-amber-200/80 dark:bg-amber-950/30 dark:text-amber-100 dark:ring-amber-800">
            {loadError}
          </p>
        ) : null}

        {!ready ? (
          <p className="text-sm font-medium text-pin-muted">A carregar...</p>
        ) : (
          <>
        <section className="pin-card mb-4 p-4 md:p-6">
          <h2 className="text-lg font-bold text-pin-ink">Novo recibo (confirmado)</h2>
          <p className="mt-1 text-sm text-pin-muted">
            Ao guardar, entra diretamente no historico como <strong className="text-pin-ink">processado</strong>.
          </p>
          <form onSubmit={handleUpload} className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="flex flex-col gap-2 md:col-span-3">
              <span className="text-sm font-medium text-pin-muted">Imagem do recibo</span>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                onChange={handleCameraImageChange}
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                onChange={handleGalleryImageChange}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="pin-btn-primary inline-flex min-h-12 items-center gap-2 rounded-xl px-4 py-2.5 text-sm touch-manipulation"
                  aria-label="Tirar foto ao recibo com a camara"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5 shrink-0"
                    aria-hidden
                  >
                    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                    <circle cx="12" cy="13" r="3" />
                  </svg>
                  Tirar foto
                </button>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="pin-btn-secondary inline-flex min-h-12 items-center gap-2 rounded-xl px-4 py-2.5 text-sm touch-manipulation"
                  aria-label="Carregar imagem do recibo a partir dos ficheiros"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5 shrink-0"
                    aria-hidden
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Carregar imagem
                </button>
              </div>
              {uploadFile ? (
                <p className="text-sm text-pin-muted">
                  Ficheiro: <span className="font-medium text-pin-ink">{uploadFile.name}</span>
                </p>
              ) : (
                <p className="text-sm text-pin-soft">Nenhuma imagem selecionada ainda.</p>
              )}
            </div>
            <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
              Tipo
              <select
                value={uploadType}
                onChange={(event) => {
                  const nextType = event.target.value as ExpenseType;
                  setUploadType(nextType);
                  const list = categoryNames[nextType];
                  setUploadCategory(list[0] ?? "");
                }}
                className="pin-field"
              >
                <option value="empresa">Empresa</option>
                <option value="pessoal">Pessoal</option>
                <option value="cliente">Cliente</option>
              </select>
            </label>
            {uploadType === "cliente" ? (
              <div className="flex flex-col gap-2 md:col-span-2">
                <div className="flex flex-wrap items-end gap-2">
                  <label className="flex min-w-[min(100%,14rem)] flex-1 flex-col gap-1 text-sm font-medium text-pin-muted">
                    Cliente
                    <select
                      value={uploadClient}
                      onChange={(event) => setUploadClient(event.target.value)}
                      className="pin-field"
                    >
                      {clientsList.map((client) => (
                        <option key={client || "empty"} value={client}>
                          {client || "(sem clientes — usa Novo cliente)"}
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
                value={uploadCategory}
                onChange={(event) => setUploadCategory(event.target.value)}
                className="pin-field"
              >
                {(categoryNames[uploadType].length ? categoryNames[uploadType] : ["Geral"]).map(
                  (option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ),
                )}
                <option value={OTHER_CATEGORY_SENTINEL}>Outra...</option>
              </select>
            </label>
            {uploadCategory === OTHER_CATEGORY_SENTINEL ? (
              <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted md:col-span-3">
                Nome da outra categoria
                <input
                  value={uploadOtherCategoryName}
                  onChange={(event) => setUploadOtherCategoryName(event.target.value)}
                  className="pin-field"
                  placeholder="Ex: Eventos, Marketing, etc."
                />
              </label>
            ) : null}
            <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
              Valor
              <input
                type="number"
                min="0"
                step="0.01"
                value={uploadAmount}
                onChange={(event) => setUploadAmount(event.target.value)}
                className="pin-field"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
              Moeda
              <select
                value={uploadCurrency}
                onChange={(event) => setUploadCurrency(event.target.value as CurrencyCode)}
                className="pin-field"
              >
                <option value="AED">AED</option>
                <option value="QAR">QAR</option>
                <option value="SAR">SAR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="OUTRO">Outro</option>
              </select>
            </label>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={uploading}
                className="pin-btn-primary min-h-12 w-full touch-manipulation rounded-full px-6 py-3 text-base md:w-auto md:py-2.5 md:text-sm"
              >
                {uploading ? "A enviar..." : "Guardar recibo"}
              </button>
            </div>
            {uploadError ? (
              <p className="text-sm font-medium text-red-600 md:col-span-3 dark:text-red-400">{uploadError}</p>
            ) : null}
          </form>
        </section>

        {newClientOpen ? (
          <div
            className="fixed inset-0 z-[60] flex items-end justify-center bg-stone-900/45 backdrop-blur-[2px] md:items-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-client-title"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeNewClientModal();
            }}
          >
            <div className="pin-card w-full max-w-md rounded-t-3xl border-t-4 border-t-pin-accent p-4 shadow-2xl md:rounded-2xl md:p-6">
              <h3 id="new-client-title" className="text-lg font-bold text-pin-ink">
                Novo cliente
              </h3>
              <p className="mt-1 text-sm text-pin-muted">
                O nome fica guardado na base de dados e aparece nesta lista para futuros recibos.
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

          </>
        )}
      </div>
    </main>
  );
}
