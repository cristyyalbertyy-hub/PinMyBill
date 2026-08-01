"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useT } from "@/lib/i18n/context";
import { useProjectOptional } from "@/lib/project-context";
import type { ClientDetail } from "@/lib/profile-types";
import { projectDisplayName } from "@/lib/project-label";
import { isAuthPublicPath } from "@/lib/auth-public-paths";
import { isMarketingPath } from "@/lib/marketing-paths";
import { ProjectDeleteModal } from "@/components/project-delete-modal";

export function ProjectSwitcher() {
  const pathname = usePathname();
  const { status } = useSession();
  const t = useT();
  const projectCtx = useProjectOptional();
  const [open, setOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ClientDetail | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (isAuthPublicPath(pathname) || isMarketingPath(pathname) || status !== "authenticated" || !projectCtx) {
    return null;
  }

  const { ready, projects, activeProject, setActiveProject, deleteProject } = projectCtx;
  const label = activeProject ? projectDisplayName(activeProject) : t("project.noProject");

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await deleteProject(deleteTarget.id);
      setDeleteTarget(null);
      setOpen(false);
    } catch {
      globalThis.alert(t("project.deleteFail"));
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <>
      <div ref={panelRef} className="pointer-events-auto relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex max-w-[min(14rem,calc(100vw-8rem))] items-center gap-2 rounded-full border border-stone-200/90 bg-white/95 py-1.5 pl-3 pr-2.5 text-left text-sm font-semibold text-pin-ink shadow-md backdrop-blur-sm transition hover:bg-pin-teal-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pin-accent/40 dark:border-stone-600 dark:bg-stone-900/95 dark:hover:bg-stone-800"
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          <span aria-hidden className="text-base leading-none">
            📁
          </span>
          <span className="truncate">{ready ? label : t("common.loading")}</span>
          <span aria-hidden className="ml-auto text-xs text-pin-muted">
            ▾
          </span>
        </button>

        {open ? (
          <div
            role="listbox"
            className="absolute left-0 top-[calc(100%+0.35rem)] z-50 min-w-[14rem] max-w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-stone-200/90 bg-white/98 py-1 shadow-xl backdrop-blur-md dark:border-stone-600 dark:bg-stone-900/98"
          >
            {projects.length === 0 ? (
              <p className="px-3 py-2 text-xs text-pin-muted">{t("project.empty")}</p>
            ) : (
              projects.map((project) => {
                const selected = project.id === activeProject?.id;
                const displayName = projectDisplayName(project);
                return (
                  <div
                    key={project.id}
                    className={`flex items-center gap-1 pr-1 transition hover:bg-pin-teal-soft dark:hover:bg-stone-800 ${
                      selected ? "bg-pin-teal-soft/70 dark:bg-teal-950/40" : ""
                    }`}
                  >
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => {
                        void setActiveProject(project.id);
                        setOpen(false);
                      }}
                      className={`flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left text-sm ${
                        selected ? "font-semibold text-pin-ink" : "text-pin-ink"
                      }`}
                    >
                      <span aria-hidden>{selected ? "✓" : " "}</span>
                      <span className="truncate">{displayName}</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(project);
                      }}
                      aria-label={t("project.deleteAria", { name: displayName })}
                      title={t("project.delete")}
                      className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm text-red-600 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/50"
                    >
                      🗑
                    </button>
                  </div>
                );
              })
            )}
            <div className="mt-1 border-t border-stone-200/80 px-2 py-1 dark:border-stone-700">
              <Link
                href="/new"
                onClick={() => setOpen(false)}
                className="flex min-h-9 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-pin-accent no-underline transition hover:bg-pin-teal-soft dark:hover:bg-stone-800"
              >
                <span aria-hidden>＋</span>
                {t("project.newProject")}
              </Link>
            </div>
          </div>
        ) : null}
      </div>

      {deleteTarget ? (
        <ProjectDeleteModal
          project={deleteTarget}
          busy={deleteBusy}
          onClose={() => {
            if (!deleteBusy) setDeleteTarget(null);
          }}
          onConfirm={handleDeleteConfirm}
        />
      ) : null}
    </>
  );
}
