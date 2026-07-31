"use client";

import type { InvoiceBankDetails } from "@/lib/invoice-types";
import { useT } from "@/lib/i18n/context";

type Props = {
  bank: InvoiceBankDetails;
  onChange: (bank: InvoiceBankDetails) => void;
  title?: string;
  onRemove?: () => void;
};

export function BankAccountFields({ bank, onChange, title, onRemove }: Props) {
  const t = useT();

  function update(field: keyof InvoiceBankDetails, value: string) {
    onChange({ ...bank, [field]: value });
  }

  return (
    <div className="rounded-xl bg-stone-50/80 p-3 ring-1 ring-stone-200/80 dark:bg-stone-900/40 dark:ring-stone-700">
      <div className="mb-3 flex items-center justify-between gap-2">
        {title ? <p className="text-sm font-semibold text-pin-ink">{title}</p> : <span />}
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs font-semibold text-pin-muted transition hover:text-pin-warm"
          >
            {t("common.remove")}
          </button>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted sm:col-span-2">
          {t("invoice.bankAccountName")}
          <input
            value={bank.accountName}
            onChange={(e) => update("accountName", e.target.value)}
            className="pin-field"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
          {t("invoice.bankName")}
          <input
            value={bank.bankName}
            onChange={(e) => update("bankName", e.target.value)}
            className="pin-field"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
          {t("invoice.bankAccountNo")}
          <input
            value={bank.accountNo}
            onChange={(e) => update("accountNo", e.target.value)}
            className="pin-field"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted sm:col-span-2">
          {t("invoice.bankIban")}
          <input
            value={bank.iban}
            onChange={(e) => update("iban", e.target.value)}
            className="pin-field"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
          {t("invoice.bankSwift")}
          <input
            value={bank.swift}
            onChange={(e) => update("swift", e.target.value)}
            className="pin-field"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
          {t("invoice.bankCurrency")}
          <input
            value={bank.currency}
            onChange={(e) => update("currency", e.target.value.toUpperCase())}
            className="pin-field"
            maxLength={12}
          />
        </label>
      </div>
    </div>
  );
}
