"use client";

import { useEffect, useId, useState } from "react";
import type { ClientDetail } from "@/lib/profile-types";
import { useT } from "@/lib/i18n/context";
import { projectDisplayName } from "@/lib/project-label";

type ProjectDeleteModalProps = {
  project: ClientDetail;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
};

export function ProjectDeleteModal({
  project,
  busy,
  onClose,
  onConfirm,
}: ProjectDeleteModalProps) {
  const t = useT();
  const titleId = useId();
  const name = projectDisplayName(project);
  const [typed, setTyped] = useState("");
  const matches = typed.trim() === name;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [busy, onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center overflow-y-auto bg-stone-900/50 p-2 backdrop-blur-[2px] md:items-center md:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="pin-card w-full max-w-md rounded-t-3xl border-t-4 border-t-red-500 p-5 shadow-2xl md:rounded-2xl md:p-6">
        <h2 id={titleId} className="text-lg font-bold text-pin-ink">
          {t("project.deleteTitle")}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-pin-muted">{t("project.deleteWarning")}</p>
        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-800 ring-1 ring-red-200/80 dark:bg-red-950/40 dark:text-red-100 dark:ring-red-900/60">
          {name}
        </p>
        <label className="mt-4 flex flex-col gap-1.5 text-sm font-medium text-pin-muted">
          {t("project.deleteTypeConfirm", { name })}
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className="pin-field pin-field-orange-focus"
            autoComplete="off"
            disabled={busy}
            placeholder={name}
          />
        </label>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="pin-btn-secondary min-h-11 rounded-xl px-4 py-2 text-sm font-semibold"
          >
            {t("project.deleteCancel")}
          </button>
          <button
            type="button"
            disabled={!matches || busy}
            onClick={() => void onConfirm()}
            className="min-h-11 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-md transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {busy ? t("project.deleteBusy") : t("project.deleteConfirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
