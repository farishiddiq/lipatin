"use client";

import { useEffect, useMemo, useRef } from "react";
import type { ResolvedNet } from "@/lib/geometry/resolve";
import { resolveProject } from "@/lib/project";
import { useEditor } from "@/lib/store/editor";
import { useProjects } from "@/lib/store/projects";

export function useResolved(): ResolvedNet | null {
  const data = useEditor((s) => s.data);
  return useMemo(() => (data ? resolveProject(data) : null), [data]);
}

/** Simpan otomatis: setelah jeda singkat tiap perubahan, dan paling lambat tiap 10 detik. */
export function useAutosave() {
  const update = useProjects((s) => s.update);
  const savedAt = useRef(0);
  useEffect(() => {
    const flush = () => {
      const { projectId, data, dirtyAt } = useEditor.getState();
      if (!projectId || !data || dirtyAt <= savedAt.current) return;
      savedAt.current = Date.now();
      update(projectId, { ...data });
    };
    let t: ReturnType<typeof setTimeout> | undefined;
    const unsub = useEditor.subscribe((s, prev) => {
      if (s.data === prev.data) return;
      clearTimeout(t);
      t = setTimeout(flush, 800);
    });
    const iv = setInterval(flush, 10_000);
    const onHide = () => flush();
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      flush();
      unsub();
      clearTimeout(t);
      clearInterval(iv);
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [update]);
}

/** Animasi rakit: 0 → 1 lalu berhenti (tidak berulang tanpa batas). */
export function usePlayFold() {
  const playing = useEditor((s) => s.playing);
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    useEditor.getState().set({ fold: 0 });
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const f = Math.min(1, useEditor.getState().fold + dt / 3);
      useEditor.getState().set({ fold: f });
      if (f >= 1) {
        useEditor.getState().set({ playing: false });
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);
}
