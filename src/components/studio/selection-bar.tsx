"use client";

import { FlipVertical2, Hash, Tally2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { add, dist, lerp2, norm, perp, pointInPolygon, scale, sub } from "@/lib/geometry/polygon";
import type { ResolvedNet } from "@/lib/geometry/resolve";
import type { LineType, Vec2 } from "@/lib/geometry/types";
import { LINE_ORDER, LINE_STYLES } from "@/lib/line-styles";
import { useEditor } from "@/lib/store/editor";
import { fmt } from "@/lib/units";
import { uid } from "@/lib/utils";

const KIND_LABEL = { face: "Panel", tab: "Tab lem", flap: "Sayap/lidah" };

export function SelectionBar({ net }: { net: ResolvedNet }) {
  const selection = useEditor((s) => s.selection);
  const unit = useEditor((s) => s.unit);
  const easy = useEditor((s) => s.easy);
  const data = useEditor((s) => s.data);
  const commit = useEditor((s) => s.commit);
  const set = useEditor((s) => s.set);
  if (!selection || !data) return null;

  const close = (
    <button type="button" onClick={() => set({ selection: null })} aria-label="Batalkan pilihan" className="flex size-8 shrink-0 items-center justify-center rounded-md text-stone-500 hover:bg-stone-100">
      <X className="size-4" aria-hidden />
    </button>
  );

  const removePanel = (id: string) => {
    const isAdded = id.startsWith("x-tab-");
    commit((d) => ({
      ...d,
      mods: isAdded ? { ...d.mods, tabs: d.mods.tabs.filter((t) => `x-tab-${t.panelId}-${t.edge}` !== id) } : { ...d.mods, removed: [...d.mods.removed, id] },
    }));
    set({ selection: null });
  };

  let content: React.ReactNode = null;

  if (selection.kind === "panel" || selection.kind === "hinge") {
    const p = net.byId.get(selection.id);
    if (!p) return null;
    const angle = net.angles.get(p.id);
    const xs = p.points.map((q) => q[0]);
    const ys = p.points.map((q) => q[1]);
    const w = Math.max(...xs) - Math.min(...xs);
    const h = Math.max(...ys) - Math.min(...ys);
    const setAngle = (v: number) => commit((d) => ({ ...d, mods: { ...d.mods, angles: { ...d.mods.angles, [p.id]: v } } }), `angle:${p.id}`);
    content = (
      <>
        <div className="flex min-w-0 flex-col">
          <span className="text-xs text-stone-500">{selection.kind === "hinge" ? "Garis lipat" : KIND_LABEL[p.kind]}</span>
          <span className="truncate font-bold">{p.label ?? p.id}</span>
          <span className="text-xs text-stone-500 tabular-nums">
            {fmt(w, unit, false)} × {fmt(h, unit)}
          </span>
        </div>
        {angle !== undefined && (
          <>
            <Slider
              className="w-44"
              label="Sudut lipat"
              valueText={`${Math.round(Math.abs(angle))}° ${angle >= 0 ? "gunung" : "lembah"}`}
              value={Math.round(Math.abs(angle))}
              min={0}
              max={180}
              onChange={(v) => setAngle(angle >= 0 ? v : -v)}
            />
            <Button size="sm" variant="outline" onClick={() => setAngle(-(angle || 90))}>
              <FlipVertical2 aria-hidden />
              Jadikan {angle >= 0 ? "lembah" : "gunung"}
            </Button>
          </>
        )}
        {(p.kind === "tab" || p.kind === "flap") && (
          <Button size="sm" variant="outline" onClick={() => removePanel(p.id)}>
            <Trash2 aria-hidden />
            Hapus
          </Button>
        )}
      </>
    );
  } else if (selection.kind === "edge") {
    const p = net.byId.get(selection.panelId);
    if (!p) return null;
    const L = dist(selection.a, selection.b);
    const seam = net.seams.find((s) => s.sides.some((x) => x.panelId === p.id && dist(x.a, selection.a) + dist(x.b, selection.b) < 0.5));
    const tplTab = data.source.kind === "template" ? Number(data.source.params.tab) : NaN;
    const addTab = () => {
      commit((d) => ({ ...d, mods: { ...d.mods, tabs: [...d.mods.tabs, { panelId: p.id, edge: selection.edge, width: Number.isFinite(tplTab) && tplTab > 0 ? tplTab : 12 }] } }));
      set({ selection: { kind: "panel", id: `x-tab-${p.id}-${selection.edge}` } });
    };
    const addSlot = () => {
      const base = lerp2(selection.a, selection.b, 0.5);
      const u = norm(sub(selection.b, selection.a));
      let n = perp(u);
      if (!pointInPolygon(add(base, scale(n, 0.5)), p.points)) n = scale(n, -1);
      const len = useEditor.getState().slotLength;
      const hw = scale(u, net.thickness / 2);
      const pts: Vec2[] = [sub(base, hw), add(base, hw), add(add(base, hw), scale(n, len)), add(sub(base, hw), scale(n, len))];
      const id = uid("s_");
      commit((d) => ({ ...d, sketches: [...d.sketches, { id, lineType: "cut", tool: "slot", shape: { kind: "polyline", pts, closed: true } }] }));
      set({ selection: { kind: "sketch", id } });
    };
    content = (
      <>
        <div className="flex min-w-36 flex-col">
          <span className="text-xs text-stone-500">Tepi potong · {p.label}</span>
          <span className="font-bold tabular-nums">{fmt(L, unit)}</span>
          {seam && <span className="text-xs text-stone-500">Disambung ke pasangan nomor {seam.n}</span>}
        </div>
        {p.kind !== "tab" &&
          (seam?.viaTab ? (
            <span className="text-sm text-stone-600">Sudah disambung dengan tab lem.</span>
          ) : (
            <Button size="sm" variant="primary" onClick={addTab}>
              <Hash aria-hidden />
              Tambah tab lem
            </Button>
          ))}
        {!easy && (
          <Button size="sm" variant="outline" onClick={addSlot}>
            <Tally2 aria-hidden />
            Slot di tengah
          </Button>
        )}
      </>
    );
  } else if (selection.kind === "sketch") {
    const s = net.sketches.find((x) => x.id === selection.id);
    if (!s) return null;
    content = (
      <>
        <div className="flex min-w-0 flex-col">
          <span className="text-xs text-stone-500">{s.tool === "slot" ? "Slot" : s.tool === "finger" ? "Lubang jari" : s.tool === "tear" ? "Sobekan" : "Garis gambar"}</span>
          <span className="font-bold">{LINE_STYLES[s.lineType].label}</span>
        </div>
        <div role="group" aria-label="Ubah jenis garis" className="flex gap-1">
          {LINE_ORDER.map((lt: LineType) => (
            <button
              key={lt}
              type="button"
              aria-pressed={s.lineType === lt}
              aria-label={LINE_STYLES[lt].label}
              onClick={() => commit((d) => ({ ...d, sketches: d.sketches.map((x) => (x.id === s.id ? { ...x, lineType: lt } : x)) }))}
              className="flex h-8 w-9 items-center justify-center rounded-md border-2 border-transparent hover:bg-stone-100 aria-pressed:border-stone-900"
            >
              <svg width="22" height="6" aria-hidden>
                <line x1="1" y1="3" x2="21" y2="3" stroke={LINE_STYLES[lt].cssVar} strokeWidth="2.4" strokeDasharray={LINE_STYLES[lt].dash?.map((d) => d * 0.8).join(" ")} />
              </svg>
            </button>
          ))}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            commit((d) => ({ ...d, sketches: d.sketches.filter((x) => x.id !== s.id) }));
            set({ selection: null });
          }}
        >
          <Trash2 aria-hidden />
          Hapus
        </Button>
      </>
    );
  }

  return (
    <div
      role="region"
      aria-label="Objek terpilih"
      className="absolute bottom-16 left-1/2 z-10 flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 items-center gap-3 overflow-x-auto rounded-2xl border border-stone-200 bg-white px-3 py-2 shadow-lg"
    >
      {content}
      {close}
    </div>
  );
}
