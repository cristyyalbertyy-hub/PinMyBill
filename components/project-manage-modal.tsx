"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ClientDetail } from "@/lib/profile-types";
import { useT } from "@/lib/i18n/context";
import { projectDisplayName } from "@/lib/project-label";

type ProjectManageModalProps = {
  projects: ClientDetail[];
  initialProjectId: string | null;
  busy: boolean;
  onClose: () => void;
  onDelete: (projectId: string) => void | Promise<void>;
};

function normalizeConfirm(value: string): string {
  return value.trim().normalize("NFKC");
}

export function ProjectManageModal({
  projects,
  initialProjectId,
  busy,
  onClose,
  onDelete,
}: ProjectManageModalProps) {
  const t = useT();
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedId, setSelectedId] = useState(initialProjectId ?? projects[0]?.id ?? "");
  const [typed, setTyped] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [mounted, setMounted] = useState(false);

  const selected = projects.find((p) => p.id === selectedId) ?? null;
  const confirmName = selected ? projectDisplayName(selected) : "";
  const matches =
    confirmName.length > 0 && normalizeConfirm(typed) === normalizeConfirm(confirmName);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setSelectedId(initialProjectId ?? projects[0]?.id ?? "");
    setTyped("");
    setShowDelete(false);
  }, [initialProjectId, projects]);

  useEffect(() => {
    setTyped("");
    setShowDelete(false);
  }, [selectedId]);

  useEffect(() => {
    if (!showDelete) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [showDelete, selectedId]);

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

  if (!mounted) return null;

  return createPortal(
    <div
      className="pointer-events-auto fixed inset-0 z-[80] flex items-end justify-center overflow-y-auto bg-stone-900/50 p-2 backdrop-blur-[2px] md:items-center md:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        className="pin-card flex max-h-[min(92vh,36rem)] w-full max-w-md flex-col overflow-hidden rounded-t-3xl shadow-2xl md:rounded-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="border-b border-stone-200/80 px-5 py-4 dark:border-stone-700">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id={titleId} className="text-lg font-bold text-pin-ink">
                {t("project.manageTitle")}
              </h2>
              <p className="mt-1 text-sm text-pin-muted">{t("project.manageLead")}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="pin-btn-secondary min-h-9 rounded-xl px-3 py-1.5 text-sm"
            >
              {t("common.close")}
            </button>
          </div>
        </div>

        <ul className="flex-1 overflow-y-auto px-2 py-2">
          {projects.map((project) => {
            const name = projectDisplayName(project);
            const isSelected = project.id === selectedId;
            return (
              <li key={project.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(project.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                    isSelected
                      ? "bg-pin-teal-soft/80 font-semibold text-pin-ink dark:bg-teal-950/40"
                      : "text-pin-ink hover:bg-pin-teal-soft/50 dark:hover:bg-stone-800"
                  }`}
                >
                  <span aria-hidden className="w-4 text-center">
                    {isSelected ? "✓" : ""}
                  </span>
                  <span className="truncate">{name}</span>
                </button>
              </li>
            );
          })}
        </ul>

        {selected ? (
          <div className="border-t border-red-200/80 bg-red-50/40 px-5 py-4 dark:border-red-900/50 dark:bg-red-950/20">
            <p className="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-300">
              {t("project.dangerZone")}
            </p>
            {!showDelete ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => setShowDelete(true)}
                className="mt-2 text-sm font-semibold text-red-700 underline-offset-2 hover:underline dark:text-red-300"
              >
                {t("project.deleteAction")}
              </button>
            ) : (
              <div className="mt-3 space-y-3">
                <p className="text-sm leading-relaxed text-pin-muted">{t("project.deleteWarning")}</p>
                <p className="rounded-lg bg-white/80 px-3 py-2 text-sm font-semibold text-red-800 ring-1 ring-red-200/80 dark:bg-stone-900/80 dark:text-red-100 dark:ring-red-900/60">
                  {confirmName}
                </p>
                <label className="flex flex-col gap-1.5 text-sm font-medium text-pin-muted">
                  {t("project.deleteTypeConfirm", { name: confirmName })}
                  <input
                    ref={inputRef}
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    className="pin-field pin-field-orange-focus pointer-events-auto"
                    autoComplete="off"
                    disabled={busy}
                    spellCheck={false}
                  />
                </label>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setShowDelete(false);
                      setTyped("");
                    }}
                    className="pin-btn-secondary min-h-10 rounded-xl px-4 py-2 text-sm font-semibold"
                  >
                    {t("project.deleteCancel")}
                  </button>
                  <button
                    type="button"
                    disabled={!matches || busy}
                    onClick={() => void onDelete(selected.id)}
                    className="min-h-10 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-md transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {busy ? t("project.deleteBusy") : t("project.deleteConfirm")}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
