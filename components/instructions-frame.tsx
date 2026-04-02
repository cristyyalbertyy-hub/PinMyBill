"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { useT } from "@/lib/i18n/context";

function InstructionsBody() {
  const t = useT();

  return (
    <div className="space-y-5 text-sm leading-relaxed text-pin-muted">
      <section>
        <h3 className="mb-2 font-bold text-pin-ink">{t("instructions.newReceiptTitle")}</h3>
        <p>{t("instructions.newReceiptBody")}</p>
      </section>
      <section>
        <h3 className="mb-2 font-bold text-pin-ink">{t("instructions.historyTitle")}</h3>
        <p>{t("instructions.historyBody")}</p>
      </section>
      <section>
        <h3 className="mb-2 font-bold text-pin-ink">{t("instructions.catTitle")}</h3>
        <p>
          {t("instructions.catBody")}
        </p>
      </section>
      <section>
        <h3 className="mb-2 font-bold text-pin-ink">{t("instructions.exportTitle")}</h3>
        <p>{t("instructions.exportBody")}</p>
      </section>
    </div>
  );
}

export function InstructionsFrame({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const t = useT();

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", onKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [open, onKeyDown]);

  return (
    <>
      {children}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="pin-btn-secondary fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] right-4 z-[60] flex h-12 w-12 items-center justify-center rounded-full border text-lg font-bold shadow-lg touch-manipulation transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-xl motion-reduce:hover:translate-y-0 active:scale-95 md:bottom-6"
        aria-label={t("instructions.btnAria")}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        ?
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center p-3 sm:items-center sm:p-6"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-label={t("instructions.close")}
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 max-h-[min(88vh,36rem)] w-full max-w-lg overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl ring-1 ring-stone-200/60 dark:border-stone-700 dark:bg-stone-900 dark:ring-stone-600/40"
          >
            <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3 dark:border-stone-700">
              <h2 id={titleId} className="text-lg font-bold text-pin-ink">
                {t("instructions.title")}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-1.5 text-sm font-semibold text-pin-muted transition-colors duration-200 hover:bg-pin-teal-soft hover:text-pin-ink active:scale-[0.98]"
              >
                {t("instructions.close")}
              </button>
            </div>
            <div className="max-h-[min(75vh,30rem)] overflow-y-auto px-4 py-4">
              <InstructionsBody />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
