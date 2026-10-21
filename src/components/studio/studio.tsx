"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { postById } from "@/lib/community";
import { newProjectData, resolveProject, type ProjectData } from "@/lib/project";
import { useEditor } from "@/lib/store/editor";
import { FREE_PROJECT_LIMIT, projectData, useProjects } from "@/lib/store/projects";
import { templateById } from "@/lib/templates";
import { clamp } from "@/lib/utils";
import { EditorCanvas } from "./canvas";
import { useAutosave, usePlayFold, useResolved } from "./hooks";
import { Inspector } from "./inspector";
import { SelectionBar } from "./selection-bar";
import { isAdvancedTool, StudioToolbar, TOOL_KEYS } from "./toolbar";
import { TopBar } from "./top-bar";
import { ViewerPanel } from "./viewer-panel";

type LoadState = "loading" | "ready" | "missing" | "limit";

export function Studio() {
  const sp = useSearchParams();
  const router = useRouter();
  const load = useEditor((s) => s.load);
  const [state, setState] = useState<LoadState>("loading");
  const handled = useRef<string | null>(null);

  useEffect(() => {
    const key = sp.toString();
    const run = () => {
      if (handled.current === key) return;
      handled.current = key;
      const store = useProjects.getState();
      const id = sp.get("id");
      if (id) {
        const p = store.projects[id];
        if (p) {
          load(p.id, projectData(p));
          setState("ready");
        } else setState("missing");
        return;
      }
      let data: ProjectData | null = null;
      let extra: Parameters<typeof store.create>[1];
      const tpl = sp.get("template");
      const remix = sp.get("remix");
      if (tpl && templateById(tpl)) data = newProjectData(tpl);
      else if (remix) {
        const post = postById(remix);
        if (post) {
          data = { ...newProjectData(post.templateId, post.params), title: `${post.title} (remix)` };
          data.material = { ...data.material, color: post.color };
          extra = { remixOf: { title: post.title, author: post.author } };
        }
      } else if (sp.get("dari") === "lihat") {
        try {
          const raw = sessionStorage.getItem("lipatin-remix");
          if (raw) {
            const parsed = JSON.parse(raw) as { d: ProjectData; a?: string };
            data = { ...parsed.d, title: `${parsed.d.title} (remix)` };
            extra = { remixOf: { title: parsed.d.title, author: parsed.a ?? "Link publik" } };
            sessionStorage.removeItem("lipatin-remix");
          }
        } catch {}
      }
      if (!data) return setState("missing");
      if (store.plan === "free" && Object.keys(store.projects).length >= FREE_PROJECT_LIMIT) return setState("limit");
      const p = store.create(data, extra);
      load(p.id, projectData(p));
      setState("ready");
      router.replace(`/studio?id=${p.id}`);
    };
    if (useProjects.persist.hasHydrated()) run();
    else return useProjects.persist.onFinishHydration(run);
  }, [sp, load, router]);

  if (state === "loading") {
    return (
      <div className="flex h-dvh items-center justify-center" aria-busy="true">
        <span className="text-sm text-stone-500">Membuka Studio…</span>
      </div>
    );
  }
  if (state === "missing" || state === "limit") {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-extrabold text-balance">{state === "limit" ? "Batas 10 proyek paket Gratis tercapai" : "Proyek tidak ditemukan"}</h1>
        <p className="max-w-md text-pretty text-stone-600">
          {state === "limit" ? "Hapus proyek lama di Proyek saya, atau tingkatkan ke Pro untuk proyek tanpa batas." : "Proyek ini tidak ada di browser ini. Proyek tersimpan per perangkat; mulai lagi dari galeri template."}
        </p>
        <Link href={state === "limit" ? "/dashboard" : "/template"} className={buttonClass("primary", "lg")}>
          {state === "limit" ? "Kelola proyek" : "Buka galeri template"}
        </Link>
      </div>
    );
  }
  return <StudioShell />;
}

