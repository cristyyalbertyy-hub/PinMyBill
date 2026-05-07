"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ExpenseTypeCircle } from "@/components/expense-type-circle";
import { uploadReceiptImage } from "@/lib/receipt-upload";
import { TopNav } from "@/components/top-nav";
import { useT } from "@/lib/i18n/context";
import type { CurrencyCode, ExpenseType } from "@/lib/mock-data";

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

function DespesasPageContent() {
  const t = useT();
  const searchParams = useSearchParams();
  const OTHER_CATEGORY_SENTINEL = "__OUTRA__";
  const OTHER_CURRENCY_SENTINEL = "OUTRO";
  const [categoryNames, setCategoryNames] = useState<GroupedNames>({
    pessoal: [],
    empresa: [],
    cliente: [],
  });
  const [clientNames, setClientNames] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dbHealth, setDbHealth] = useState<DbHealth | null>(null);

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<ExpenseType>("cliente");
  const [uploadCategory, setUploadCategory] = useState("");
  const [uploadOtherCategoryName, setUploadOtherCategoryName] = useState("");
  const [uploadAmount, setUploadAmount] = useState("");
  const [uploadCurrency, setUploadCurrency] = useState<CurrencyCode>("AED");
  const [uploadOtherCurrency, setUploadOtherCurrency] = useState("");
  const [uploadClient, setUploadClient] = useState("");
  /** Sem imagem e obrigatorio; com imagem e opcional (cai no nome do ficheiro). */
  const [uploadMerchant, setUploadMerchant] = useState("");
  const [uploadDate, setUploadDate] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null);
  const [cameraPendingSelection, setCameraPendingSelection] = useState(false);

  const [newClientOpen, setNewClientOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientError, setNewClientError] = useState<string | null>(null);
  const [newClientSaving, setNewClientSaving] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const quickCameraTriggeredRef = useRef(false);
  const uploadPreviewUrlRef = useRef<string | null>(null);

  function handleCameraImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (file) {
      setUploadFile(file);
      setUploadError(null);
      setCameraPendingSelection(false);
    } else if (cameraPendingSelection) {
      // Em alguns telemoveis, "low memory" devolve sem ficheiro; noutros pode ser cancelamento.
      setUploadError(t("desp.cameraNoImageSelected"));
      setCameraPendingSelection(false);
    }
    if (galleryInputRef.current) galleryInputRef.current.value = "";
    event.target.value = "";
  }

  function handleGalleryImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (file) {
      setUploadFile(file);
      setUploadError(null);
    }
    setCameraPendingSelection(false);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    event.target.value = "";
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
        }>("/api/categories", 28000),
        fetchJsonWithTimeout<{ name: string }[]>("/api/clients", 28000),
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
      try {
        const healthRes = await fetch("/api/health/db");
        const health = (await healthRes.json()) as DbHealth;
        setDbHealth(health);
      } catch {
        setDbHealth(null);
      }
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
    if (!ready) return;
    if (searchParams.get("quickPhoto") !== "1") return;
    if (quickCameraTriggeredRef.current) return;
    quickCameraTriggeredRef.current = true;
    setUploadError(null);
    const timer = setTimeout(() => {
      setCameraPendingSelection(true);
      cameraInputRef.current?.click();
    }, 120);
    return () => clearTimeout(timer);
  }, [ready, searchParams]);

  useEffect(
    () => () => {
      if (uploadPreviewUrlRef.current) URL.revokeObjectURL(uploadPreviewUrlRef.current);
    },
    [],
  );

  useEffect(() => {
    if (uploadPreviewUrlRef.current) {
      URL.revokeObjectURL(uploadPreviewUrlRef.current);
      uploadPreviewUrlRef.current = null;
    }
    if (!uploadFile) {
      setUploadPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(uploadFile);
    uploadPreviewUrlRef.current = url;
    setUploadPreviewUrl(url);
  }, [uploadFile]);

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

  function resetReceiptForm() {
    setUploadError(null);
    setUploadFile(null);
    setUploadMerchant("");
    setUploadAmount("");
    setUploadCurrency("AED");
    setUploadOtherCurrency("");
    setUploadOtherCategoryName("");
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    setUploadDate(`${y}-${m}-${day}`);
    const list = categoryNames[uploadType];
    setUploadCategory(list[0] ?? "");
    if (clientNames.length) {
      setUploadClient((prev) => (clientNames.includes(prev) ? prev : clientNames[0] ?? ""));
    }
  }

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploadCurrency === OTHER_CURRENCY_SENTINEL && !uploadOtherCurrency.trim()) {
      setUploadError("Escreve a outra moeda (ex.: BRL).");
      return;
    }

    const merchantTrim = uploadMerchant.trim();
    const merchantFromFilename = uploadFile
      ? uploadFile.name.replace(/\.[^/.]+$/, "")
      : "";
    const merchant =
      merchantTrim || (uploadFile ? merchantFromFilename : "");
    if (!merchant) {
      setUploadError(
        "Sem imagem: escreve comerciante ou descricao. Com imagem: opcional (usa o nome do ficheiro se vazio).",
      );
      return;
    }

    const amountParsed = Number.parseFloat(uploadAmount.trim().replace(",", "."));
    if (!Number.isFinite(amountParsed) || amountParsed <= 0) {
      setUploadError("Indica o valor (maior que zero).");
      return;
    }

    if (!uploadDate.trim()) {
      setUploadError("Indica a data do recibo.");
      return;
    }

    closeNewClientModal();

    setUploading(true);
    setUploadError(null);

    try {
      let receiptImageUrl: string | null = null;
      if (uploadFile) {
        receiptImageUrl = await uploadReceiptImage(uploadFile);
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
          merchant,
          amount: amountParsed,
          currency:
            uploadCurrency === OTHER_CURRENCY_SENTINEL
              ? uploadOtherCurrency.trim().toUpperCase()
              : uploadCurrency,
          date: uploadDate,
          type: uploadType,
          category: cat,
          clientName: uploadType === "cliente" ? uploadClient : null,
          status: "processado",
          receiptImageUrl,
        }),
      });

      if (!createRes.ok) throw new Error("Falha ao guardar despesa.");
      await createRes.json();
      setUploadFile(null);
      setUploadMerchant("");
      setUploadAmount("");
      setUploadCurrency("AED");
      setUploadOtherCurrency("");
      {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        setUploadDate(`${y}-${m}-${day}`);
      }
    } catch (error) {
      console.error("Erro ao enviar recibo:", error);
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : error && typeof error === "object" && "message" in error
              ? String((error as { message: unknown }).message)
              : "Erro ao enviar recibo.";
      setUploadError(message);
    } finally {
      setUploading(false);
    }
  }

  const clientsList = clientNames.length ? clientNames : [""];

  return (
    <main className="pin-page px-4 pb-8 pt-4 md:p-10">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-8 text-3xl font-extrabold tracking-tight text-pin-ink md:text-4xl">
          {t("desp.title")}
        </h1>

        <TopNav />

        {dbHealth ? (
          <div className="mt-4 flex justify-end">
            <p className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-pin-teal-soft/65 px-3 py-1 text-[11px] font-semibold text-pin-muted ring-1 ring-teal-200/70 dark:bg-teal-950/25 dark:ring-teal-800/60">
              <span aria-hidden>●</span>
              <span>{t("db.label")}</span>
              <strong className="text-pin-ink">
                {dbHealth.db?.provider === "neon"
                  ? t("db.badge.neon")
                  : dbHealth.db?.provider === "local"
                    ? t("db.badge.local")
                    : dbHealth.db?.provider === "missing"
                      ? t("db.badge.missing")
                      : t("db.badge.remote")}
              </strong>
              {dbHealth.db?.host ? (
                <span className="max-w-[14rem] truncate text-pin-soft" title={dbHealth.db.host}>
                  {dbHealth.db.host}
                </span>
              ) : null}
            </p>
          </div>
        ) : null}

        {loadError ? (
          <p className="mb-4 rounded-xl bg-pin-warm-soft px-4 py-3 text-sm font-medium text-amber-950 ring-1 ring-amber-200/80 dark:bg-amber-950/30 dark:text-amber-100 dark:ring-amber-800">
            {loadError}
            {dbHealth?.db?.provider === "local" ? t("hist.dbLocal") : ""}
            {dbHealth?.db?.provider === "missing" ? t("hist.dbMissing") : ""}
          </p>
        ) : null}

        {ready ? (
          <>
        <section className="pin-card mb-4 p-4 md:p-6">
          <h2 className="text-lg font-bold text-pin-ink">{t("desp.newReceiptHeading")}</h2>
          <form onSubmit={handleUpload} className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="flex flex-col gap-2 md:col-span-3">
              <span className="text-sm font-medium text-pin-muted">{t("common.photo")}</span>
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
                  onClick={() => {
                    setCameraPendingSelection(true);
                    cameraInputRef.current?.click();
                  }}
                  className="pin-btn-primary inline-flex min-h-12 items-center gap-2 rounded-xl px-4 py-2.5 text-sm touch-manipulation"
                  aria-label={t("common.takePhoto")}
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
                  {t("common.takePhoto")}
                </button>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="pin-btn-secondary inline-flex min-h-12 items-center gap-2 rounded-xl px-4 py-2.5 text-sm touch-manipulation"
                  aria-label={t("common.uploadImage")}
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
                  {t("common.uploadImage")}
                </button>
              </div>
              <p className="text-xs text-pin-soft">
                {t("desp.photoHelp")}
              </p>
              {uploadFile ? (
                <div className="space-y-2">
                  <p className="text-sm text-pin-muted">
                    {t("desp.file")}{" "}
                    <span className="font-medium text-pin-ink">{uploadFile.name}</span>
                  </p>
                  {uploadPreviewUrl ? (
                    <div className="max-w-[14rem] overflow-hidden rounded-xl border border-stone-200/80 bg-white/80 p-1 shadow-sm dark:border-stone-700 dark:bg-stone-900/60">
                      <img
                        src={uploadPreviewUrl}
                        alt={t("desp.previewAlt")}
                        className="h-auto w-full max-h-64 rounded-lg object-contain"
                      />
                    </div>
                  ) : null}
                  {uploadPreviewUrl ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!globalThis.confirm(t("confirm.clearImage"))) return;
                          setUploadFile(null);
                          setUploadError(null);
                        }}
                        className="pin-btn-secondary min-h-10 rounded-xl px-3 py-2 text-sm"
                        aria-label={t("common.clearImage")}
                      >
                        {t("common.clearImage")}
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
              {t("common.date")}
              <input
                type="date"
                value={uploadDate}
                onChange={(event) => setUploadDate(event.target.value)}
                className="pin-field"
                max="2099-12-31"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted md:col-span-2">
              {t("common.merchant")}
              <input
                value={uploadMerchant}
                onChange={(event) => setUploadMerchant(event.target.value)}
                className="pin-field pin-field-orange-focus"
                placeholder={
                  uploadFile ? t("common.optionalWithImage") : t("common.requiredNoImage")
                }
                autoComplete="off"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
              <span className="inline-flex items-center gap-2">
                {t("common.type")}
                <ExpenseTypeCircle type={uploadType} size="sm" />
              </span>
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
                <option value="cliente">{t("type.cliente")}</option>
                <option value="empresa">{t("type.empresa")}</option>
                <option value="pessoal">{t("type.pessoal")}</option>
              </select>
            </label>
            {uploadType === "cliente" ? (
              <div className="flex flex-col gap-2 md:col-span-2">
                <div className="flex flex-wrap items-end gap-2">
                  <label className="flex min-w-[min(100%,14rem)] flex-1 flex-col gap-1 text-sm font-medium text-pin-muted">
                    {t("common.client")}
                    <select
                      value={uploadClient}
                      onChange={(event) => setUploadClient(event.target.value)}
                      className="pin-field"
                    >
                      {clientsList.map((client) => (
                        <option key={client || "empty"} value={client}>
                          {client || t("edit.noClientsOption")}
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
                    className="pin-btn-primary min-h-12 shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold touch-manipulation active:scale-[0.98]"
                  >
                    {t("common.newClient")}
                  </button>
                </div>
              </div>
            ) : null}
            <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
              {t("common.category")}
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
                <option value={OTHER_CATEGORY_SENTINEL}>{t("common.other")}</option>
              </select>
            </label>
            {uploadCategory === OTHER_CATEGORY_SENTINEL ? (
              <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted md:col-span-3">
                {t("desp.otherCategory")}
                <input
                  value={uploadOtherCategoryName}
                  onChange={(event) => setUploadOtherCategoryName(event.target.value)}
                  className="pin-field"
                  placeholder={t("desp.otherCategoryPh")}
                />
              </label>
            ) : null}
            <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
              {t("common.amount")}
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
              {t("common.currency")}
              <select
                value={uploadCurrency}
                onChange={(event) => {
                  const value = event.target.value as CurrencyCode;
                  setUploadCurrency(value);
                  if (value !== OTHER_CURRENCY_SENTINEL) {
                    setUploadOtherCurrency("");
                  }
                }}
                className="pin-field"
              >
                <option value="AED">AED</option>
                <option value="QAR">QAR</option>
                <option value="SAR">SAR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value={OTHER_CURRENCY_SENTINEL}>{t("common.other")}</option>
              </select>
            </label>
            {uploadCurrency === OTHER_CURRENCY_SENTINEL ? (
              <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
                {t("desp.otherCurrency")}
                <input
                  value={uploadOtherCurrency}
                  onChange={(event) => setUploadOtherCurrency(event.target.value.toUpperCase())}
                  className="pin-field"
                  placeholder={t("desp.otherCurrencyPh")}
                  maxLength={12}
                />
              </label>
            ) : null}
            <div className="flex flex-wrap items-end justify-end gap-3 md:col-span-3">
              <button
                type="button"
                disabled={uploading}
                onClick={resetReceiptForm}
                className="pin-btn-secondary min-h-12 touch-manipulation rounded-full px-6 py-3 text-base md:py-2.5 md:text-sm"
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="min-h-12 touch-manipulation rounded-full px-6 py-3 text-base text-white shadow-md shadow-orange-500/30 ring-1 ring-orange-400/40 transition hover:bg-orange-400 active:scale-[0.98] dark:bg-orange-600 dark:ring-orange-500/35 dark:hover:bg-orange-500 bg-orange-500 md:py-2.5 md:text-sm w-auto"
              >
                {uploading ? t("desp.sending") : t("desp.saveReceipt")}
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
                {t("edit.newClientTitle")}
              </h3>
              <p className="mt-1 text-sm text-pin-muted">{t("edit.newClientLead")}</p>
              <label className="mt-4 flex flex-col gap-1 text-sm font-medium text-pin-muted">
                {t("common.name")}
                <input
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="pin-field pin-field-lg"
                  placeholder={t("edit.newClientPlaceholder")}
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
                  {newClientSaving ? t("common.saving") : t("common.save")}
                </button>
                <button
                  type="button"
                  onClick={closeNewClientModal}
                  className="pin-btn-secondary min-h-12 rounded-xl px-4 py-3 text-sm"
                >
                  {t("common.cancel")}
                </button>
              </div>
            </div>
          </div>
        ) : null}

          </>
        ) : null}
      </div>
    </main>
  );
}

function DespesasSuspenseFallback() {
  const t = useT();
  return (
    <main className="pin-page px-4 pb-8 pt-4 md:p-10">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-medium text-pin-muted">{t("common.loading")}</p>
      </div>
    </main>
  );
}

export default function DespesasPage() {
  return (
    <Suspense fallback={<DespesasSuspenseFallback />}>
      <DespesasPageContent />
    </Suspense>
  );
}
