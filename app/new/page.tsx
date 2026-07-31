"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TopNav } from "@/components/top-nav";
import { useT } from "@/lib/i18n/context";
import type { ClientDetail } from "@/lib/profile-types";
import type { InvoiceBankDetails } from "@/lib/invoice-types";

const EMPTY_BANK: InvoiceBankDetails = {
  accountName: "",
  bankName: "",
  accountNo: "",
  iban: "",
  swift: "",
  currency: "",
};

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function NewProjectPage() {
  const t = useT();
  const [ready, setReady] = useState(false);
  const [hasDefaults, setHasDefaults] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingClients, setExistingClients] = useState<ClientDetail[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");

  const [clientName, setClientName] = useState("");
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

  useEffect(() => {
    void Promise.all([fetch("/api/account/profile"), fetch("/api/clients")])
      .then(async ([pr, cl]) => {
        if (pr.ok) {
          const profile = (await pr.json()) as {
            fromName: string;
            fromAddress: string;
            fromEmail: string;
            fromPhone: string;
            projectDirector: string;
            bank: InvoiceBankDetails;
          };
          setFromName(profile.fromName);
          setFromAddress(profile.fromAddress);
          setFromEmail(profile.fromEmail);
          setFromPhone(profile.fromPhone);
          setProjectDirector(profile.projectDirector || profile.fromName);
          setBank({ ...EMPTY_BANK, ...profile.bank });
          const filled =
            Boolean(profile.fromName) ||
            Boolean(profile.bank.iban) ||
            Boolean(profile.bank.accountName);
          setHasDefaults(filled);
        }
        if (cl.ok) {
          const clients = (await cl.json()) as ClientDetail[];
          setExistingClients(clients);
        }
      })
      .finally(() => setReady(true));
  }, []);

  function loadClient(id: string) {
    setSelectedClientId(id);
    if (!id) return;
    const client = existingClients.find((c) => c.id === id);
    if (!client) return;
    setClientName(client.name);
    setStartDate(client.startDate ?? todayIso());
    setProjectDirector(client.projectDirector ?? projectDirector);
    setClientAddress(client.address ?? "");
    setClientEmail(client.email ?? "");
    setClientPhone(client.phone ?? "");
  }

  function updateBank(field: keyof InvoiceBankDetails, value: string) {
    setBank((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientName.trim()) return;
    setSaving(true);
    setError(null);
    try {
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
        }),
      });

      const payload = {
        name: clientName.trim(),
        startDate,
        projectDirector: projectDirector.trim() || fromName.trim(),
        address: clientAddress.trim() || null,
        email: clientEmail.trim() || null,
        phone: clientPhone.trim() || null,
      };

      if (selectedClientId) {
        const res = await fetch(`/api/clients/${selectedClientId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("client");
      } else {
        const res = await fetch("/api/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("client");
      }

      setSaved(true);
      setHasDefaults(true);
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

        {!ready ? (
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
              <h2 className="text-lg font-bold text-pin-ink">{t("new.clientSection")}</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {existingClients.length > 0 ? (
                  <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted sm:col-span-2">
                    {t("common.client")}
                    <select
                      value={selectedClientId}
                      onChange={(e) => loadClient(e.target.value)}
                      className="pin-field"
                    >
                      <option value="">{t("common.newClient")}</option>
                      {existingClients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
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
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted sm:col-span-2">
                  {t("invoice.bankAccountName")}
                  <input
                    value={bank.accountName}
                    onChange={(e) => updateBank("accountName", e.target.value)}
                    className="pin-field"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
                  {t("invoice.bankName")}
                  <input
                    value={bank.bankName}
                    onChange={(e) => updateBank("bankName", e.target.value)}
                    className="pin-field"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
                  {t("invoice.bankAccountNo")}
                  <input
                    value={bank.accountNo}
                    onChange={(e) => updateBank("accountNo", e.target.value)}
                    className="pin-field"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted sm:col-span-2">
                  {t("invoice.bankIban")}
                  <input
                    value={bank.iban}
                    onChange={(e) => updateBank("iban", e.target.value)}
                    className="pin-field"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
                  {t("invoice.bankSwift")}
                  <input
                    value={bank.swift}
                    onChange={(e) => updateBank("swift", e.target.value)}
                    className="pin-field"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
                  {t("invoice.bankCurrency")}
                  <input
                    value={bank.currency}
                    onChange={(e) => updateBank("currency", e.target.value.toUpperCase())}
                    className="pin-field"
                    maxLength={12}
                  />
                </label>
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
