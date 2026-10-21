"use client";

import { Maximize, Minus, Plus } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { DecalLayer } from "@/components/net/decal-layer";
import { seamLabelPos } from "@/components/net/net-svg";
import { decalRenders } from "@/lib/decals";
import { add, dist, distToSegment, interiorPoint, lerp2, norm, perp, pointInPanel, pointInPolygon, scale, stadiumPoints, sub } from "@/lib/geometry/polygon";
import type { ResolvedNet } from "@/lib/geometry/resolve";
import { pointsToPath, shapePoints, shapeToPath, shapeToPolyline, translateShape } from "@/lib/geometry/sketch";
import type { Line, Sketch, SketchShape, Vec2 } from "@/lib/geometry/types";
import { LINE_STYLES } from "@/lib/line-styles";
import { baseNet } from "@/lib/project";
import { useEditor, type Selection, type Tool } from "@/lib/store/editor";
import { fmt, fromUnit, toUnit, type Unit } from "@/lib/units";
import { clamp, cn, uid } from "@/lib/utils";

interface View {
  cx: number;
  cy: number;
  zoom: number;
}

type Draft =
  | { tool: "line" | "rect" | "circle" | "tear" | "measure"; a: Vec2; b: Vec2; dragged: boolean }
  | { tool: "polyline" | "arc" | "bezier"; pts: Vec2[]; cursor: Vec2 }
  | null;

const HINTS: Partial<Record<Tool, string>> = {
  select: "Klik panel, tepi, atau garis untuk memilih. Seret area kosong untuk menggeser kanvas.",
  pan: "Seret untuk menggeser kanvas. Gulir untuk zoom.",
  line: "Klik titik awal lalu titik akhir. Tahan Shift untuk sudut 45°.",
  polyline: "Klik titik-titik. Klik titik pertama untuk menutup, klik dua kali atau Enter untuk selesai.",
  rect: "Seret atau klik dua sudut berlawanan.",
  circle: "Klik pusat lalu tentukan jari-jari.",
  arc: "Klik pusat, titik awal busur, lalu titik akhir.",
  bezier: "Klik titik awal, dua titik kendali, lalu titik akhir.",
  tab: "Klik tepi potong untuk menambahkan tab lem.",
  slot: "Klik tepi potong untuk membuat slot selebar tebal kardus.",
  finger: "Klik di dalam panel untuk membuat lubang jari.",
  tear: "Seret garis untuk membuat sobekan (dua garis perforasi sejajar).",
  measure: "Seret untuk mengukur jarak.",
};

const DRAW_TOOLS: Tool[] = ["line", "polyline", "rect", "circle", "arc", "bezier", "tear", "measure"];

function gridStep(unit: Unit, zoom: number) {
  const base = unit === "in" ? 25.4 / 8 : 5;
  let s = base;
  while (s * zoom < 8) s *= unit === "in" ? 2 : 2;
  return s;
}

