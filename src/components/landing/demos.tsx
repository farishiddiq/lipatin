"use client";

import { AlertTriangle, ImagePlus, Loader2, RotateCcw, Upload } from "lucide-react";
import { useMotionValue, useReducedMotion } from "motion/react";
import { useId, useMemo, useRef, useState } from "react";
import { NetSvg } from "@/components/net/net-svg";
import { LazyFoldViewer } from "@/components/three/lazy";
import { SAMPLES, sampleCanvas, TRACE_STEPS, useTrace } from "@/components/trace/use-trace";
import { TracePreview } from "@/components/trace/trace-preview";
import { Slider } from "@/components/ui/slider";
import { readDesignFile } from "@/lib/decals";
import { resolveNet } from "@/lib/geometry/resolve";
import { emptyMods } from "@/lib/geometry/types";
import { defaultMaterial } from "@/lib/materials";
import { decalRenders } from "@/lib/decals";
import { buildPattern, CONSTRUCTIONS, type Construction } from "@/lib/photo-pattern";
import type { AnalyzeOpts } from "@/lib/trace";

const DEMO_OPTS: AnalyzeOpts = { detail: 32, sensitivity: 1, keepHoles: true };
import { cn } from "@/lib/utils";
import { CardboardBox, FACES, type Face } from "./cardboard-box";
import { LOGO_SAMPLE } from "./logo-sample";
import { InkEdge, PauseOffscreen, Section, SplitReveal } from "./motion-kit";

const H2 = "text-[clamp(40px,6vw,96px)] leading-[0.92] font-bold tracking-[-0.03em] text-balance";
const CARD = "flex flex-col gap-6 rounded-3xl bg-cream p-6 text-ink shadow-soft md:p-8";
const chip = (on: boolean) =>
  cn("h-8 rounded-full px-4 text-xs font-bold transition-[transform,background-color,color] duration-300 ease-[var(--ease-oil)] active:scale-95", on ? "bg-flame text-white" : "bg-white text-ink hover:bg-sage-100");

export function Demos() {
  return (
    <div className="relative bg-flame">
      <InkEdge color="#ea2e00" id="ink-flame" />
      <Section label="Simulasi interaktif" className="py-24">
        <div className="mx-auto grid max-w-[1440px] grid-cols-12 gap-6 px-6 md:px-16">
          <SplitReveal as="h2" text="Coba langsung di sini." className={cn(H2, "col-span-12 mb-8 text-cream")} />
          <LogoDemo />
          <ImageDemo />
        </div>
      </Section>
    </div>
  );
}

/* ---------------------- A. Logo di sisi kardus (ringan) ---------------------- */

