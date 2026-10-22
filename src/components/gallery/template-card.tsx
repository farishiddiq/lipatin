"use client";

import { ArrowUpRight, Clock, Rotate3d, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { NetSvg } from "@/components/net/net-svg";
import { LazyFoldViewer } from "@/components/three/lazy";
import { cachedSnapshot, snapshot } from "@/components/three/snapshot";
import { resolveNet } from "@/lib/geometry/resolve";
import { defaultMaterial } from "@/lib/materials";
import { emptyMods } from "@/lib/geometry/types";
import { CATEGORIES, defaultParams, type Template } from "@/lib/templates";
import { cn } from "@/lib/utils";

export const DIFF_LABEL = { mudah: "Mudah", sedang: "Sedang", sulit: "Sulit" } as const;
const DIFF_DOT = { mudah: "bg-sage-500", sedang: "bg-amber-500", sulit: "bg-flame" } as const;

const netCache = new Map<string, ReturnType<typeof resolveNet>>();

/** Pola default template; disimpan per id karena template 3D cukup berat dihitung. */
export function templateNet(t: Template) {
  let net = netCache.get(t.id);
  if (!net) {
    net = resolveNet(t.build(defaultParams(t), { t: 3, compensate: true }), emptyMods(), [], 3);
    netCache.set(t.id, net);
  }
  return net;
}

export function useTemplateNet(t: Template) {
  return useMemo(() => templateNet(t), [t]);
}

/** Hitung pola hanya setelah kartu mendekati layar, supaya galeri tetap ringan. */
function useNearViewport<T extends Element>() {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && setNear(true), { rootMargin: "400px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [near]);
  return [ref, near] as const;
}

function CardNet({ t }: { t: Template }) {
  const net = useTemplateNet(t);
  return <NetSvg net={net} className="max-h-full max-w-full" title={`Pola 2D ${t.title}`} />;
}

/** 3D yang bisa diputar: mulai dari hasil jadi, lalu membuka jadi pola dan terlipat lagi. */
function CardFold({ t }: { t: Template }) {
  const net = useTemplateNet(t);
  const material = useMemo(defaultMaterial, []);
  return <LazyFoldViewer net={net} material={material} loop startFolded autoRotate zoom={false} label={`Model 3D ${t.title}: seret untuk memutar, lalu lihat polanya terbuka`} />;
}

/** Foto hasil jadi (3D terlipat penuh); sebelum siap, pola tampil samar sebagai pengganti. */
function useSnapshot(t: Template, enabled: boolean) {
  const [url, setUrl] = useState<string | null>(() => cachedSnapshot(t.id) ?? null);
  useEffect(() => {
    if (!enabled || url) return;
    let alive = true;
    snapshot(t.id, templateNet(t)).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [enabled, t, url]);
  return url;
}

export function TemplateCard({ t }: { t: Template }) {
  // tampil foto hasil jadi dulu; 3D yang bisa diputar muncul saat kartu disorot (mouse) atau tombol diketuk
  const [live, setLive] = useState(false);
  const [ref, near] = useNearViewport<HTMLDivElement>();
  const shot = useSnapshot(t, near);
  const cat = CATEGORIES.find((c) => c.id === t.category)?.label;
  const isNew = t.tags.includes("jagoan") || t.tags.includes("baru");
  const is3d = t.tags.includes("3d");
  return (
    <article
      className="group flex w-full flex-col overflow-hidden rounded-3xl bg-white shadow-soft transition-transform duration-500 ease-[var(--ease-oil)] hover:-translate-y-1"
      onPointerEnter={(e) => e.pointerType === "mouse" && setLive(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setLive(false)}
    >
      <div ref={ref} className="relative m-2 aspect-[4/3] overflow-hidden rounded-2xl bg-cream">
        {!shot && (
          <div className="absolute inset-0 flex items-center justify-center p-6 opacity-30" aria-hidden>
            {near && <CardNet t={t} />}
          </div>
        )}
        {shot && <img src={shot} alt={`Hasil jadi ${t.title} dalam 3D`} className={cn("absolute inset-0 size-full object-contain transition-opacity duration-300", live && "opacity-0")} />}
        {live && (
          <div className="absolute inset-0">
            <CardFold t={t} />
          </div>
        )}
        {isNew && <span className="absolute top-3 left-3 rounded-full bg-flame px-2 py-1 text-xs font-bold text-white">{is3d ? "Baru · 3D" : "Baru"}</span>}
        <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-stone-600" aria-hidden>
          {live ? "Seret untuk memutar" : "Hasil jadi"}
        </span>
        <button
          type="button"
          onClick={() => setLive((v) => !v)}
          aria-pressed={live}
          aria-label={live ? `Kembali ke foto hasil jadi ${t.title}` : `Putar 3D dan lihat pola ${t.title}`}
          className="absolute top-3 right-3 z-10 flex size-10 items-center justify-center rounded-full bg-white/95 text-ink shadow-soft transition-transform duration-300 ease-[var(--ease-oil)] hover:rotate-12 active:scale-90"
        >
          <Rotate3d className="size-5" aria-hidden />
        </button>
      </div>
      <div className="relative flex flex-1 flex-col gap-2 px-6 pt-2 pb-6">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg leading-tight font-bold tracking-[-0.02em] text-balance">
            <Link
              href={`/studio?template=${t.id}`}
              className="after:absolute after:inset-0 after:rounded-b-3xl after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-orange-600"
            >
              {t.title}
            </Link>
          </h3>
          <ArrowUpRight className="mt-1 size-5 shrink-0 text-stone-400 transition-transform duration-300 ease-[var(--ease-oil)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-flame" aria-hidden />
        </div>
        <p className="line-clamp-1 text-sm text-stone-500">{t.description}</p>
        <ul className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-xs font-semibold text-stone-600">
          <li className="inline-flex items-center gap-1.5">
            <span className={cn("size-2 rounded-full", DIFF_DOT[t.difficulty])} aria-hidden />
            {DIFF_LABEL[t.difficulty]}
          </li>
          <li className="inline-flex items-center gap-1 tabular-nums">
            <Clock className="size-3.5" aria-hidden />
            {t.minutes} mnt
          </li>
          <li className="inline-flex items-center gap-1 tabular-nums">
            <Users className="size-3.5" aria-hidden />
            {t.age}+
          </li>
          <li className="text-stone-500">{cat}</li>
        </ul>
      </div>
    </article>
  );
}