export function EditorCanvas({ net }: { net: ResolvedNet }) {
  const wrap = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<View | null>(null);
  const [draft, setDraft] = useState<Draft>(null);
  const [cursor, setCursor] = useState<Vec2 | null>(null);
  const [edgeHover, setEdgeHover] = useState<Line | null>(null);
  const [measure, setMeasure] = useState<[Vec2, Vec2] | null>(null);
  const [editingDim, setEditingDim] = useState<number | null>(null);
  const drag = useRef<{ mode: "pan" | "move"; sx: number; sy: number; view: View; id?: string; orig?: SketchShape; w0?: Vec2 } | null>(null);
  const space = useRef(false);

  const tool = useEditor((s) => s.tool);
  const lineType = useEditor((s) => s.lineType);
  const selection = useEditor((s) => s.selection);
  const hover = useEditor((s) => s.hover);
  const snapOn = useEditor((s) => s.snap);
  const gridOn = useEditor((s) => s.grid);
  const unit = useEditor((s) => s.unit);
  const easy = useEditor((s) => s.easy);
  const showSeams = useEditor((s) => s.showSeams);
  const showLabels = useEditor((s) => s.showLabels);
  const projectId = useEditor((s) => s.projectId);
  const data = useEditor((s) => s.data);
  const set = useEditor((s) => s.set);
  const commit = useEditor((s) => s.commit);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fit = useCallback(() => {
    if (!size.w || !size.h) return;
    const b = net.bbox;
    const pad = 24;
    const bw = b.maxX - b.minX + pad * 2;
    const bh = b.maxY - b.minY + pad * 2;
    setView({ cx: (b.minX + b.maxX) / 2, cy: (b.minY + b.maxY) / 2, zoom: clamp(Math.min(size.w / bw, size.h / bh), 0.05, 40) });
  }, [net.bbox, size.w, size.h]);

  const fittedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!size.w || !projectId) return;
    if (fittedFor.current === projectId && view) return;
    fittedFor.current = projectId;
    fit();
  }, [projectId, size.w, fit, view]);

  // zoom dengan roda (listener non-pasif agar bisa mencegah gulir halaman)
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setView((v) => {
        if (!v) return v;
        const r = el.getBoundingClientRect();
        const sx = e.clientX - r.left - r.width / 2;
        const sy = e.clientY - r.top - r.height / 2;
        const wx = v.cx + sx / v.zoom;
        const wy = v.cy + sy / v.zoom;
        const z = clamp(v.zoom * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), 0.05, 40);
        return { cx: wx - sx / z, cy: wy - sy / z, zoom: z };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" && !(e.target as HTMLElement)?.closest("input,textarea,[contenteditable]")) space.current = true;
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") space.current = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // batalkan draf saat ganti alat
  useEffect(() => {
    setDraft(null);
    setEdgeHover(null);
    if (tool !== "measure") setMeasure(null);
  }, [tool]);

  const snapPts = useMemo(() => {
    const pts: Vec2[] = [];
    for (const p of net.panels) {
      p.points.forEach((q, i) => {
        pts.push(q);
        pts.push(lerp2(q, p.points[(i + 1) % p.points.length], 0.5));
      });
    }
    for (const s of net.sketches) pts.push(...shapePoints(s.shape));
    return pts;
  }, [net]);

  const zoom = view?.zoom ?? 1;

  const toWorld = useCallback(
    (cx: number, cy: number): Vec2 => {
      const r = svgRef.current!.getBoundingClientRect();
      const v = view!;
      return [v.cx + (cx - r.left - r.width / 2) / v.zoom, v.cy + (cy - r.top - r.height / 2) / v.zoom];
    },
    [view],
  );

  const toScreen = useCallback((p: Vec2): Vec2 => [(p[0] - view!.cx) * view!.zoom + size.w / 2, (p[1] - view!.cy) * view!.zoom + size.h / 2], [view, size]);

  const snapPoint = useCallback(
    (p: Vec2, shift: boolean, from?: Vec2): Vec2 => {
      let q = p;
      if (from && shift) {
        const d = sub(p, from);
        const a = Math.round(Math.atan2(d[1], d[0]) / (Math.PI / 4)) * (Math.PI / 4);
        const L = Math.hypot(d[0], d[1]);
        q = [from[0] + Math.cos(a) * L, from[1] + Math.sin(a) * L];
      }
      if (!snapOn) return q;
      const tol = 8 / zoom;
      let best: Vec2 | null = null;
      let bd = tol;
      for (const s of snapPts) {
        const d = dist(s, q);
        if (d < bd) {
          bd = d;
          best = s;
        }
      }
      if (best) return best;
      if (from && shift) return q;
      const g = gridStep(unit, zoom) / (zoom > 4 ? 5 : 1);
      return [Math.round(q[0] / g) * g, Math.round(q[1] / g) * g];
    },
    [snapOn, snapPts, zoom, unit],
  );

  const hitTest = useCallback(
    (p: Vec2): Selection => {
      const tol = 7 / zoom;
      let best: { d: number; sel: Selection } | null = null;
      for (const s of net.sketches) {
        if (s.shape.kind === "text") continue;
        const pl = shapeToPolyline(s.shape);
        if (!pl) continue;
        const n = pl.pts.length;
        for (let i = 0; i < (pl.closed ? n : n - 1); i++) {
          const d = distToSegment(p, pl.pts[i], pl.pts[(i + 1) % n]);
          if (d < tol && (!best || d < best.d)) best = { d: d - 0.01, sel: { kind: "sketch", id: s.id } };
        }
      }
      for (const l of net.lines) {
        const d = distToSegment(p, l.a, l.b);
        if (d >= tol || (best && d >= best.d)) continue;
        if (l.hingeOf) best = { d, sel: { kind: "hinge", id: l.hingeOf } };
        else if (l.panelId && l.edge !== undefined) best = { d, sel: { kind: "edge", panelId: l.panelId, edge: l.edge, a: l.a, b: l.b } };
      }
      if (best) return best.sel;
      for (let i = net.panels.length - 1; i >= 0; i--) {
        const pn = net.panels[i];
        if (pointInPanel(p, pn.points, pn.holes)) return { kind: "panel", id: pn.id };
      }
      return null;
    },
    [net, zoom],
  );

  const nearestCutEdge = useCallback(
    (p: Vec2) => {
      const tol = 10 / zoom;
      let best: Line | null = null;
      let bd = tol;
      for (const l of net.lines) {
        if (l.type !== "cut" || !l.panelId || l.edge === undefined) continue;
        const d = distToSegment(p, l.a, l.b);
        if (d < bd) {
          bd = d;
          best = l;
        }
      }
      return best;
    },
    [net, zoom],
  );

  const addSketch = (shape: SketchShape, extra?: Partial<Sketch>) => {
    const id = uid("s_");
    commit((d) => ({ ...d, sketches: [...d.sketches, { id, lineType, shape, ...extra }] }));
    set({ selection: { kind: "sketch", id } });
  };

  const finishTwoPoint = (dr: Extract<NonNullable<Draft>, { a: Vec2 }>, b: Vec2) => {
    const a = dr.a;
    if (dist(a, b) < 0.5) return setDraft(null);
    if (dr.tool === "line") addSketch({ kind: "line", a, b });
    else if (dr.tool === "rect") addSketch({ kind: "rect", x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]), w: Math.abs(b[0] - a[0]), h: Math.abs(b[1] - a[1]) });
    else if (dr.tool === "circle") addSketch({ kind: "circle", c: a, r: dist(a, b) });
    else if (dr.tool === "measure") setMeasure([a, b]);
    else if (dr.tool === "tear") {
      const n = scale(norm(perp(sub(b, a))), 4);
      const id1 = uid("s_");
      const id2 = uid("s_");
      commit((d) => ({
        ...d,
        sketches: [
          ...d.sketches,
          { id: id1, lineType: "perforation", tool: "tear", shape: { kind: "line", a: add(a, n), b: add(b, n) } },
          { id: id2, lineType: "perforation", tool: "tear", shape: { kind: "line", a: sub(a, n), b: sub(b, n) } },
        ],
      }));
    }
    setDraft(null);
  };

  const finishMulti = (pts: Vec2[], closed = false) => {
    if (draft?.tool === "polyline" && pts.length >= 2) addSketch({ kind: "polyline", pts, closed });
    setDraft(null);
  };

  const onPointerDown = (e: RPointerEvent<SVGSVGElement>) => {
    if (!view) return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    const p = toWorld(e.clientX, e.clientY);
    if (e.button === 1 || tool === "pan" || space.current) {
      drag.current = { mode: "pan", sx: e.clientX, sy: e.clientY, view };
      return;
    }
    if (e.button !== 0) return;
    const anchor = draft && "a" in draft ? draft.a : draft && "pts" in draft ? draft.pts[draft.pts.length - 1] : undefined;
    const sp = snapPoint(p, e.shiftKey, anchor);

    switch (tool) {
      case "select": {
        const hit = hitTest(p);
        set({ selection: hit });
        if (hit?.kind === "sketch") {
          const s = net.sketches.find((x) => x.id === hit.id);
          if (s) drag.current = { mode: "move", sx: e.clientX, sy: e.clientY, view, id: s.id, orig: s.shape, w0: sp };
        } else if (!hit) {
          drag.current = { mode: "pan", sx: e.clientX, sy: e.clientY, view };
        }
        return;
      }
      case "line":
      case "rect":
      case "circle":
      case "tear":
      case "measure":
        if (draft && "a" in draft) finishTwoPoint(draft, sp);
        else setDraft({ tool, a: sp, b: sp, dragged: false });
        return;
      case "polyline":
      case "arc":
      case "bezier": {
        if (!draft || !("pts" in draft)) {
          setDraft({ tool, pts: [sp], cursor: sp });
          return;
        }
        const pts = [...draft.pts, sp];
        if (tool === "polyline") {
          if (draft.pts.length >= 3 && dist(sp, draft.pts[0]) < 8 / zoom) return finishMulti(draft.pts, true);
          if (e.detail >= 2) return finishMulti(draft.pts, false);
          setDraft({ ...draft, pts });
        } else if (tool === "arc" && pts.length === 3) {
          const [c, s0, s1] = pts;
          const deg = (q: Vec2) => (Math.atan2(q[1] - c[1], q[0] - c[0]) * 180) / Math.PI;
          addSketch({ kind: "arc", c, r: dist(c, s0), start: deg(s0), end: deg(s1) });
          setDraft(null);
        } else if (tool === "bezier" && pts.length === 4) {
          addSketch({ kind: "bezier", pts: pts as [Vec2, Vec2, Vec2, Vec2] });
          setDraft(null);
        } else setDraft({ ...draft, pts });
        return;
      }
      case "tab": {
        const l = nearestCutEdge(p);
        if (!l?.panelId || l.edge === undefined) return;
        const panel = net.byId.get(l.panelId);
        if (!panel || panel.kind === "tab") return;
        // sambungan yang sudah punya tab lem tidak perlu tab kedua
        if (net.seams.some((sm) => sm.viaTab && sm.sides.some((x) => x.panelId === l.panelId && dist(x.a, l.a) + dist(x.b, l.b) < 0.5))) return;
        const tplTab = data?.source.kind === "template" ? Number(data.source.params.tab) : NaN;
        const width = Number.isFinite(tplTab) && tplTab > 0 ? tplTab : 12;
        commit((d) => ({ ...d, mods: { ...d.mods, tabs: [...d.mods.tabs.filter((t) => !(t.panelId === l.panelId && t.edge === l.edge)), { panelId: l.panelId!, edge: l.edge!, width }] } }));
        set({ selection: { kind: "panel", id: `x-tab-${l.panelId}-${l.edge}` } });
        return;
      }
      case "slot": {
        const l = nearestCutEdge(p);
        if (!l?.panelId) return;
        const panel = net.byId.get(l.panelId)!;
        const u = norm(sub(l.b, l.a));
        const L = dist(l.a, l.b);
        const t = clamp((sp[0] - l.a[0]) * u[0] + (sp[1] - l.a[1]) * u[1], 0, L);
        const base = add(l.a, scale(u, t));
        let n = perp(u);
        if (!pointInPolygon(add(base, scale(n, 0.5)), panel.points)) n = scale(n, -1);
        const len = useEditor.getState().slotLength;
        const w = net.thickness;
        const hw = scale(u, w / 2);
        const pts: Vec2[] = [sub(base, hw), add(base, hw), add(add(base, hw), scale(n, len)), add(sub(base, hw), scale(n, len))];
        const id = uid("s_");
        commit((d) => ({ ...d, sketches: [...d.sketches, { id, lineType: "cut", tool: "slot", shape: { kind: "polyline", pts, closed: true } }] }));
        set({ selection: { kind: "sketch", id } });
        return;
      }
      case "finger": {
        const hit = net.panels.find((pn) => pointInPanel(p, pn.points, pn.holes));
        if (!hit) return;
        const id = uid("s_");
        commit((d) => ({ ...d, sketches: [...d.sketches, { id, lineType: "cut", tool: "finger", shape: { kind: "polyline", pts: stadiumPoints(sp, 24, 12), closed: true } }] }));
        set({ selection: { kind: "sketch", id } });
        return;
      }
    }
  };

  const onPointerMove = (e: RPointerEvent<SVGSVGElement>) => {
    if (!view) return;
    const dg = drag.current;
    if (dg?.mode === "pan") {
      setView({ ...dg.view, cx: dg.view.cx - (e.clientX - dg.sx) / dg.view.zoom, cy: dg.view.cy - (e.clientY - dg.sy) / dg.view.zoom });
      return;
    }
    const p = toWorld(e.clientX, e.clientY);
    if (dg?.mode === "move" && dg.orig && dg.w0 && dg.id) {
      const sp = snapPoint(p, false);
      const dx = sp[0] - dg.w0[0];
      const dy = sp[1] - dg.w0[1];
      const id = dg.id;
      const moved = translateShape(dg.orig, dx, dy);
      commit((d) => ({ ...d, sketches: d.sketches.map((s) => (s.id === id ? { ...s, shape: moved } : s)) }), `move:${id}`);
      return;
    }
    const anchor = draft && "a" in draft ? draft.a : draft && "pts" in draft ? draft.pts[draft.pts.length - 1] : undefined;
    const sp = DRAW_TOOLS.includes(tool) ? snapPoint(p, e.shiftKey, anchor) : p;
    setCursor(sp);
    if (draft && "a" in draft) {
      const moved = dist(draft.a, sp) * zoom > 3;
      setDraft({ ...draft, b: sp, dragged: draft.dragged || (moved && e.buttons === 1) });
    } else if (draft && "pts" in draft) setDraft({ ...draft, cursor: sp });
    if (tool === "tab" || tool === "slot") setEdgeHover(nearestCutEdge(p));
    if (tool === "select") {
      const h = hitTest(p);
      const hp = h?.kind === "panel" ? h : h?.kind === "edge" ? { kind: "panel" as const, id: h.panelId } : h?.kind === "hinge" ? { kind: "panel" as const, id: h.id } : null;
      const cur = useEditor.getState().hover;
      if ((cur?.kind === "panel" ? cur.id : null) !== (hp?.id ?? null)) set({ hover: hp });
    }
  };

  const onPointerUp = () => {
    drag.current = null;
    if (draft && "a" in draft && draft.dragged) finishTwoPoint(draft, draft.b);
  };

  // keyboard: Enter/Escape untuk draf
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input,textarea,[contenteditable]")) return;
      if (e.key === "Escape") {
        if (draft) setDraft(null);
        else set({ selection: null });
        setMeasure(null);
      }
      if (e.key === "Enter" && draft?.tool === "polyline") finishMulti(draft.pts, false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const dims = useMemo(() => (data && data.source.kind === "template" ? (baseNet(data).dims ?? []) : []), [data]);
  const decals = useMemo(() => decalRenders(net, data?.design), [net, data?.design]);

  if (!view || !size.w) {
    return <div ref={wrap} className="size-full bg-[var(--canvas-bg)]" aria-busy="true" />;
  }

  const sw = 1.5 / zoom;
  const vbX = view.cx - size.w / 2 / zoom;
  const vbY = view.cy - size.h / 2 / zoom;
  const vbW = size.w / zoom;
  const vbH = size.h / zoom;
  const gs = gridStep(unit, zoom);
  const selectedPanel = selection?.kind === "panel" ? selection.id : selection?.kind === "hinge" ? selection.id : null;
  const hoverPanel = hover?.kind === "panel" ? hover.id : null;
  const issuePanels = new Set(net.issues.filter((i) => i.level === "error").flatMap((i) => i.panelIds ?? []));

  const draftEl = (() => {
    if (!draft) return null;
    const st = LINE_STYLES[draft.tool === "tear" ? "perforation" : lineType];
    const common = { fill: "none", stroke: draft.tool === "measure" ? "var(--color-orange-600)" : st.cssVar, strokeWidth: sw * 1.2, strokeDasharray: st.dash?.join(" ") };
    if ("a" in draft) {
      const { a, b } = draft;
      if (draft.tool === "rect") return <rect x={Math.min(a[0], b[0])} y={Math.min(a[1], b[1])} width={Math.abs(b[0] - a[0])} height={Math.abs(b[1] - a[1])} {...common} />;
      if (draft.tool === "circle") return <circle cx={a[0]} cy={a[1]} r={dist(a, b)} {...common} />;
      if (draft.tool === "tear") {
        const n = scale(norm(perp(sub(b, a))), 4);
        return (
          <g {...common}>
            <line x1={a[0] + n[0]} y1={a[1] + n[1]} x2={b[0] + n[0]} y2={b[1] + n[1]} />
            <line x1={a[0] - n[0]} y1={a[1] - n[1]} x2={b[0] - n[0]} y2={b[1] - n[1]} />
          </g>
        );
      }
      return <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} {...common} />;
    }
    const pts = [...draft.pts, draft.cursor];
    if (draft.tool === "bezier" && pts.length === 4) return <path d={shapeToPath({ kind: "bezier", pts: pts as [Vec2, Vec2, Vec2, Vec2] })} {...common} />;
    return (
      <g>
        <path d={pointsToPath(pts, false)} {...common} />
        {draft.pts.map((q, i) => (
          <circle key={i} cx={q[0]} cy={q[1]} r={3 / zoom} fill="var(--color-orange-600)" />
        ))}
      </g>
    );
  })();

  const measureLine = measure ?? (draft?.tool === "measure" && "a" in draft ? ([draft.a, draft.b] as [Vec2, Vec2]) : null);

  return (
    <div ref={wrap} className="relative size-full overflow-hidden bg-[var(--canvas-bg)]">
      <svg
        ref={svgRef}
        width={size.w}
        height={size.h}
        viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
        className={cn("block touch-none select-none", tool === "pan" ? "cursor-grab" : tool === "select" ? "cursor-default" : "cursor-crosshair")}
        role="application"
        aria-label="Kanvas pola 2D. Gunakan bilah alat di kiri untuk menggambar; seleksi juga bisa dari panel 3D."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => {
          setCursor(null);
          if (useEditor.getState().hover) set({ hover: null });
        }}
      >
        <defs>
          <pattern id="grid-minor" width={gs} height={gs} patternUnits="userSpaceOnUse">
            <path d={`M${gs} 0H0V${gs}`} fill="none" stroke="var(--grid-minor)" strokeWidth={1 / zoom} />
          </pattern>
          <pattern id="grid-major" width={gs * 10} height={gs * 10} patternUnits="userSpaceOnUse">
            <path d={`M${gs * 10} 0H0V${gs * 10}`} fill="none" stroke="var(--grid-major)" strokeWidth={1 / zoom} />
          </pattern>
        </defs>
        {gridOn && (
          <>
            <rect x={vbX} y={vbY} width={vbW} height={vbH} fill="url(#grid-minor)" />
            <rect x={vbX} y={vbY} width={vbW} height={vbH} fill="url(#grid-major)" />
          </>
        )}
        <NetLayer net={net} sw={sw} selectedPanel={selectedPanel} hoverPanel={hoverPanel} issuePanels={issuePanels} decals={decals} />
        <SketchLayer sketches={net.sketches} sw={sw} selectedId={selection?.kind === "sketch" ? selection.id : null} />
        {selection?.kind === "edge" && <line x1={selection.a[0]} y1={selection.a[1]} x2={selection.b[0]} y2={selection.b[1]} stroke="var(--color-orange-500)" strokeWidth={sw * 3} strokeLinecap="round" />}
        {selection?.kind === "hinge" &&
          (() => {
            const h = net.byId.get(selection.id)?.hinge;
            return h ? <line x1={h[0][0]} y1={h[0][1]} x2={h[1][0]} y2={h[1][1]} stroke="var(--color-orange-500)" strokeWidth={sw * 3} strokeLinecap="round" /> : null;
          })()}
        {edgeHover && <line x1={edgeHover.a[0]} y1={edgeHover.a[1]} x2={edgeHover.b[0]} y2={edgeHover.b[1]} stroke="var(--color-orange-500)" strokeWidth={sw * 4} strokeLinecap="round" opacity={0.7} />}
        {showSeams && (
          <g className="fill-stone-700 font-bold" fontSize={11 / zoom} textAnchor="middle" dominantBaseline="central">
            {net.seams.flatMap((s) =>
              s.sides.map((side, k) => {
                const [x, y] = seamLabelPos(net, side.panelId, side.a, side.b, 9 / zoom);
                return (
                  <text key={`${s.n}-${k}`} x={x} y={y} className="tabular-nums" paintOrder="stroke" stroke="var(--canvas-bg)" strokeWidth={3 / zoom}>
                    {s.n}
                  </text>
                );
              }),
            )}
          </g>
        )}
        {showLabels && (
          <g className="fill-stone-500" fontSize={11 / zoom} textAnchor="middle" dominantBaseline="central">
            {net.panels
              .filter((p) => p.kind !== "tab")
              .map((p) => {
                const [x, y] = interiorPoint(p.points, p.holes);
                return (
                  <text key={p.id} x={x} y={y}>
                    {p.label}
                  </text>
                );
              })}
          </g>
        )}
        {!easy &&
          dims.map((d, i) => {
            const n = norm(perp(sub(d.b, d.a)));
            const a = add(d.a, scale(n, d.offset));
            const b = add(d.b, scale(n, d.offset));
            const tk = scale(n, 4 / zoom);
            return (
              <g key={i} stroke="var(--color-orange-700)" strokeWidth={sw}>
                <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} strokeDasharray={`${3 / zoom} ${2 / zoom}`} />
                <line x1={a[0] - tk[0]} y1={a[1] - tk[1]} x2={a[0] + tk[0]} y2={a[1] + tk[1]} />
                <line x1={b[0] - tk[0]} y1={b[1] - tk[1]} x2={b[0] + tk[0]} y2={b[1] + tk[1]} />
              </g>
            );
          })}
        {draftEl}
        {measureLine && (
          <g>
            <line x1={measureLine[0][0]} y1={measureLine[0][1]} x2={measureLine[1][0]} y2={measureLine[1][1]} stroke="var(--color-orange-600)" strokeWidth={sw * 1.5} />
            <text
              x={(measureLine[0][0] + measureLine[1][0]) / 2}
              y={(measureLine[0][1] + measureLine[1][1]) / 2 - 8 / zoom}
              fontSize={12 / zoom}
              textAnchor="middle"
              className="fill-orange-700 font-bold tabular-nums"
              paintOrder="stroke"
              stroke="var(--canvas-bg)"
              strokeWidth={3 / zoom}
            >
              {fmt(dist(measureLine[0], measureLine[1]), unit)}
            </text>
          </g>
        )}
        {cursor && DRAW_TOOLS.includes(tool) && <circle cx={cursor[0]} cy={cursor[1]} r={3 / zoom} fill="none" stroke="var(--color-orange-600)" strokeWidth={sw} />}
      </svg>

      <Rulers view={view} w={size.w} h={size.h} unit={unit} />

      {!easy &&
        data?.source.kind === "template" &&
        dims.map((d, i) => {
          if (!d.param) return null;
          const n = norm(perp(sub(d.b, d.a)));
          const m = add(lerp2(d.a, d.b, 0.5), scale(n, d.offset));
          const [x, y] = toScreen(m);
          if (x < 0 || y < 0 || x > size.w || y > size.h) return null;
          const val = Number(data.source.kind === "template" ? data.source.params[d.param] : 0);
          return editingDim === i ? (
            <DimInput
              key={i}
              x={x}
              y={y}
              unit={unit}
              valueMm={val}
              onDone={(mm) => {
                setEditingDim(null);
                if (mm === null) return;
                commit((dd) => (dd.source.kind === "template" ? { ...dd, source: { ...dd.source, params: { ...dd.source.params, [d.param!]: Math.round(mm * 10) / 10 } } } : dd));
              }}
            />
          ) : (
            <button
              key={i}
              type="button"
              onClick={() => setEditingDim(i)}
              aria-label={`Ubah ukuran ${d.param}, saat ini ${fmt(val, unit)}`}
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-md bg-orange-600 px-1.5 py-0.5 text-xs font-bold text-white tabular-nums shadow-sm hover:bg-orange-700"
              style={{ left: x, top: y }}
            >
              {fmt(val, unit)}
            </button>
          );
        })}

      {net.issues
        .filter((i) => i.at && i.level !== "info")
        .slice(0, 12)
        .map((iss, k) => {
          const [x, y] = toScreen(iss.at!);
          if (x < 0 || y < 0 || x > size.w || y > size.h) return null;
          return (
            <button
              key={k}
              type="button"
              onClick={() => iss.panelIds?.[0] && set({ selection: { kind: "panel", id: iss.panelIds[0] } })}
              aria-label={`Peringatan: ${iss.message}`}
              title={iss.message}
              className={cn(
                "absolute z-10 flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xs font-black text-white shadow",
                iss.level === "error" ? "bg-red-600" : "bg-amber-500",
              )}
              style={{ left: x, top: y }}
            >
              !
            </button>
          );
        })}

      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1 rounded-lg border border-stone-200 bg-white/95 p-1 shadow-sm">
        <button type="button" aria-label="Perkecil" className="flex size-8 items-center justify-center rounded-md hover:bg-stone-100" onClick={() => setView((v) => v && { ...v, zoom: clamp(v.zoom / 1.25, 0.05, 40) })}>
          <Minus className="size-4" aria-hidden />
        </button>
        <span className="w-14 text-center text-xs font-semibold tabular-nums" aria-live="polite">
          {Math.round(zoom * 100)}%
        </span>
        <button type="button" aria-label="Perbesar" className="flex size-8 items-center justify-center rounded-md hover:bg-stone-100" onClick={() => setView((v) => v && { ...v, zoom: clamp(v.zoom * 1.25, 0.05, 40) })}>
          <Plus className="size-4" aria-hidden />
        </button>
        <button type="button" aria-label="Paskan pola ke layar" className="flex size-8 items-center justify-center rounded-md hover:bg-stone-100" onClick={fit}>
          <Maximize className="size-4" aria-hidden />
        </button>
      </div>

      <p className="pointer-events-none absolute top-8 right-3 z-10 hidden max-w-xs rounded-lg bg-stone-900/85 px-3 py-1.5 text-xs text-pretty text-stone-50 md:block">
        {HINTS[tool]}
        {cursor && (
          <span className="ml-2 tabular-nums opacity-75">
            {toUnit(cursor[0], unit).toFixed(unit === "mm" ? 0 : 1)}, {toUnit(cursor[1], unit).toFixed(unit === "mm" ? 0 : 1)}
          </span>
        )}
      </p>
    </div>
  );
}

