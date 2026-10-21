"use client";

import { decalRenders } from "@/lib/decals";
import { ArrowLeft, ArrowRight, Expand, ShieldAlert, Shrink } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NetSvg } from "@/components/net/net-svg";
import { LazyFoldViewer } from "@/components/three/lazy";
import { Button, buttonClass } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useProjectQuery } from "@/components/use-project-query";
import { assemblySteps } from "@/lib/assembly";
import { billOfMaterials } from "@/lib/bom";
import { resolveProject, templateOf } from "@/lib/project";
import { cn } from "@/lib/utils";

const SAFETY = [
  "Memotong dengan cutter selalu ditemani orang dewasa. Anak cukup menggambar, melipat, dan menempel.",
  "Arahkan pisau menjauhi tubuh dan tangan yang memegang penggaris.",
  "Pakai alas potong, jangan memotong di atas meja atau pangkuan.",
  "Tutup kembali mata cutter setiap kali selesai memotong.",
  "Gunakan lem putih atau selotip. Lem tembak panas hanya dipakai orang dewasa.",
];

const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

export function GuideView() {
  const q = useProjectQuery();
  const net = useMemo(() => (q.data ? resolveProject(q.data) : null), [q.data]);
  const steps = useMemo(() => (net ? assemblySteps(net) : []), [net]);
  const bom = useMemo(() => (net && q.data ? billOfMaterials(net, q.data.material) : null), [net, q.data]);
  const [i, setI] = useState(0);
  const [kids, setKids] = useState(false);
  const [full, setFull] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const t = q.data ? templateOf(q.data) : undefined;
    if (t && t.age <= 8) setKids(true);
  }, [q.data]);

  useEffect(() => {
    const on = () => setFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);

  const go = useCallback(
    (n: number) => {
      setI(Math.max(0, Math.min(steps.length - 1, n)));
      heading.current?.focus();
    },
    [steps.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input,textarea,select,[role=slider]")) return;
      if (e.key === "ArrowRight") go(i + 1);
      if (e.key === "ArrowLeft") go(i - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [i, go]);

  const step = steps[i];
  const timeline = useMemo(() => {
    if (!net || !step) return undefined;
    if (step.kind !== "fold") return () => (step.kind === "done" ? 1 : 0);
    const d = step.depth!;
    return (t: number) => {
      const T = 3;
      const k = Number.isFinite(t) ? ease(Math.min(1, (t % (T + 1.5)) / T)) : 1;
      return (id: string) => {
        const dd = net.depth.get(id) ?? 0;
        return dd < d ? 1 : dd === d ? k : 0;
      };
    };
  }, [net, step]);

  if (q.status === "loading") return <div className="mx-auto max-w-7xl px-4 py-16 text-sm text-stone-500" aria-busy="true">Memuat panduan…</div>;
  if (!q.data || !net || !step || !bom) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-start gap-4 px-4 py-16">
        <h1 className="text-2xl font-extrabold">Panduan tidak ditemukan</h1>
        <p className="text-stone-600">Buka panduan dari proyek di Studio, atau pilih template untuk dicoba.</p>
        <Link href="/template" className={buttonClass("primary", "md")}>
          Pilih template
        </Link>
      </div>
    );
  }

  const toggleFull = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await box.current?.requestFullscreen();
    } catch {
      setFull(false);
    }
  };

  const show3d = step.kind === "fold" || step.kind === "done";

  return (
    <div ref={box} className={cn("mx-auto max-w-7xl px-4 py-8 sm:px-6", full && "flex h-dvh max-w-none flex-col overflow-y-auto bg-stone-50 py-4")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col">
          <Link href={q.id ? `/studio?id=${q.id}` : "/template"} className="inline-flex items-center gap-1 text-sm font-semibold text-stone-600 hover:text-stone-900">
            <ArrowLeft className="size-4" aria-hidden />
            {q.id ? "Kembali ke Studio" : "Galeri template"}
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold text-balance sm:text-3xl">Panduan rakit: {q.data.title}</h1>
        </div>
        <div className="flex items-center gap-4">
          <Switch label="Mode anak" checked={kids} onChange={setKids} className="items-center" />
          <Button variant="outline" size="md" onClick={toggleFull}>
            {full ? <Shrink aria-hidden /> : <Expand aria-hidden />}
            {full ? "Keluar layar penuh" : "Layar penuh"}
          </Button>
        </div>
      </div>

      {kids && (
        <section aria-labelledby="h-aman" className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <h2 id="h-aman" className="flex items-center gap-2 font-bold text-amber-950">
            <ShieldAlert className="size-5" aria-hidden />
            Tips keselamatan
          </h2>
          <ul className="mt-2 grid list-disc gap-1 pl-6 text-sm text-pretty text-amber-950 sm:grid-cols-2">
            {SAFETY.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-6 grid flex-1 gap-6 lg:grid-cols-[18rem_1fr]">
        <nav aria-label="Daftar langkah" className="order-2 lg:order-1">
          <ol className="flex flex-col gap-1">
            {steps.map((s, k) => (
              <li key={k}>
                <button
                  type="button"
                  onClick={() => go(k)}
                  aria-current={k === i ? "step" : undefined}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left text-sm",
                    k === i ? "bg-orange-100 font-bold text-orange-950" : "text-stone-700 hover:bg-stone-100",
                  )}
                >
                  <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums", k < i ? "bg-orange-600 text-white" : "bg-stone-200")}>{k + 1}</span>
                  <span className="pt-0.5">{s.title}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <section aria-live="polite" className="order-1 flex flex-col gap-4 lg:order-2">
          <div className="relative aspect-[4/3] max-h-[60vh] w-full overflow-hidden rounded-2xl border border-stone-200 bg-stone-100">
            {show3d ? (
              <LazyFoldViewer net={net} material={q.data.material} decals={decalRenders(net, q.data.design)} timeline={timeline} autoRotate={step.kind === "done"} label={`Animasi 3D langkah ${i + 1}: ${step.title}`} />
            ) : (
              <div className="flex size-full items-center justify-center p-6">
                <NetSvg net={net} decals={decalRenders(net, q.data.design)} seams className="max-h-full max-w-full" title={`Pola datar untuk langkah ${i + 1}`} />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-orange-700 tabular-nums">
              Langkah {i + 1} dari {steps.length}
            </p>
            <h2 ref={heading} tabIndex={-1} className="text-2xl font-extrabold text-balance outline-none">
              {step.title}
            </h2>
            <p className="max-w-2xl text-lg text-pretty text-stone-700">{step.body}</p>
            {step.kind === "prep" && (
              <ul className="mt-1 list-disc pl-6 text-stone-700">
                <li>{bom.material}, minimal {Math.round(bom.minSheet.w)} × {Math.round(bom.minSheet.h)} mm</li>
                <li>{bom.glue}</li>
                {bom.tools.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-3 pb-[env(safe-area-inset-bottom)]">
            <Button size="lg" variant="outline" className="h-14 text-base" onClick={() => go(i - 1)} disabled={i === 0}>
              <ArrowLeft aria-hidden />
              Sebelumnya
            </Button>
            {i < steps.length - 1 ? (
              <Button size="lg" variant="primary" className="h-14 text-base" onClick={() => go(i + 1)}>
                Langkah berikutnya
                <ArrowRight aria-hidden />
              </Button>
            ) : (
              <Link href={q.id ? `/studio?id=${q.id}` : "/template"} className={buttonClass("primary", "lg", "h-14 text-base")}>
                Kembali ke Studio
              </Link>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
