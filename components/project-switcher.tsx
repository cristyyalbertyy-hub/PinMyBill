"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useT } from "@/lib/i18n/context";
import { useProjectOptional } from "@/lib/project-context";
import { projectDisplayName } from "@/lib/project-label";
import { isAuthPublicPath } from "@/lib/auth-public-paths";
import { isMarketingPath } from "@/lib/marketing-paths";
import { ProjectManageModal } from "@/components/project-manage-modal";

export function ProjectSwitcher() {
  const pathname = usePathname();
  const { status } = useSession();
  const t = useT();
  const projectCtx = useProjectOptional();
  const [open, setOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || manageOpen) return;
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
  }, [open, manageOpen]);

  if (isAuthPublicPath(pathname) || isMarketingPath(pathname) || status !== "authenticated" || !projectCtx) {
    return null;
  }

  const { ready, projects, activeProject, activeClientId, setActiveProject, deleteProject } =
    projectCtx;
  const label = activeProject ? projectDisplayName(activeProject) : t("project.noProject");

  async function handleDelete(projectId: string) {
    setDeleteBusy(true);
    try {
      await deleteProject(projectId);
      setManageOpen(false);
      setOpen(false);
    } catch {
      globalThis.alert(t("project.deleteFail"));
    } finally {
      setDeleteBusy(false);
    }
  }

  function openManage() {
    setOpen(false);
    setManageOpen(true);
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
                return (
                  <button
                    key={project.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      void setActiveProject(project.id);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-pin-teal-soft dark:hover:bg-stone-800 ${
                      selected
                        ? "bg-pin-teal-soft/70 font-semibold text-pin-ink dark:bg-teal-950/40"
                        : "text-pin-ink"
                    }`}
                  >
                    <span aria-hidden>{selected ? "✓" : " "}</span>
                    <span className="truncate">{projectDisplayName(project)}</span>
                  </button>
                );
              })
            )}
            <div className="mt-1 space-y-0.5 border-t border-stone-200/80 px-2 py-1 dark:border-stone-700">
              <Link
                href="/new"
                onClick={() => setOpen(false)}
                className="flex min-h-9 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-pin-accent no-underline transition hover:bg-pin-teal-soft dark:hover:bg-stone-800"
              >
                <span aria-hidden>＋</span>
                {t("project.newProject")}
              </Link>
              {projects.length > 0 ? (
                <button
                  type="button"
                  onClick={openManage}
                  className="flex min-h-9 w-full items-center gap-2 rounded-lg px-2 text-left text-sm text-pin-muted transition hover:bg-stone-100 hover:text-pin-ink dark:hover:bg-stone-800 dark:hover:text-stone-200"
                >
                  {t("project.manage")}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {manageOpen ? (
        <ProjectManageModal
          projects={projects}
          initialProjectId={activeClientId}
          busy={deleteBusy}
          onClose={() => {
            if (!deleteBusy) setManageOpen(false);
          }}
          onDelete={handleDelete}
        />
      ) : null}
    </>
  );
}
