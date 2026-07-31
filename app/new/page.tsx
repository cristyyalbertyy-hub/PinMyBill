"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BankAccountFields } from "@/components/bank-account-fields";
import { TopNav } from "@/components/top-nav";
import { emptyBank, EMPTY_BANK, sanitizeExtraBanks } from "@/lib/bank-utils";
import { useT } from "@/lib/i18n/context";
import { mergeProjectDefaults } from "@/lib/project-defaults";
import { useProject } from "@/lib/project-context";
import type { ClientDetail } from "@/lib/profile-types";
import type { InvoiceBankDetails } from "@/lib/invoice-types";

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function NewProjectPage() {
  const t = useT();
  const { ready: projectReady, profile, setActiveProject, refreshProjects } = useProject();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const [clientName, setClientName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [startDate, setStartDate] = useState(todayIso());
  const [projectDirector, setProjectDirector] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  const [fromName, setFromName] = useState("");
  const [fromAddress, setFromAddress] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromPhone, setFromPhone] = useState("");
  const [bank, setBank] = useState<InvoiceBankDetails>({ ...EMPTY_BANK });
  const [extraBanks, setExtraBanks] = useState<InvoiceBankDetails[]>([]);

  const hasDefaults = Boolean(fromName || bank.iban || bank.accountName || extraBanks.length > 0);

  const fillProfileDefaults = useCallback(() => {
    const defaults = mergeProjectDefaults(null, profile);
    setProjectName("");
    setClientName("");
    setStartDate(todayIso());
    setProjectDirector(defaults.projectDirector);
    setClientAddress("");
    setClientEmail("");
    setClientPhone("");
    setFromName(defaults.fromName);
    setFromAddress(defaults.fromAddress);
    setFromEmail(defaults.fromEmail);
    setFromPhone(defaults.fromPhone);
    setBank({ ...EMPTY_BANK, ...defaults.bank });
    setExtraBanks(defaults.extraBanks.map((item) => ({ ...EMPTY_BANK, ...item })));
  }, [profile]);

  useEffect(() => {
    if (!projectReady || initialized) return;
    fillProfileDefaults();
    setInitialized(true);
  }, [fillProfileDefaults, initialized, projectReady]);

  function updateExtraBank(index: number, value: InvoiceBankDetails) {
    setExtraBanks((prev) => prev.map((item, i) => (i === index ? value : item)));
  }

  function removeExtraBank(index: number) {
    setExtraBanks((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientName.trim() || !projectName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const savedExtras = sanitizeExtraBanks(extraBanks);
      const clientPayload = {
        name: clientName.trim(),
        projectName: projectName.trim(),
        startDate,
        projectDirector: projectDirector.trim() || fromName.trim(),
        address: clientAddress.trim() || null,
        email: clientEmail.trim() || null,
        phone: clientPhone.trim() || null,
        fromName,
        fromAddress,
        fromEmail,
        fromPhone,
        bank,
        extraBanks: savedExtras,
      };

      await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromName,
          fromAddress,
          fromEmail,
          fromPhone,
          projectDirector,
          bank,
          extraBanks: savedExtras,
        }),
      });

      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clientPayload),
      });
      if (!res.ok) throw new Error("client");
      const created = (await res.json()) as ClientDetail;

      await setActiveProject(created.id);
      await refreshProjects();
      setSaved(true);
    } catch {
      setError(t("new.saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="pin-page px-4 pb-8 pt-4 md:p-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-pin-ink md:text-4xl">
          {t("new.title")}
        </h1>
        <p className="mb-6 text-sm text-pin-muted md:mb-8">{t("new.lead")}</p>

        <TopNav />

        {!projectReady ? (
          <p className="text-sm text-pin-muted">{t("common.loading")}</p>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="grid gap-4">
            {hasDefaults ? (
              <p className="rounded-xl bg-pin-teal-soft/60 px-4 py-3 text-sm text-pin-muted dark:bg-teal-950/30">
                {t("new.savedDefaults")}
              </p>
            ) : null}

            {saved ? (
              <div className="rounded-xl bg-emerald-50 px-4 py-4 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:ring-emerald-800">
                <p className="font-semibold text-emerald-900 dark:text-emerald-100">
                  {t("new.saveSuccess")}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/despesas?client=${encodeURIComponent(clientName.trim())}`}
                    className="pin-btn-primary inline-flex min-h-10 items-center rounded-xl px-4 py-2 text-sm font-semibold no-underline"
                  >
                    {t("new.continueReceipt")}
                  </Link>
                  <Link
                    href={`/timesheet?client=${encodeURIComponent(clientName.trim())}`}
                    className="inline-flex min-h-10 items-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-pin-ink ring-1 ring-stone-200 transition hover:bg-pin-teal-soft dark:bg-stone-900 dark:ring-stone-700 no-underline"
                  >
                    {t("new.continueTimesheet")}
                  </Link>
                </div>
              </div>
            ) : null}

            {error ? (
              <p className="rounded-xl bg-pin-warm-soft px-4 py-3 text-sm font-medium text-amber-950 ring-1 ring-amber-200/80 dark:bg-amber-950/30 dark:text-amber-100">
                {error}
              </p>
            ) : null}

            <section className="pin-card p-4 md:p-6">
              <h2 className="text-lg font-bold text-pin-ink">{t("new.projectSection")}</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted sm:col-span-2">
                  {t("new.projectName")}
                  <input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="pin-field"
                    required
                  />
                </label>
              </div>
            </section>

            <section className="pin-card p-4 md:p-6">
              <h2 className="text-lg font-bold text-pin-ink">{t("new.clientSection")}</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted sm:col-span-2">
                  {t("new.clientName")}
                  <input
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="pin-field"
                    required
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
                  {t("new.startDate")}
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="pin-field"
                    required
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
                  {t("new.projectDirector")}
                  <input
                    value={projectDirector}
                    onChange={(e) => setProjectDirector(e.target.value)}
                    className="pin-field"
                    placeholder={fromName}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted sm:col-span-2">
                  {t("new.clientAddress")}
                  <textarea
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    className="pin-field min-h-[3.5rem] resize-y"
                    rows={2}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
                  {t("new.clientEmail")}
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="pin-field"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
                  {t("new.clientPhone")}
                  <input
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="pin-field"
                  />
                </label>
              </div>
            </section>

            <section className="pin-card p-4 md:p-6">
              <h2 className="text-lg font-bold text-pin-ink">{t("new.yourSection")}</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted sm:col-span-2">
                  {t("new.yourName")}
                  <input
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    className="pin-field"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
                  {t("new.yourEmail")}
                  <input
                    type="email"
                    value={fromEmail}
                    onChange={(e) => setFromEmail(e.target.value)}
                    className="pin-field"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
                  {t("new.yourPhone")}
                  <input
                    type="tel"
                    value={fromPhone}
                    onChange={(e) => setFromPhone(e.target.value)}
                    className="pin-field"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted sm:col-span-2">
                  {t("new.yourAddress")}
                  <textarea
                    value={fromAddress}
                    onChange={(e) => setFromAddress(e.target.value)}
                    className="pin-field min-h-[3.5rem] resize-y"
                    rows={2}
                  />
                </label>
              </div>
            </section>

            <section className="pin-card p-4 md:p-6">
              <h2 className="text-lg font-bold text-pin-ink">{t("new.bankSection")}</h2>
              <div className="mt-3 grid gap-3">
                <BankAccountFields
                  bank={bank}
                  onChange={setBank}
                  title={t("new.bankPrimary")}
                />
                {extraBanks.map((extra, index) => (
                  <BankAccountFields
                    key={`extra-bank-${index}`}
                    bank={extra}
                    onChange={(value) => updateExtraBank(index, value)}
                    title={t("new.bankAlternative", { n: String(index + 2) })}
                    onRemove={() => removeExtraBank(index)}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => setExtraBanks((prev) => [...prev, emptyBank()])}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-pin-ink ring-1 ring-stone-200 transition hover:bg-pin-teal-soft dark:bg-stone-900 dark:ring-stone-700"
                >
                  <span aria-hidden>＋</span>
                  {t("new.addBankAccount")}
                </button>
              </div>
            </section>

            <button
              type="submit"
              disabled={saving}
              className="pin-btn-primary min-h-12 w-full rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-60 sm:w-auto"
            >
              {saving ? t("common.saving") : t("common.save")}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
