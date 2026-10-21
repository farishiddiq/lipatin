"use client";

import { ArrowUpRight, Clock, Rotate3d, Users } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { NetSvg } from "@/components/net/net-svg";
import { LazyFoldViewer } from "@/components/three/lazy";
import { resolveNet } from "@/lib/geometry/resolve";
import { emptyMods } from "@/lib/geometry/types";
import { defaultMaterial } from "@/lib/materials";
import { CATEGORIES, defaultParams, type Template } from "@/lib/templates";
import { cn } from "@/lib/utils";

export const DIFF_LABEL = { mudah: "Mudah", sedang: "Sedang", sulit: "Sulit" } as const;
const DIFF_DOT = { mudah: "bg-sage-500", sedang: "bg-amber-500", sulit: "bg-flame" } as const;

export function useTemplateNet(t: Template) {
  return useMemo(() => resolveNet(t.build(defaultParams(t), { t: 3, compensate: true }), emptyMods(), [], 3), [t]);
}

export function TemplateCard({ t }: { t: Template }) {
  const net = useTemplateNet(t);
  const [show3d, setShow3d] = useState(false);
  const material = useMemo(defaultMaterial, []);
  const cat = CATEGORIES.find((c) => c.id === t.category)?.label.replace(" (bangun ruang)", "");
  const isNew = t.tags.includes("jagoan") || t.tags.includes("baru");
  return (
    <article
      className="group flex w-full flex-col overflow-hidden rounded-3xl bg-white shadow-soft transition-transform duration-500 ease-[var(--ease-oil)] hover:-translate-y-1"
      onPointerEnter={(e) => e.pointerType === "mouse" && setShow3d(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setShow3d(false)}
    >
      <div className="relative m-2 aspect-[4/3] overflow-hidden rounded-2xl bg-cream">
        {show3d ? (
          <LazyFoldViewer net={net} material={material} loop autoRotate label={`Pratinjau 3D ${t.title}, bisa diputar`} />
        ) : (
          <div className="flex size-full items-center justify-center p-6 transition-transform duration-500 ease-[var(--ease-oil)] group-hover:scale-[1.03]">
            <NetSvg net={net} className="max-h-full max-w-full" title={`Pola 2D ${t.title}`} />
          </div>
        )}
        {isNew && <span className="absolute top-3 left-3 rounded-full bg-flame px-2 py-1 text-xs font-bold text-white">Baru</span>}
        <button
          type="button"
          onClick={() => setShow3d((v) => !v)}
          aria-pressed={show3d}
          aria-label={show3d ? `Lihat pola 2D ${t.title}` : `Putar 3D ${t.title}`}
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