const NetLayer = memo(function NetLayer({
  net,
  sw,
  selectedPanel,
  hoverPanel,
  issuePanels,
  decals,
}: {
  net: ResolvedNet;
  sw: number;
  selectedPanel: string | null;
  hoverPanel: string | null;
  issuePanels: Set<string>;
  decals: ReturnType<typeof decalRenders>;
}) {
  return (
    <g>
      {net.panels.map((p) => (
        <path
          key={p.id}
          d={pointsToPath(p.points, true) + (p.holes ?? []).map((h) => pointsToPath(h, true)).join("")}
          fillRule="evenodd"
          fill={
            p.id === selectedPanel
              ? "var(--panel-fill-selected)"
              : issuePanels.has(p.id)
                ? "rgb(239 68 68 / 0.28)"
                : p.id === hoverPanel
                  ? "var(--panel-fill-hover)"
                  : p.kind === "tab"
                    ? "var(--panel-fill-tab)"
                    : "var(--panel-fill)"
          }
        />
      ))}
      <DecalLayer net={net} decals={decals} />
      {net.lines.map((l, i) => {
        const st = LINE_STYLES[l.type];
        return (
          <line
            key={i}
            x1={l.a[0]}
            y1={l.a[1]}
            x2={l.b[0]}
            y2={l.b[1]}
            stroke={st.cssVar}
            strokeWidth={l.type === "cut" ? sw * 1.2 : sw}
            strokeDasharray={st.dash?.join(" ")}
            strokeLinecap={l.type === "perforation" ? "round" : "butt"}
          />
        );
      })}
    </g>
  );
});

