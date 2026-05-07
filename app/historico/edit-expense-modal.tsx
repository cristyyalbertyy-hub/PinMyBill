"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { ExpenseTypeCircle } from "@/components/expense-type-circle";
import { useT } from "@/lib/i18n/context";
import { uploadReceiptImage } from "@/lib/receipt-upload";
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
const OTHER_CURRENCY_SENTINEL = "OUTRO";
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
  const t = useT();
  const [type, setType] = useState<ExpenseType>(() => item?.type ?? "empresa");
  const [clientName, setClientName] = useState<string>(
    () => item?.clientName ?? clientNames[0] ?? "",
  );
  const [category, setCategory] = useState<string>(() => item?.category ?? "");
  const [otherCategoryName, setOtherCategoryName] = useState("");
  const [amount, setAmount] = useState<string>(() => String(item?.amount ?? 0));
  const [expenseDate, setExpenseDate] = useState<string>(() => item?.date?.slice(0, 10) ?? "");
  const [currency, setCurrency] = useState<CurrencyCode>(() => {
    const current = (item?.currency ?? "AED").toUpperCase();
    if (currencyOptions.includes(current)) return current;
    return OTHER_CURRENCY_SENTINEL;
  });
  const [otherCurrency, setOtherCurrency] = useState<string>(() => {
    const current = (item?.currency ?? "AED").toUpperCase();
    if (currencyOptions.includes(current)) return "";
    return current;
  });

  const [newClientOpen, setNewClientOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientError, setNewClientError] = useState<string | null>(null);
  const [newClientSaving, setNewClientSaving] = useState(false);

  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  const [removeReceipt, setRemoveReceipt] = useState(false);
  const [receiptUploading, setReceiptUploading] = useState(false);
  const [savePending, setSavePending] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const receiptCameraRef = useRef<HTMLInputElement>(null);
  const receiptGalleryRef = useRef<HTMLInputElement>(null);

  const availableCategories = useMemo(() => {
    const list = categoryOptions[type] ?? [];
    if (category && !list.includes(category)) return [category, ...list];
    return list;
  }, [category, categoryOptions, type]);

  useEffect(() => {
    if (!receiptFile) {
      setReceiptPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(receiptFile);
    setReceiptPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [receiptFile]);

  useEffect(() => {
    if (!open || !item) return;
    setReceiptFile(null);
    setRemoveReceipt(false);
    setReceiptPreviewUrl(null);
    setSavePending(false);
    setSaveError(null);
  }, [open, item?.id]);

  if (!open || !item) return null;
  const currentItem = item;

  const clientsList = clientNames.length ? clientNames : [""];

  async function saveNewClient() {
    const clean = newClientName.trim();
    if (!clean) {
      setNewClientError(t("edit.enterClientName"));
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
        throw new Error(data.error ?? t("edit.createClientFail"));
      }
      const name = data.name ?? clean;
      if (onClientCreated) await onClientCreated();
      setClientName(name);
      setNewClientName("");
      setNewClientOpen(false);
    } catch (e) {
      setNewClientError(e instanceof Error ? e.message : t("edit.createClientError"));
    } finally {
      setNewClientSaving(false);
    }
  }

  function onReceiptFileChange(ev: React.ChangeEvent<HTMLInputElement>) {
    const f = ev.target.files?.[0] ?? null;
    setReceiptFile(f);
    if (f) setRemoveReceipt(false);
    ev.target.value = "";
  }

  function closeNewClientModal() {
    setNewClientOpen(false);
    setNewClientName("");
    setNewClientError(null);
    setNewClientSaving(false);
  }

  async function handleSave() {
    closeNewClientModal();
    setSavePending(true);
    setSaveError(null);

    try {
      const parsed = Number(amount);
      const safeAmount = Number.isNaN(parsed) ? 0 : parsed;

      let finalCategory = category;
      if (category === OTHER_CATEGORY_SENTINEL) {
        const other = otherCategoryName.trim();
        if (!other) throw new Error(t("edit.enterOtherCategory"));

        const createCatRes = await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scope: type, name: other }),
        });

        if (!createCatRes.ok) {
          throw new Error(t("edit.createOtherCatFail"));
        }

        const createdCat = (await createCatRes.json()) as { name: string };
        finalCategory = createdCat.name;
        setCategory(createdCat.name);
        setOtherCategoryName("");

        if (onCategoryCreated) await onCategoryCreated();
      }

      if (currency === OTHER_CURRENCY_SENTINEL && !otherCurrency.trim()) {
        throw new Error(t("edit.enterOtherCurrency"));
      }

      if (!expenseDate.trim()) {
        throw new Error(t("edit.enterDate"));
      }

      let receiptImageUrl: string | null | undefined = undefined;
      if (removeReceipt) {
        receiptImageUrl = null;
      } else if (receiptFile) {
        setReceiptUploading(true);
        try {
          receiptImageUrl = await uploadReceiptImage(receiptFile);
        } finally {
          setReceiptUploading(false);
        }
      }

      const updates: Record<string, unknown> = {
        type,
        amount: safeAmount,
        currency: currency === OTHER_CURRENCY_SENTINEL ? otherCurrency.trim().toUpperCase() : currency,
        category: finalCategory,
        clientName: type === "cliente" ? clientName : null,
        date: expenseDate,
      };
      if (receiptImageUrl !== undefined) updates.receiptImageUrl = receiptImageUrl;

      await onSave(currentItem.id, updates);
      onClose();
    } catch (error) {
      console.error("Falha ao guardar alteracoes:", error);
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : error && typeof error === "object" && "message" in error
              ? String((error as { message: unknown }).message)
              : t("edit.saveChangesFail");
      setSaveError(message);
    } finally {
      setSavePending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center overflow-y-auto bg-stone-900/45 p-2 backdrop-blur-[2px] md:items-center md:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t("edit.title")}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="pin-card flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl border-t-4 border-t-pin-accent p-4 shadow-2xl md:rounded-2xl md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-pin-ink">{t("edit.title")}</h2>
            <p className="mt-1 text-sm text-pin-muted">
              {item.merchant} · {item.id}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="pin-btn-secondary min-h-10 rounded-xl px-3 py-2 text-sm"
          >
            {t("common.close")}
          </button>
        </div>

        <div className="mt-4 grid flex-1 gap-3 overflow-y-auto pr-1">
          <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
            <span className="inline-flex items-center gap-2">
              {t("common.type")}
              <ExpenseTypeCircle type={type} size="sm" />
            </span>
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
              <option value="cliente">{t("type.cliente")}</option>
              <option value="empresa">{t("type.empresa")}</option>
              <option value="pessoal">{t("type.pessoal")}</option>
            </select>
          </label>

          {type === "cliente" ? (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-end gap-2">
                <label className="flex min-w-[min(100%,14rem)] flex-1 flex-col gap-1 text-sm font-medium text-pin-muted">
                  {t("common.client")}
                  <select
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="pin-field pin-field-lg"
                  >
                    {clientsList.map((c) => (
                      <option key={c || "empty"} value={c}>
                        {c || t("edit.noClientsOption")}
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
                  className="min-h-12 shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/30 ring-1 ring-orange-400/40 transition touch-manipulation hover:bg-orange-400 active:scale-[0.98] dark:bg-orange-600 dark:ring-orange-500/35 dark:hover:bg-orange-500 bg-orange-500"
                >
                  {t("common.newClient")}
                </button>
              </div>
            </div>
          ) : null}

          <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
            {t("common.date")}
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="pin-field pin-field-lg"
              max="2099-12-31"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
            {t("common.category")}
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
              <option value={OTHER_CATEGORY_SENTINEL}>{t("common.other")}</option>
            </select>
          </label>

          {category === OTHER_CATEGORY_SENTINEL ? (
            <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
              {t("desp.otherCategory")}
              <input
                value={otherCategoryName}
                onChange={(e) => setOtherCategoryName(e.target.value)}
                className="pin-field pin-field-lg"
                placeholder={t("edit.otherCategoryPh")}
              />
            </label>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
              {t("common.currency")}
              <select
                value={currency}
                onChange={(e) => {
                  const value = e.target.value as CurrencyCode;
                  setCurrency(value);
                  if (value !== OTHER_CURRENCY_SENTINEL) {
                    setOtherCurrency("");
                  }
                }}
                className="pin-field pin-field-lg"
              >
                {currencyOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            {currency === OTHER_CURRENCY_SENTINEL ? (
              <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
                {t("desp.otherCurrency")}
                <input
                  value={otherCurrency}
                  onChange={(e) => setOtherCurrency(e.target.value.toUpperCase())}
                  className="pin-field pin-field-lg"
                  placeholder={t("desp.otherCurrencyPh")}
                  maxLength={12}
                />
              </label>
            ) : null}
            <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
              {t("common.amount")}
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

          <div className="border-t border-stone-200/80 pt-4 dark:border-stone-700">
            <p className="text-sm font-medium text-pin-muted">{t("common.photo")}</p>
            <p className="mt-1 text-xs text-pin-soft">{t("edit.receiptImageLead")}</p>
            <input
              ref={receiptCameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={onReceiptFileChange}
            />
            <input
              ref={receiptGalleryRef}
              type="file"
              accept="image/*"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={onReceiptFileChange}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => receiptCameraRef.current?.click()}
                className="pin-btn-primary min-h-10 rounded-xl px-3 py-2 text-sm"
              >
                {t("common.takePhoto")}
              </button>
              <button
                type="button"
                onClick={() => receiptGalleryRef.current?.click()}
                className="pin-btn-secondary min-h-10 rounded-xl px-3 py-2 text-sm"
              >
                {t("common.uploadImage")}
              </button>
              {(currentItem.receiptImageUrl || receiptFile) && !removeReceipt ? (
                <button
                  type="button"
                  onClick={() => {
                    if (!globalThis.confirm(t("confirm.removeReceipt"))) {
                      return;
                    }
                    setRemoveReceipt(true);
                    setReceiptFile(null);
                  }}
                  className="min-h-10 rounded-xl px-3 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-50 dark:text-red-300 dark:ring-red-900 dark:hover:bg-red-950/40"
                >
                  {t("edit.removeImage")}
                </button>
              ) : null}
              {removeReceipt ? (
                <button
                  type="button"
                  onClick={() => setRemoveReceipt(false)}
                  className="pin-btn-secondary min-h-10 rounded-xl px-3 py-2 text-sm"
                >
                  {t("edit.undoRemove")}
                </button>
              ) : null}
            </div>
            <div className="mt-3">
              {receiptPreviewUrl ? (
                <img
                  src={receiptPreviewUrl}
                  alt=""
                  className="max-h-40 max-w-[12rem] rounded-lg object-contain ring-1 ring-stone-200 dark:ring-stone-600"
                />
              ) : !removeReceipt && currentItem.receiptImageUrl ? (
                <Image
                  src={currentItem.receiptImageUrl}
                  alt=""
                  width={160}
                  height={160}
                  className="max-h-40 w-auto rounded-lg object-contain ring-1 ring-stone-200 dark:ring-stone-600"
                />
              ) : (
                <p className="text-sm text-pin-soft">{t("edit.noImage")}</p>
              )}
            </div>
          </div>
        </div>

        {saveError ? (
          <p className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">{saveError}</p>
        ) : null}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={receiptUploading || savePending}
            className="pin-btn-primary min-h-12 flex-1 rounded-xl px-4 py-3 text-sm disabled:opacity-60"
          >
            {receiptUploading
              ? t("edit.saveUploading")
              : savePending
                ? t("edit.saving")
                : t("common.save")}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={savePending}
            className="pin-btn-secondary min-h-12 rounded-xl px-4 py-3 text-sm disabled:opacity-60"
          >
            {t("common.cancel")}
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
      </div>
    </div>
  );
}

