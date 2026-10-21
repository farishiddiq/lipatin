"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { migrateProjectData, wrapProject, type Project, type ProjectData } from "../project";
import { uid } from "../utils";

export const FREE_PROJECT_LIMIT = 10;

interface ProjectsState {
  projects: Record<string, Project>;
  plan: "free" | "pro";
  create: (data: ProjectData, extra?: Partial<Project>) => Project;
  update: (id: string, patch: Partial<Project>) => void;
  remove: (id: string) => void;
  duplicate: (id: string) => Project | undefined;
  saveVersion: (id: string, note: string) => void;
}

const safeStorage = createJSONStorage(() => {
  try {
    if (typeof window === "undefined") throw new Error("server");
    const k = "__lipatin_probe";
    localStorage.setItem(k, "1");
    localStorage.removeItem(k);
    return localStorage;
  } catch {
    const mem = new Map<string, string>();
    return {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    };
  }
});

export const useProjects = create<ProjectsState>()(
  persist(
    (set, get) => ({
      projects: {},
      plan: "free",
      create: (data, extra) => {
        const p = wrapProject(structuredClone(data), extra);
        set((s) => ({ projects: { ...s.projects, [p.id]: p } }));
        return p;
      },
      update: (id, patch) =>
        set((s) => {
          const cur = s.projects[id];
          if (!cur) return s;
          return { projects: { ...s.projects, [id]: { ...cur, ...patch, updatedAt: Date.now() } } };
        }),
      remove: (id) =>
        set((s) => {
          const next = { ...s.projects };
          delete next[id];
          return { projects: next };
        }),
      duplicate: (id) => {
        const cur = get().projects[id];
        if (!cur) return;
        const p = wrapProject(structuredClone({ ...cur, title: `${cur.title} (salinan)` }), { folder: cur.folder });
        set((s) => ({ projects: { ...s.projects, [p.id]: p } }));
        return p;
      },
      saveVersion: (id, note) =>
        set((s) => {
          const cur = s.projects[id];
          if (!cur) return s;
          const v = { id: uid("v_"), n: (cur.versions.at(-1)?.n ?? 0) + 1, at: Date.now(), note, snapshot: structuredClone(projectData(cur)) };
          return { projects: { ...s.projects, [id]: { ...cur, versions: [...cur.versions, v].slice(-30) } } };
        }),
    }),
    {
      name: "lipatin-projects",
      storage: safeStorage,
      version: 2,
      // v2: template kembar dihapus; alihkan proyek (dan riwayat versinya) ke penggantinya
      migrate: (state) => {
        const s = state as Pick<ProjectsState, "projects" | "plan">;
        const projects = Object.fromEntries(
          Object.entries(s.projects ?? {}).map(([id, p]) => [id, { ...migrateProjectData(p), versions: (p.versions ?? []).map((v) => ({ ...v, snapshot: migrateProjectData(v.snapshot) })) }]),
        );
        return { ...s, projects } as ProjectsState;
      },
    },
  ),
);

export function projectData(p: Project): ProjectData {
  return { title: p.title, source: p.source, material: p.material, compensate: p.compensate, mods: p.mods, sketches: p.sketches, design: p.design };
}