const SketchLayer = memo(function SketchLayer({ sketches, sw, selectedId }: { sketches: Sketch[]; sw: number; selectedId: string | null }) {
  return (
    <g>
      {sketches.map((s) => {
        const st = LINE_STYLES[s.lineType];
        if (s.shape.kind === "text") {
          return (
            <text key={s.id} x={s.shape.at[0]} y={s.shape.at[1]} fontSize={s.shape.size} fill="var(--line-cut)">
              {s.shape.text}
            </text>
          );
        }
        const d = shapeToPath(s.shape);
        return (
          <g key={s.id}>
            {s.id === selectedId && <path d={d} fill="none" stroke="var(--color-orange-400)" strokeWidth={sw * 5} strokeLinecap="round" strokeLinejoin="round" opacity={0.55} />}
            <path d={d} fill="none" stroke={st.cssVar} strokeWidth={sw * 1.2} strokeDasharray={st.dash?.join(" ")} strokeLinecap={s.lineType === "perforation" ? "round" : "butt"} />
          </g>
        );
      })}
    </g>
  );
});

function DimInput({ x, y, unit, valueMm, onDone }: { x: number; y: number; unit: Unit; valueMm: number; onDone: (mm: number | null) => void }) {
  const [v, setV] = useState(String(Number(toUnit(valueMm, unit).toFixed(unit === "in" ? 2 : 1))));
  const done = (ok: boolean) => {
    const n = parseFloat(v.replace(",", "."));
    onDone(ok && Number.isFinite(n) && n > 0 ? fromUnit(n, unit) : null);
  };
  return (
    <input
      autoFocus
      aria-label={`Ukuran baru dalam ${unit}`}
      inputMode="decimal"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => done(true)}
      onKeyDown={(e) => {
        if (e.key === "Enter") done(true);
        if (e.key === "Escape") done(false);
      }}
      className="absolute z-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-md border-2 border-orange-600 bg-white px-1.5 py-0.5 text-center text-sm font-bold tabular-nums"
      style={{ left: x, top: y }}
    />
  );
}

