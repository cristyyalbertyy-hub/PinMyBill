"use client";

import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Suspense, useState } from "react";
import { sameOriginCallbackUrl } from "@/lib/auth-callback-url";
import { useT } from "@/lib/i18n/context";

function LoginForm() {
  const t = useT();
  const searchParams = useSearchParams();
  const callbackUrl = sameOriginCallbackUrl(searchParams.get("callbackUrl") ?? "/");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
        callbackUrl,
      });
      if (!res?.ok || res?.error) {
        setError(t("auth.errorCredentials"));
        setPending(false);
        return;
      }
      window.location.href = res?.url ?? callbackUrl;
    } catch {
      setError(t("auth.errorGeneric"));
      setPending(false);
    }
  }

  return (
    <main className="pin-page flex min-h-[70vh] flex-col justify-center px-4 py-10 md:px-10">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-4 flex justify-center">
          <div className="relative aspect-[264/119] w-[160px]">
            <Image
              src="/brand/prologue.png"
              alt="Prologue"
              fill
              priority
              className="object-contain drop-shadow-sm"
            />
          </div>
        </div>
        <h1 className="pin-hero-title mb-2 text-2xl font-extrabold tracking-tight text-balance md:text-3xl">
          {t("auth.loginTitle")}
        </h1>
        <p className="pin-lead mb-6 text-sm text-pin-muted">{t("auth.loginLead")}</p>
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
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pin-field"
            />
          </label>
          {error ? <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p> : null}
          <button
            type="submit"
            disabled={pending}
            className="pin-btn-primary min-h-12 w-full rounded-xl py-3 text-sm font-semibold"
          >
            {pending ? "…" : t("auth.submitLogin")}
          </button>
          <p className="text-center text-sm text-pin-muted">
            {t("auth.noAccount")}{" "}
            <Link href="/register" className="font-semibold text-pin-accent underline-offset-2 hover:underline">
              {t("auth.goRegister")}
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="pin-page px-4 py-10">
          <div className="mx-auto max-w-md animate-pulse text-pin-muted">…</div>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
