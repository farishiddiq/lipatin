"use client";

import { decalRenders } from "@/lib/decals";
import { Repeat2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { NetSvg } from "@/components/net/net-svg";
import { LazyFoldViewer } from "@/components/three/lazy";
import { Button, buttonClass } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { billOfMaterials } from "@/lib/bom";
import { resolveProject, type ProjectData } from "@/lib/project";
import { decodeShare } from "@/lib/share";

export function SharedView() {
  const router = useRouter();
  const [state, setState] = useState<{ status: "loading" | "ok" | "bad"; d?: ProjectData; a?: string }>({ status: "loading" });
  const [fold, setFold] = useState(100);

  useEffect(() => {
    const read = () => {
      const res = decodeShare(window.location.hash.slice(1));
      setState(res ? { status: "ok", d: res.d, a: res.a } : { status: "bad" });
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  const net = useMemo(() => {
    if (!state.d) return null;
    try {
      return resolveProject(state.d);
    } catch {
      return null;
    }
  }, [state.d]);
  const bom = useMemo(() => (net && state.d ? billOfMaterials(net, state.d.material) : null), [net, state.d]);

  if (state.status === "loading") return <div className="mx-auto max-w-7xl px-4 py-16 text-sm text-stone-500" aria-busy="true">Membuka link…</div>;
  if (state.status === "bad" || !net || !state.d || !bom) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-start gap-4 px-4 py-16">
        <h1 className="text-2xl font-extrabold">Link tidak bisa dibuka</h1>
        <p className="text-pretty text-stone-600">Link ini rusak atau terpotong saat disalin. Minta pengirimnya menyalin ulang link lengkap dari tombol Bagikan.</p>
        <Link href="/template" className={buttonClass("primary", "md")}>
          Jelajahi template
        </Link>
      </div>
    );
  }

  const remix = () => {
    try {
      sessionStorage.setItem("lipatin-remix", JSON.stringify({ d: state.d, a: state.a }));
    } catch {}
    router.push("/studio?dari=lihat");
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <p className="text-sm font-semibold text-orange-700">Dibagikan lewat Lipatin</p>
      <h1 className="mt-1 text-3xl font-extrabold text-balance">{state.d.title}</h1>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-4">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-stone-200 bg-stone-100">
            <LazyFoldViewer net={net} material={state.d.material} decals={decalRenders(net, state.d.design)} progress={fold / 100} label={`Model 3D ${state.d.title}`} />
          </div>
          <Slider label="Tingkat lipatan" valueText={`${fold}%`} value={fold} min={0} max={100} onChange={setFold} />
        </div>
        <div className="flex flex-col gap-4">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-2xl border border-stone-200 bg-white p-4 text-sm">
            <dt className="text-stone-500">Hasil jadi</dt>
            <dd className="text-right font-semibold tabular-nums">
              {Math.round(bom.folded.w)} × {Math.round(bom.folded.d)} × {Math.round(bom.folded.h)} mm
            </dd>
            <dt className="text-stone-500">Kardus minimum</dt>
            <dd className="text-right font-semibold tabular-nums">
              {Math.round(bom.minSheet.w)} × {Math.round(bom.minSheet.h)} mm
            </dd>
            <dt className="text-stone-500">Material</dt>
            <dd className="text-right font-semibold">{bom.material}</dd>
          </dl>
          <Button variant="primary" size="lg" onClick={remix}>
            <Repeat2 aria-hidden />
            Remix ke Studio-ku
          </Button>
          <div className="rounded-2xl border border-stone-200 bg-white p-4">
            <h2 className="text-sm font-bold">Pola datar</h2>
            <NetSvg net={net} decals={decalRenders(net, state.d.design)} seams className="mt-3 max-h-80 w-full" title="Pola datar" />
          </div>
        </div>
      </div>
    </div>
  );
}