function Rulers({ view, w, h, unit }: { view: View; w: number; h: number; unit: Unit }) {
  const unitMm = unit === "in" ? 25.4 : unit === "cm" ? 10 : 1;
  const candidates = unit === "in" ? [0.125, 0.25, 0.5, 1, 2, 5, 10, 20] : [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
  const step = (candidates.find((c) => c * unitMm * view.zoom >= 56) ?? candidates[candidates.length - 1]) * unitMm;
  const ticks = (from: number, to: number) => {
    const out: number[] = [];
    for (let v = Math.ceil(from / step) * step; v <= to; v += step) out.push(v);
    return out;
  };
  const x0 = view.cx - w / 2 / view.zoom;
  const y0 = view.cy - h / 2 / view.zoom;
  const label = (mm: number) => {
    const v = mm / unitMm;
    return Math.abs(v) < 1e-6 ? "0" : Number(v.toFixed(unit === "in" ? 3 : 0)).toString();
  };
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 text-[10px] text-stone-500 tabular-nums">
      <div className="absolute top-0 right-0 left-0 h-5 border-b border-stone-300 bg-stone-50/90">
        {ticks(x0, x0 + w / view.zoom).map((v) => {
          const x = (v - view.cx) * view.zoom + w / 2;
          return (
            <span key={v} className="absolute top-0 h-full border-l border-stone-400 pl-0.5 leading-5" style={{ left: x }}>
              {label(v)}
            </span>
          );
        })}
      </div>
      <div className="absolute top-5 bottom-0 left-0 w-5 border-r border-stone-300 bg-stone-50/90">
        {ticks(y0, y0 + h / view.zoom).map((v) => {
          const y = (v - view.cy) * view.zoom + h / 2 - 20;
          return (
            <span key={v} className="absolute left-0 w-full border-t border-stone-400" style={{ top: y }}>
              <span className="absolute top-0.5 left-0.5 origin-top-left -rotate-90 translate-y-6 whitespace-nowrap">{label(v)}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
