"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { sameOriginCallbackUrl } from "@/lib/auth-callback-url";
import { useT } from "@/lib/i18n/context";

export default function RegisterPage() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? t("auth.errorGeneric"));
        setPending(false);
        return;
      }

      const sign = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
        callbackUrl: sameOriginCallbackUrl("/"),
      });
      if (!sign?.ok || sign?.error) {
        setError(t("auth.errorCredentials"));
        setPending(false);
        return;
      }
      window.location.href = sign?.url ?? sameOriginCallbackUrl("/");
    } catch {
      setError(t("auth.errorGeneric"));
      setPending(false);
    }
  }

  return (
    <main className="pin-page flex min-h-[70vh] flex-col justify-center px-4 py-10 md:px-10">
      <div className="mx-auto w-full max-w-md">
        <h1 className="pin-hero-title mb-2 text-2xl font-extrabold tracking-tight text-balance md:text-3xl">
          {t("auth.registerTitle")}
        </h1>
        <p className="pin-lead mb-6 text-sm text-pin-muted">{t("auth.registerLead")}</p>
        <form
          onSubmit={(e) => void onSubmit(e)}
          className="pin-card relative space-y-4 p-6 shadow-[0_22px_50px_-14px_rgba(13,148,136,0.18)] ring-2 ring-pin-accent/10 md:p-8 dark:shadow-[0_22px_50px_-14px_rgba(20,184,166,0.12)] dark:ring-teal-400/12"
        >
          <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
            {t("auth.email")}
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pin-field"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-pin-muted">
            {t("auth.password")}
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pin-field"
            />
            <span className="text-xs font-normal text-pin-soft">{t("auth.passwordHint")}</span>
          </label>
          {error ? <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p> : null}
          <button
            type="submit"
            disabled={pending}
            className="pin-btn-primary min-h-12 w-full rounded-xl py-3 text-sm font-semibold"
          >
            {pending ? "…" : t("auth.submitRegister")}
          </button>
          <p className="text-center text-sm text-pin-muted">
            {t("auth.hasAccount")}{" "}
            <Link href="/login" className="font-semibold text-pin-accent underline-offset-2 hover:underline">
              {t("auth.goLogin")}
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