function StudioShell() {
  const net = useResolved();
  const title = useEditor((s) => s.data?.title);
  const [mobileTab, setMobileTab] = useState<"2d" | "3d" | "atur">("2d");
  const [viewerW, setViewerW] = useState(0.4);
  const [expanded, setExpanded] = useState(false);
  const row = useRef<HTMLDivElement>(null);
  useAutosave();
  usePlayFold();
  useShortcuts();

  if (!net) return null;

  const startResize = (e: React.PointerEvent) => {
    const el = row.current;
    if (!el) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    const rect = el.getBoundingClientRect();
    const move = (ev: PointerEvent) => setViewerW(clamp((rect.right - 320 - ev.clientX) / (rect.width - 320 - 56), 0.2, 0.75));
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <h1 className="sr-only">Studio: {title}</h1>
      <TopBar />
      <div className="border-b border-stone-200 bg-white p-2 lg:hidden">
        <Segmented
          label="Tampilan Studio"
          className="w-full"
          value={mobileTab}
          onChange={setMobileTab}
          options={[
            { value: "2d", label: "Pola 2D" },
            { value: "3d", label: "3D" },
            { value: "atur", label: "Atur" },
          ]}
        />
      </div>
      <div ref={row} className="flex min-h-0 flex-1">
        <div className={mobileTab === "2d" ? "flex min-w-0 flex-1 flex-col lg:flex-row" : "hidden min-w-0 flex-1 lg:flex"}>
          <div className="hidden lg:flex">
            <StudioToolbar />
          </div>
          <div className="lg:hidden">
            <StudioToolbar orientation="horizontal" />
          </div>
          <div className="relative min-h-0 min-w-0 flex-1">
            <EditorCanvas net={net} />
            <SelectionBar net={net} />
          </div>
        </div>
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Ubah lebar pratinjau 3D"
          aria-valuenow={Math.round(viewerW * 100)}
          aria-valuemin={20}
          aria-valuemax={75}
          tabIndex={0}
          onPointerDown={startResize}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setViewerW((w) => clamp(w + 0.03, 0.2, 0.75));
            if (e.key === "ArrowRight") setViewerW((w) => clamp(w - 0.03, 0.2, 0.75));
          }}
          className="hidden w-1.5 shrink-0 cursor-col-resize bg-stone-200 hover:bg-orange-400 lg:block"
        />
        <ViewerPanel
          net={net}
          expanded={expanded}
          onToggleExpand={() => {
            setExpanded((x) => !x);
            setViewerW(expanded ? 0.4 : 0.7);
          }}
          className={mobileTab === "3d" ? "flex-1 lg:w-[var(--vw)] lg:flex-none" : "hidden shrink-0 lg:flex lg:w-[var(--vw)]"}
          style={{ ["--vw" as string]: `calc((100% - 376px) * ${viewerW.toFixed(3)})` }}
        />
        <Inspector net={net} className={mobileTab === "atur" ? "flex-1 lg:w-80 lg:flex-none" : "hidden w-80 shrink-0 lg:flex"} />
      </div>
    </div>
  );
}

function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input,textarea,select,[contenteditable],[role=dialog],[role=alertdialog]")) return;
      const st = useEditor.getState();
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) st.redo();
        else st.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        st.redo();
        return;
      }
      if (mod || e.altKey) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        const sel = st.selection;
        if (sel?.kind === "sketch") {
          st.commit((d) => ({ ...d, sketches: d.sketches.filter((x) => x.id !== sel.id) }));
          st.set({ selection: null });
        } else if (sel?.kind === "panel" && st.data) {
          const id = sel.id;
          if (id.startsWith("x-tab-")) st.commit((d) => ({ ...d, mods: { ...d.mods, tabs: d.mods.tabs.filter((t) => `x-tab-${t.panelId}-${t.edge}` !== id) } }));
          else {
            const net = resolvedSnapshot();
            const kind = net?.byId.get(id)?.kind;
            if (kind === "tab" || kind === "flap") st.commit((d) => ({ ...d, mods: { ...d.mods, removed: [...d.mods.removed, id] } }));
            else return;
          }
          st.set({ selection: null });
        }
        return;
      }
      const t = TOOL_KEYS[e.key.toLowerCase()];
      if (t && !(st.easy && isAdvancedTool(t))) st.set({ tool: t });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

function resolvedSnapshot() {
  const d = useEditor.getState().data;
  return d ? resolveProject(d) : null;
}
