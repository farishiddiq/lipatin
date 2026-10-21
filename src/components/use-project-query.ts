"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { newProjectData, type ProjectData } from "@/lib/project";
import { projectData, useProjects } from "@/lib/store/projects";
import { templateById } from "@/lib/templates";

/** Muat proyek dari ?id= (tersimpan) atau ?template= (sementara, tidak disimpan). */
export function useProjectQuery() {
  const sp = useSearchParams();
  const [state, setState] = useState<{ status: "loading" | "ready" | "missing"; data?: ProjectData; id?: string }>({ status: "loading" });
  useEffect(() => {
    const run = () => {
      const id = sp.get("id");
      const tpl = sp.get("template");
      if (id) {
        const p = useProjects.getState().projects[id];
        setState(p ? { status: "ready", data: projectData(p), id } : { status: "missing" });
      } else if (tpl && templateById(tpl)) setState({ status: "ready", data: newProjectData(tpl) });
      else setState({ status: "missing" });
    };
    if (useProjects.persist.hasHydrated()) run();
    else return useProjects.persist.onFinishHydration(run);
  }, [sp]);
  return state;
}
