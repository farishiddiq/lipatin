"use client";

import { Maximize2, Minimize2, Pause, Play } from "lucide-react";
import { useMemo, useState } from "react";
import { LazyFoldViewer } from "@/components/three/lazy";
import type { CameraView, ProgressSource } from "@/components/three/fold-viewer";
import { Slider } from "@/components/ui/slider";
import type { ResolvedNet } from "@/lib/geometry/resolve";
import { decalRenders } from "@/lib/decals";
import { useEditor } from "@/lib/store/editor";
import { cn } from "@/lib/utils";

const VIEWS: { id: CameraView; label: string }[] = [
  { id: "iso", label: "3/4" },
  { id: "front", label: "Depan" },
  { id: "top", label: "Atas" },
  { id: "side", label: "Samping" },
];

export const editorFoldSource: ProgressSource = {
  get: () => useEditor.getState().fold,
  subscribe: (cb) =>
    useEditor.subscribe((s, p) => {
      if (s.fold !== p.fold) cb();
    }),
};

export function ViewerPanel({
  net,
  expanded,
  onToggleExpand,
  className,
  style,
}: {
  net: ResolvedNet;
  expanded: boolean;
  onToggleExpand?: () => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const data = useEditor((s) => s.data);
  const fold = useEditor((s) => s.fold);
  const playing = useEditor((s) => s.playing);
  const selection = useEditor((s) => s.selection);
  const hover = useEditor((s) => s.hover);
  const set = useEditor((s) => s.set);
  const [view, setView] = useState<{ name: CameraView; n: number }>({ name: "iso", n: 0 });

  const selectedId = selection?.kind === "panel" || selection?.kind === "hinge" ? selection.id : selection?.kind === "edge" ? selection.panelId : null;
  const hoverId = hover?.kind === "panel" ? hover.id : null;
  const issueIds = useMemo(() => net.issues.filter((i) => i.level === "error").flatMap((i) => i.panelIds ?? []), [net]);
  const decals = useMemo(() => decalRenders(net, data?.design), [net, data?.design]);

  if (!data) return null;
  return (
    <section aria-label="Pratinjau 3D" style={style} className={cn("flex min-h-0 flex-col bg-stone-100", className)}>
      <div className="flex items-center gap-2 border-b border-stone-200 px-3 py-2">
        <h2 className="text-sm font-bold">Pratinjau 3D</h2>
        <div role="group" aria-label="Sudut pandang kamera" className="ml-auto flex gap-0.5 rounded-lg bg-stone-200/70 p-0.5">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setView((cur) => ({ name: v.id, n: cur.n + 1 }))}
              className="h-7 rounded-md px-2 text-xs font-semibold text-stone-600 hover:bg-white hover:text-stone-900"
            >
              {v.label}
            </button>
          ))}
        </div>
        {onToggleExpand && (
          <button
            type="button"
            onClick={onToggleExpand}
            aria-label={expanded ? "Perkecil pratinjau 3D" : "Perbesar pratinjau 3D"}
            className="hidden size-8 items-center justify-center rounded-md text-stone-600 hover:bg-stone-200 lg:flex"
          >
            {expanded ? <Minimize2 className="size-4" aria-hidden /> : <Maximize2 className="size-4" aria-hidden />}
          </button>
        )}
      </div>
      <div className="relative min-h-0 flex-1">
        <LazyFoldViewer
          net={net}
          material={data.material}
          source={editorFoldSource}
          selectedId={selectedId}
          hoverId={hoverId}
          issueIds={issueIds}
          onSelect={(id) => set({ selection: id ? { kind: "panel", id } : null })}
          onHover={(id) => set({ hover: id ? { kind: "panel", id } : null })}
          view={view}
          decals={decals}
          label="Model 3D hasil lipatan pola. Seret untuk memutar, gulir untuk zoom, klik panel untuk memilihnya."
        />
      </div>
      <div className="flex items-center gap-3 border-t border-stone-200 px-3 py-3">
        <button
          type="button"
          onClick={() => set({ playing: !playing })}
          aria-label={playing ? "Jeda animasi rakit" : "Putar animasi rakit"}
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-orange-600 text-white hover:bg-orange-700"
        >
          {playing ? <Pause className="size-5" aria-hidden /> : <Play className="size-5" aria-hidden />}
        </button>
        <Slider
          className="flex-1"
          label="Tingkat lipatan"
          valueText={`${Math.round(fold * 100)}%`}
          value={Math.round(fold * 100)}
          min={0}
          max={100}
          onChange={(v) => set({ fold: v / 100, playing: false })}
        />
      </div>
    </section>
  );
}