function LogoDemo() {
  const fileId = useId();
  const reduced = useReducedMotion();
  const [logo, setLogo] = useState(LOGO_SAMPLE);
  const [sel, setSel] = useState<Face[]>(["depan", "kanan"]);
  const [scale, setScale] = useState(100);
  const [rot, setRot] = useState(0);
  const [foldPct, setFoldPct] = useState(100);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fold = useMotionValue(1);
  const lid = useMotionValue(1);
  const rotY = useMotionValue(-34);
  const drag = useRef<{ x: number; r: number } | null>(null);

  const logos = useMemo(() => Object.fromEntries(sel.map((f) => [f, { src: logo, scale: scale / 100, rotation: rot }])), [sel, logo, scale, rot]);
  const toggle = (f: Face) => setSel((s) => (s.includes(f) ? s.filter((x) => x !== f) : [...s, f]));

  return (
    <section aria-labelledby="demo-logo" className={cn(CARD, "col-span-12 lg:col-span-6")}>
      <div className="flex items-baseline justify-between gap-4">
        <h3 id="demo-logo" className="text-2xl font-bold tracking-[-0.02em]">
          Logo di sisi kardus
        </h3>
        <span className="text-xs font-bold text-stone-500 tabular-nums">{sel.length}/6 sisi</span>
      </div>
      <div
        className="relative flex aspect-[4/3] touch-none items-center justify-center overflow-hidden rounded-2xl bg-sage-100"
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, r: rotY.get() };
          (e.currentTarget as Element).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => drag.current && rotY.set(drag.current.r + (e.clientX - drag.current.x) * 0.5)}
        onPointerUp={() => (drag.current = null)}
        data-cursor="grow"
      >
        <CardboardBox size={150} fold={fold} lid={lid} rotateY={rotY} rotateX={-24} logos={logos} selected={sel} onFace={toggle} />
        <span className="absolute bottom-4 left-4 text-xs font-semibold text-stone-600">Seret untuk memutar · klik sisi untuk memilih</span>
      </div>
      <div role="group" aria-label="Pilih sisi" className="flex flex-wrap gap-2">
        {FACES.map((f) => (
          <button key={f.id} type="button" aria-pressed={sel.includes(f.id)} onClick={() => toggle(f.id)} className={chip(sel.includes(f.id))}>
            {f.label}
          </button>
        ))}
        <button type="button" onClick={() => setSel(sel.length === 6 ? [] : FACES.map((f) => f.id))} className={chip(false)}>
          {sel.length === 6 ? "Kosongkan" : "Semua sisi"}
        </button>
      </div>
      <div className="grid gap-6 sm:grid-cols-3">
        <Slider label="Skala" valueText={`${scale}%`} value={scale} min={30} max={140} onChange={setScale} />
        <Slider label="Rotasi" valueText={`${rot}°`} value={rot} min={-180} max={180} onChange={setRot} />
        <Slider
          label="Lipatan"
          valueText={`${foldPct}%`}
          value={foldPct}
          min={0}
          max={100}
          onChange={(v) => {
            setFoldPct(v);
            fold.set(Math.min(1, v / 70));
            lid.set(Math.max(0, (v - 70) / 30));
          }}
        />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <label htmlFor={fileId} className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-cream transition-transform duration-300 ease-[var(--ease-oil)] hover:-translate-y-0.5 active:scale-95">
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ImagePlus className="size-4" aria-hidden />}
          {busy ? "Memproses…" : "Unggah logo"}
        </label>
        <input
          id={fileId}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,.svg"
          className="sr-only"
          aria-invalid={!!error}
          aria-describedby={error ? `${fileId}-err` : undefined}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            setBusy(true);
            setError(null);
            try {
              setLogo((await readDesignFile(f)).src);
              if (!sel.length) setSel(["depan"]);
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        />
        {logo !== LOGO_SAMPLE && (
          <button type="button" onClick={() => setLogo(LOGO_SAMPLE)} className="inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold hover:bg-white">
            <RotateCcw className="size-4" aria-hidden />
            Logo contoh
          </button>
        )}
        {error && (
          <p id={`${fileId}-err`} role="alert" className="text-sm font-semibold text-orange-700">
            {error}
          </p>
        )}
      </div>
      {reduced && <span className="sr-only">Animasi dikurangi sesuai pengaturan perangkat.</span>}
    </section>
  );
}

/* ------------------------ B. Foto → pola → 3D (ringan) ------------------------ */

