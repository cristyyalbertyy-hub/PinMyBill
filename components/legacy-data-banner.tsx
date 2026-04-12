"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useT } from "@/lib/i18n/context";

export function LegacyDataBanner() {
  const { status } = useSession();
  const t = useT();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (status !== "authenticated") return;
    try {
      const res = await fetch("/api/account/legacy-status", { credentials: "include" });
      if (!res.ok) return;
      const data = (await res.json()) as { hasLegacy?: boolean };
      setShow(Boolean(data.hasLegacy));
    } catch {
      /* ignore */
    }
  }, [status]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const claim = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/account/claim-legacy", {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        setShow(false);
        setMessage(t("auth.claimDone"));
        void refresh();
      } else {
        setMessage(t("auth.claimFail"));
      }
    } catch {
      setMessage(t("auth.claimFail"));
    } finally {
      setBusy(false);
    }
  };

  if (status !== "authenticated" || !show) {
    return message ? (
      <p className="mt-4 text-center text-sm font-medium text-pin-accent">{message}</p>
    ) : null;
  }

  return (
    <div className="pin-card mt-6 border border-amber-200/80 bg-amber-50/90 p-4 dark:border-amber-800/60 dark:bg-amber-950/40">
      <p className="text-sm font-bold text-amber-950 dark:text-amber-100">{t("auth.legacyBannerTitle")}</p>
      <p className="mt-1 text-sm text-amber-900/90 dark:text-amber-200/90">{t("auth.legacyBannerBody")}</p>
      <button
        type="button"
        disabled={busy}
        onClick={() => void claim()}
        className="mt-3 min-h-11 rounded-full bg-amber-500 px-5 py-2 text-sm font-semibold text-amber-950 shadow-sm transition hover:bg-amber-400 disabled:opacity-60 dark:bg-amber-600 dark:text-amber-50 dark:hover:bg-amber-500"
      >
        {busy ? t("auth.claiming") : t("auth.claimLegacy")}
      </button>
    </div>
  );
}
