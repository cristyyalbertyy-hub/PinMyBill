"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import type { ClientDetail, UserProfileData } from "@/lib/profile-types";

type ProjectContextValue = {
  ready: boolean;
  projects: ClientDetail[];
  activeProject: ClientDetail | null;
  activeClientId: string | null;
  profile: UserProfileData | null;
  setActiveProject: (clientId: string | null) => Promise<void>;
  deleteProject: (clientId: string) => Promise<void>;
  refreshProjects: () => Promise<void>;
};

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const [ready, setReady] = useState(false);
  const [projects, setProjects] = useState<ClientDetail[]>([]);
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfileData | null>(null);

  const load = useCallback(async () => {
    if (status !== "authenticated") {
      setProjects([]);
      setActiveClientId(null);
      setProfile(null);
      setReady(true);
      return;
    }

    try {
      const [clRes, prRes] = await Promise.all([
        fetch("/api/clients"),
        fetch("/api/account/profile"),
      ]);

      let clientRows: ClientDetail[] = [];
      if (clRes.ok) {
        clientRows = (await clRes.json()) as ClientDetail[];
        setProjects(clientRows);
      }

      if (prRes.ok) {
        const pr = (await prRes.json()) as UserProfileData;
        setProfile(pr);
        const activeId =
          pr.activeClientId && clientRows.some((c) => c.id === pr.activeClientId)
            ? pr.activeClientId
            : clientRows[0]?.id ?? null;
        setActiveClientId(activeId);
      } else {
        setActiveClientId(clientRows[0]?.id ?? null);
      }
    } catch {
      /* keep previous state */
    } finally {
      setReady(true);
    }
  }, [status]);

  useEffect(() => {
    setReady(false);
    void load();
  }, [load]);

  const setActiveProject = useCallback(async (clientId: string | null) => {
    setActiveClientId(clientId);
    try {
      await fetch("/api/account/active-project", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeClientId: clientId }),
      });
    } catch {
      /* optimistic update kept */
    }
  }, []);

  const deleteProject = useCallback(
    async (clientId: string) => {
      const res = await fetch(`/api/clients/${clientId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "delete-failed");
      }
      await load();
    },
    [load],
  );

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeClientId) ?? null,
    [activeClientId, projects],
  );

  const value = useMemo(
    () => ({
      ready,
      projects,
      activeProject,
      activeClientId,
      profile,
      setActiveProject,
      deleteProject,
      refreshProjects: load,
    }),
    [ready, projects, activeProject, activeClientId, profile, setActiveProject, deleteProject, load],
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error("useProject must be used within ProjectProvider");
  }
  return ctx;
}

export function useProjectOptional() {
  return useContext(ProjectContext);
}
