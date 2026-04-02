"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Cropper, { type Area } from "react-easy-crop";
import { ExpenseTypeCircle } from "@/components/expense-type-circle";
import { uploadReceiptImage } from "@/lib/receipt-upload";
import { TopNav } from "@/components/top-nav";
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

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao ler imagem para recorte."));
    img.src = src;
  });
}

async function buildCroppedFile(
  sourceUrl: string,
  area: Area,
  fileNameBase: string,
): Promise<File> {
  const image = await loadImage(sourceUrl);
  const canvas = document.createElement("canvas");
  const width = Math.max(1, Math.round(area.width));
  const height = Math.max(1, Math.round(area.height));
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Falha ao inicializar canvas.");

  ctx.drawImage(
    image,
    Math.round(area.x),
    Math.round(area.y),
    width,
    height,
    0,
    0,
    width,
    height,
  );

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
  if (!blob) throw new Error("Falha ao criar imagem recortada.");

  const safeBase = fileNameBase.replace(/\.[^/.]+$/, "");
  return new File([blob], `${safeBase}-recorte.jpg`, { type: "image/jpeg" });
}

function DespesasPageContent() {
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
  const [uploadType, setUploadType] = useState<ExpenseType>("empresa");
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
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSourceUrl, setCropSourceUrl] = useState<string | null>(null);
  const [cropSourceName, setCropSourceName] = useState("recibo");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1.2);
  const [cropAreaPixels, setCropAreaPixels] = useState<Area | null>(null);
  const [cropSaving, setCropSaving] = useState(false);
  const [cropError, setCropError] = useState<string | null>(null);

  const [newClientOpen, setNewClientOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientError, setNewClientError] = useState<string | null>(null);
  const [newClientSaving, setNewClientSaving] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const quickCameraTriggeredRef = useRef(false);
  const cropObjectUrlRef = useRef<string | null>(null);
  const cropAreaPixelsRef = useRef<Area | null>(null);
  const uploadPreviewUrlRef = useRef<string | null>(null);

  const openCropForFile = useCallback((file: File | null) => {
    if (!file) return;
    if (cropObjectUrlRef.current) {
      URL.revokeObjectURL(cropObjectUrlRef.current);
      cropObjectUrlRef.current = null;
    }
    const nextUrl = URL.createObjectURL(file);
    cropObjectUrlRef.current = nextUrl;
    setCropSourceUrl(nextUrl);
    setCropSourceName(file.name || "recibo");
    setCrop({ x: 0, y: 0 });
    setZoom(1.2);
    setCropAreaPixels(null);
    cropAreaPixelsRef.current = null;
    setCropError(null);
    setCropOpen(true);
  }, []);

  const closeCropModal = useCallback(() => {
    setCropOpen(false);
    setCropError(null);
    setCropSaving(false);
    setZoom(1.2);
    setCropAreaPixels(null);
    cropAreaPixelsRef.current = null;
    if (cropObjectUrlRef.current) {
      URL.revokeObjectURL(cropObjectUrlRef.current);
      cropObjectUrlRef.current = null;
    }
    setCropSourceUrl(null);
  }, []);

  function handleCameraImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    openCropForFile(file);
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  }

  function handleGalleryImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    openCropForFile(file);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }

  async function applyCrop() {
    const finalArea = cropAreaPixelsRef.current ?? cropAreaPixels;
    if (!cropSourceUrl || !finalArea) {
      setCropError("Ajusta a foto (com zoom) para recortar a fatura.");
      return;
    }
    setCropSaving(true);
    setCropError(null);
    try {
      const cropped = await buildCroppedFile(cropSourceUrl, finalArea, cropSourceName);
      setUploadFile(cropped);
      closeCropModal();
    } catch (e) {
      setCropError(e instanceof Error ? e.message : "Falha ao recortar imagem.");
      setCropSaving(false);
    }
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
      cameraInputRef.current?.click();
    }, 120);
    return () => clearTimeout(timer);
  }, [ready, searchParams]);

  useEffect(
    () => () => {
      if (cropObjectUrlRef.current) URL.revokeObjectURL(cropObjectUrlRef.current);
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
        <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-pin-ink md:text-4xl">Despesas</h1>
        <p className="pin-lead mb-8 text-base">
          Podes guardar com ou sem foto; sem imagem, indica comerciante ou descricao. Mais tarde podes
          acrescentar a foto em <strong className="text-pin-ink">Historico</strong> (Modificar).
        </p>

        <TopNav />

        {dbHealth ? (
          <div className="mt-4 flex justify-end">
            <p className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-pin-teal-soft/65 px-3 py-1 text-[11px] font-semibold text-pin-muted ring-1 ring-teal-200/70 dark:bg-teal-950/25 dark:ring-teal-800/60">
              <span aria-hidden>●</span>
              <span>DB:</span>
              <strong className="text-pin-ink">
                {dbHealth.db?.provider === "neon"
                  ? "Neon"
                  : dbHealth.db?.provider === "local"
                    ? "localhost"
                    : dbHealth.db?.provider === "missing"
                      ? "em falta"
                      : "remota"}
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
                <div className="space-y-2">
                  <p className="text-sm text-pin-muted">
                    Ficheiro: <span className="font-medium text-pin-ink">{uploadFile.name}</span>
                  </p>
                  {uploadPreviewUrl ? (
                    <div className="max-w-[14rem] overflow-hidden rounded-xl border border-stone-200/80 bg-white/80 p-1 shadow-sm dark:border-stone-700 dark:bg-stone-900/60">
                      <img
                        src={uploadPreviewUrl}
                        alt="Pre-visualizacao da imagem recortada"
                        className="h-auto w-full rounded-lg object-contain"
                      />
                    </div>
                  ) : null}
                  {uploadPreviewUrl ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openCropForFile(uploadFile)}
                        className="pin-btn-secondary min-h-10 rounded-xl px-3 py-2 text-sm"
                        aria-label="Recortar de novo a imagem"
                      >
                        Recortar de novo
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (cropOpen) closeCropModal();
                          setUploadFile(null);
                          setUploadError(null);
                        }}
                        className="pin-btn-secondary min-h-10 rounded-xl px-3 py-2 text-sm"
                        aria-label="Limpar a imagem do recibo"
                      >
                        Limpar imagem
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-pin-soft">
                  Nenhuma imagem ainda — podes guardar mesmo assim (preenche comerciante abaixo).
                </p>
              )}
            </div>
            <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
              Data do recibo
              <input
                type="date"
                value={uploadDate}
                onChange={(event) => setUploadDate(event.target.value)}
                className="pin-field"
                max="2099-12-31"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted md:col-span-2">
              Comerciante ou descricao
              <input
                value={uploadMerchant}
                onChange={(event) => setUploadMerchant(event.target.value)}
                className="pin-field pin-field-orange-focus"
                placeholder={
                  uploadFile
                    ? "Opcional se tiveres imagem (usa o nome do ficheiro se vazio)"
                    : "Obrigatorio sem imagem de recibo"
                }
                autoComplete="off"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
              <span className="inline-flex items-center gap-2">
                Tipo
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
                    className="pin-btn-primary min-h-12 shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold touch-manipulation active:scale-[0.98]"
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
                <option value={OTHER_CURRENCY_SENTINEL}>Outra...</option>
              </select>
            </label>
            {uploadCurrency === OTHER_CURRENCY_SENTINEL ? (
              <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
                Outra moeda
                <input
                  value={uploadOtherCurrency}
                  onChange={(event) => setUploadOtherCurrency(event.target.value.toUpperCase())}
                  className="pin-field"
                  placeholder="Ex: BRL"
                  maxLength={12}
                />
              </label>
            ) : null}
            <div className="flex items-end justify-end md:col-span-3">
              <button
                type="submit"
                disabled={uploading}
                className="min-h-12 touch-manipulation rounded-full px-6 py-3 text-base text-white shadow-md shadow-orange-500/30 ring-1 ring-orange-400/40 transition hover:bg-orange-400 active:scale-[0.98] dark:bg-orange-600 dark:ring-orange-500/35 dark:hover:bg-orange-500 bg-orange-500 md:py-2.5 md:text-sm w-auto"
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

        {cropOpen && cropSourceUrl ? (
          <div
            className="fixed inset-0 z-[75] flex items-end justify-center bg-stone-900/60 backdrop-blur-[2px] md:items-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="crop-title"
          >
            <div className="pin-card w-full max-w-2xl rounded-t-3xl border-t-4 border-t-pin-warm p-4 shadow-2xl md:rounded-2xl md:p-6">
              <h3 id="crop-title" className="text-lg font-bold text-pin-ink">
                Ajustar foto da fatura
              </h3>
              <p className="mt-1 text-sm text-pin-muted">
                Move e aproxima (zoom) para ficar apenas com a fatura no enquadramento.
              </p>
              <div className="relative mt-4 h-[50vh] min-h-[18rem] overflow-hidden rounded-2xl bg-stone-900">
                <Cropper
                  image={cropSourceUrl}
                  crop={crop}
                  zoom={zoom}
                  aspect={3 / 4}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_, areaPixels) => {
                    setCropAreaPixels(areaPixels);
                    cropAreaPixelsRef.current = areaPixels;
                  }}
                  showGrid={false}
                  objectFit="contain"
                />
              </div>
              <label className="mt-4 flex flex-col gap-2 text-sm font-medium text-pin-muted">
                Zoom
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                />
                <span className="text-xs text-pin-soft">Dica: para trim real, usa zoom acima de 1.0.</span>
              </label>
              {cropError ? (
                <p className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">{cropError}</p>
              ) : null}
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={cropSaving}
                  onClick={() => void applyCrop()}
                  className="pin-btn-primary min-h-12 flex-1 rounded-xl px-4 py-3 text-sm"
                >
                  {cropSaving ? "A recortar..." : "Usar recorte"}
                </button>
                <button
                  type="button"
                  disabled={cropSaving}
                  onClick={closeCropModal}
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

export default function DespesasPage() {
  return (
    <Suspense
      fallback={
        <main className="pin-page px-4 pb-8 pt-4 md:p-10">
          <div className="mx-auto max-w-5xl">
            <p className="text-sm font-medium text-pin-muted">A carregar...</p>
          </div>
        </main>
      }
    >
      <DespesasPageContent />
    </Suspense>
  );
}
