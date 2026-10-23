"use client";

import { ArrowUpRight, ImagePlus, Loader2, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useMotionValue, useReducedMotion } from "motion/react";
import { useId, useMemo, useRef, useState } from "react";
import { NetSvg } from "@/components/net/net-svg";
import { LazyFoldViewer } from "@/components/three/lazy";
import { templateNet } from "@/components/gallery/template-card";
import { Slider } from "@/components/ui/slider";
import { readDesignFile } from "@/lib/decals";
import { defaultMaterial } from "@/lib/materials";
import { templateById, TEMPLATES } from "@/lib/templates";
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
          <ModelDemo />
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

/* --------------- B. Model 3D → pola (pilih, putar, buka lipatan) --------------- */

const SHOWCASE: { id: string; emoji: string }[] = [
  { id: "controller-ps4", emoji: "🎮" },
  { id: "borobudur-3d", emoji: "🛕" },
  { id: "sphinx-3d", emoji: "🏺" },
  { id: "kulkas-mainan", emoji: "🧊" },
  { id: "arcade-mini", emoji: "🕹️" },
  { id: "meja-foosball", emoji: "⚽" },
];

function ModelDemo() {
  const [id, setId] = useState(SHOWCASE[0].id);
  const [fold, setFold] = useState(100);
  const t = templateById(id)!;
  const net = useMemo(() => templateNet(t), [t]);
  const material = useMemo(defaultMaterial, []);
  return (
    <section aria-labelledby="demo-model" className={cn(CARD, "col-span-12 lg:col-span-6")}>
      <div className="flex items-baseline justify-between gap-4">
        <h3 id="demo-model" className="text-2xl font-bold tracking-[-0.02em]">
          Model 3D → pola
        </h3>
        <Link href={`/studio?template=${id}`} className="inline-flex items-center gap-1 text-xs font-bold text-stone-600 hover:text-ink">
          Buka di studio
          <ArrowUpRight className="size-3.5" aria-hidden />
        </Link>
      </div>

      <div className="grid aspect-[4/3] grid-cols-2 gap-2 overflow-hidden rounded-2xl">
        <div className="relative rounded-2xl bg-sage-100">
          <PauseOffscreen className="size-full">
            <LazyFoldViewer net={net} material={material} progress={fold / 100} autoRotate zoom={false} label={`Model 3D ${t.title}, seret untuk memutar`} />
          </PauseOffscreen>
        </div>
        <div className="flex items-center justify-center rounded-2xl bg-white p-4">
          <NetSvg net={net} className="max-h-full max-w-full" title={`Pola potong ${t.title}`} />
        </div>
      </div>

      <div role="radiogroup" aria-label="Pilih model" className="flex flex-wrap items-center gap-2">
        {SHOWCASE.map((s) => {
          const m = templateById(s.id)!;
          return (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={id === s.id}
              onClick={() => setId(s.id)}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-[transform,background-color,color] duration-300 ease-[var(--ease-oil)] active:scale-95",
                id === s.id ? "bg-flame text-white" : "bg-white text-ink hover:-translate-y-0.5",
              )}
            >
              <span aria-hidden>{s.emoji}</span>
              {m.title.replace(/ 3D$/, "")}
            </button>
          );
        })}
      </div>
      <Slider label="Lipatan" valueText={`${fold}%`} value={fold} min={0} max={100} onChange={setFold} />
      <p className="text-sm text-stone-600">
        Satu dari <span className="font-semibold text-ink tabular-nums">{TEMPLATES.length}</span> model: mainan, budaya, cita-cita, dan hobi.
      </p>
    </section>
  );
}