function ImageDemo() {
  const fileId = useId();
  const { state, fromFile, fromCanvas, reset } = useTrace();
  const [construction, setConstruction] = useState<Construction>("relief");
  const [fold, setFold] = useState(100);
  const material = useMemo(defaultMaterial, []);
  const built = useMemo(() => {
    if (!state.result) return null;
    try {
      const b = buildPattern(state.result, { construction, width: 160, depth: 70, tab: 10, layers: 6, detail: 32, print: true, keepHoles: true, thickness: 3 });
      const net = resolveNet(b.net, emptyMods(), [], 3);
      return { net, decals: decalRenders(net, b.design) };
    } catch {
      return null;
    }
  }, [state.result, construction]);
  const net = built?.net ?? null;

  return (
    <section aria-labelledby="demo-gambar" className={cn(CARD, "col-span-12 lg:col-span-6")} aria-busy={state.status === "loading"}>
      <div className="flex items-baseline justify-between gap-4">
        <h3 id="demo-gambar" className="text-2xl font-bold tracking-[-0.02em]">
          Foto → pola → 3D
        </h3>
        {state.status !== "idle" && (
          <button type="button" onClick={reset} className="inline-flex items-center gap-1 text-xs font-bold text-stone-600 hover:text-ink">
            <RotateCcw className="size-3.5" aria-hidden />
            Ulang
          </button>
        )}
      </div>

      <div className="grid aspect-[4/3] grid-cols-2 gap-2 overflow-hidden rounded-2xl">
        <div className="relative flex items-center justify-center rounded-2xl bg-white p-4">
          {state.status === "idle" && (
            <label htmlFor={fileId} className="group flex cursor-pointer flex-col items-center gap-2 text-center">
              <Upload className="size-8 text-stone-400 transition-transform duration-300 ease-[var(--ease-oil)] group-hover:-translate-y-1" aria-hidden />
              <span className="text-sm font-semibold">Unggah foto objek</span>
              <span className="text-xs text-stone-500">atau pilih contoh di bawah</span>
            </label>
          )}
          {state.status === "loading" && (
            <div className="flex w-full flex-col gap-2">
              <Loader2 className="size-6 animate-spin text-flame" aria-hidden />
              <p className="text-sm font-semibold">{TRACE_STEPS[Math.min(state.step, TRACE_STEPS.length - 1)]}…</p>
              <div className="h-1 overflow-hidden rounded-full bg-stone-200" aria-hidden>
                <div className="h-full origin-left rounded-full bg-flame transition-transform duration-500 ease-[var(--ease-oil)]" style={{ transform: `scaleX(${(state.step + 1) / TRACE_STEPS.length})` }} />
              </div>
            </div>
          )}
          {state.status === "error" && (
            <div role="alert" className="flex flex-col items-center gap-2 text-center">
              <AlertTriangle className="size-6 text-flame" aria-hidden />
              <p className="text-xs text-pretty text-stone-700">{state.error}</p>
            </div>
          )}
          {state.status === "success" && state.result && <TracePreview result={state.result} label={`Objek ${state.name} dan konturnya`} />}
        </div>
        <div className="relative flex items-center justify-center rounded-2xl bg-sage-100">
          {net ? (
            <PauseOffscreen className="size-full">
              <LazyFoldViewer net={net} material={material} decals={built?.decals} progress={fold / 100} label="Simulasi 3D dari foto" />
            </PauseOffscreen>
          ) : (
            <svg viewBox="0 0 80 80" className="size-16 fill-none stroke-sage-500" aria-hidden>
              <path d="M12 58V28l28-14 28 14v30L40 72z" strokeWidth="3" strokeDasharray="6 5" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </div>
      <input
        id={fileId}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) fromFile(f, DEMO_OPTS);
        }}
      />

      <div role="group" aria-label="Contoh gambar" className="flex flex-wrap items-center gap-2">
        {SAMPLES.map((s) => (
          <button key={s.id} type="button" aria-label={`Contoh ${s.label}`} onClick={() => fromCanvas(sampleCanvas(s.id), s.label, DEMO_OPTS)} className="flex size-10 items-center justify-center rounded-full bg-white text-lg transition-transform duration-300 ease-[var(--ease-oil)] hover:-translate-y-1 active:scale-90">
            <span aria-hidden>{s.emoji}</span>
          </button>
        ))}
        <label htmlFor={fileId} className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-cream transition-transform duration-300 ease-[var(--ease-oil)] hover:-translate-y-0.5 active:scale-95">
          <Upload className="size-4" aria-hidden />
          Unggah
        </label>
      </div>

      <div role="radiogroup" aria-label="Tipe konstruksi" className="flex flex-wrap gap-2">
        {CONSTRUCTIONS.map((c) => (
          <button key={c.id} type="button" role="radio" aria-checked={construction === c.id} onClick={() => setConstruction(c.id)} className={chip(construction === c.id)}>
            {c.label}
          </button>
        ))}
      </div>
      {net ? (
        <div className="grid items-center gap-6 sm:grid-cols-[1fr_8rem]">
          <Slider label="Lipatan" valueText={`${fold}%`} value={fold} min={0} max={100} onChange={setFold} />
          <NetSvg net={net} decals={built?.decals} className="h-16 w-full" title="Pola 2D" />
        </div>
      ) : (
        <p className="text-sm text-stone-600">{state.status === "loading" ? "Menyiapkan pola…" : "Pilih contoh untuk melihat pola dan lipatannya."}</p>
      )}
    </section>
  );
}
