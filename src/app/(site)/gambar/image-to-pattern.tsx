"use client";

import { AlertTriangle, ArrowRight, Check, ImageUp, Loader2, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState } from "react";
import { NetSvg } from "@/components/net/net-svg";
import { LazyFoldViewer } from "@/components/three/lazy";
import { SAMPLES, sampleCanvas, TRACE_STEPS, useTrace } from "@/components/trace/use-trace";
import { TracePreview } from "@/components/trace/trace-preview";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { decalRenders } from "@/lib/decals";
import { resolveNet } from "@/lib/geometry/resolve";
import { emptyMods } from "@/lib/geometry/types";
import { defaultMaterial } from "@/lib/materials";
import { buildPattern, CONSTRUCTIONS, type Construction } from "@/lib/photo-pattern";
import { netProjectData } from "@/lib/project";
import { FREE_PROJECT_LIMIT, useProjects } from "@/lib/store/projects";
import type { AnalyzeOpts } from "@/lib/trace";
import { cn } from "@/lib/utils";

export function ImageToPattern() {
  const router = useRouter();
  const fileId = useId();
  const { state, run, fromFile, fromCanvas, reset } = useTrace();
  const [detail, setDetail] = useState(32);
  const [sensitivity, setSensitivity] = useState(100);
  const [keepHoles, setKeepHoles] = useState(true);
  const [construction, setConstruction] = useState<Construction>("relief");
  const [layers, setLayers] = useState(6);
  const [print, setPrint] = useState(true);
  const [width, setWidth] = useState(180);
  const [depth, setDepth] = useState(80);
  const [fold, setFold] = useState(100);
  const [view, setView] = useState<"foto" | "kontur">("foto");
  const [drag, setDrag] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);
  const material = useMemo(defaultMaterial, []);
  const create = useProjects((s) => s.create);
  const count = useProjects((s) => Object.keys(s.projects).length);
  const plan = useProjects((s) => s.plan);

  const opts: AnalyzeOpts = { detail, sensitivity: sensitivity / 100, keepHoles };

  const built = useMemo(() => {
    if (!state.result) return null;
    try {
      const b = buildPattern(state.result, { construction, width, depth, tab: 10, layers, detail, print, keepHoles, thickness: material.thickness });
      const net = resolveNet(b.net, emptyMods(), [], material.thickness);
      return { ...b, resolved: net, decals: decalRenders(net, b.design) };
    } catch {
      return null;
    }
  }, [state.result, construction, width, depth, layers, detail, print, keepHoles, material.thickness]);

  const open = () => {
    if (!built) return;
    if (plan === "free" && count >= FREE_PROJECT_LIMIT) {
      setOpenError("Batas 10 proyek paket Gratis tercapai. Hapus proyek lama di Proyek saya dulu.");
      return;
    }
    const data = netProjectData(`Pola dari ${state.name ?? "foto"}`, built.net, "gambar", material.thickness);
    data.design = built.design;
    const p = create(data);
    router.push(`/studio?id=${p.id}`);
  };

  const errorCount = built?.resolved.issues.filter((i) => i.level === "error").length ?? 0;
  const pieces = built?.resolved.panels.filter((p) => !p.parent).length ?? 0;

  return (
    <div className="mx-auto max-w-[96rem] px-4 py-8 sm:px-8">
      <h1 className="text-[clamp(40px,6vw,88px)] leading-[0.95] font-bold tracking-[-0.03em] text-balance">Foto jadi kardus.</h1>
      <p className="mt-4 max-w-xl text-pretty text-stone-600">Objek dipisahkan dari latar, konturnya jadi pola, dan fotonya ikut tercetak di permukaan kardus.</p>

      <div className="mt-10 grid gap-6 lg:grid-cols-12">
        {/* 1. Masukan */}
        <section aria-labelledby="h-masuk" className="flex flex-col gap-6 rounded-3xl bg-white p-6 shadow-soft lg:col-span-3">
          <h2 id="h-masuk" className="font-bold">
            1. Foto
          </h2>
          <label
            htmlFor={fileId}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              const f = e.dataTransfer.files?.[0];
              if (f) fromFile(f, opts);
            }}
            className={cn(
              "group flex cursor-pointer flex-col items-center gap-2 rounded-2xl bg-stone-100 p-6 text-center transition-[transform,background-color] duration-300 ease-[var(--ease-oil)] hover:bg-sage-100 active:scale-[0.98]",
              drag && "scale-[1.02] bg-sage-100",
            )}
          >
            <ImageUp className="size-8 text-stone-500 transition-transform duration-300 group-hover:-translate-y-1" aria-hidden />
            <span className="text-sm font-semibold">Seret foto ke sini atau pilih berkas</span>
            <span className="text-xs text-stone-500">PNG, JPG, WEBP, SVG · maks 12 MB</span>
          </label>
          <input
            id={fileId}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) fromFile(f, opts);
              e.target.value = "";
            }}
          />
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-stone-700">Atau coba contoh</p>
            <div className="grid grid-cols-4 gap-2">
              {SAMPLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => fromCanvas(sampleCanvas(s.id), s.label, opts)}
                  aria-label={`Contoh ${s.label}`}
                  className="flex aspect-square items-center justify-center rounded-xl bg-stone-100 text-2xl transition-transform duration-200 ease-[var(--ease-oil)] hover:-translate-y-0.5 hover:bg-sage-100 active:scale-95"
                >
                  <span aria-hidden>{s.emoji}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-4 border-t border-stone-100 pt-4">
            <Slider label="Detail kontur" valueText={`${detail} titik`} value={detail} min={8} max={64} onChange={setDetail} onCommit={(v) => state.status !== "idle" && run({ ...opts, detail: v })} />
            <Slider
              label="Sensitivitas latar"
              valueText={`${sensitivity}%`}
              value={sensitivity}
              min={50}
              max={200}
              step={5}
              onChange={setSensitivity}
              onCommit={(v) => state.status !== "idle" && run({ ...opts, sensitivity: v / 100 })}
            />
            <Switch
              label="Pertahankan lubang"
              description="Rongga di dalam objek (gagang, jendela, donat) ikut jadi potongan."
              checked={keepHoles}
              onChange={(v) => {
                setKeepHoles(v);
                if (state.status !== "idle") run({ ...opts, keepHoles: v });
              }}
            />
          </div>
          {state.status !== "idle" && (
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw aria-hidden />
              Mulai ulang
            </Button>
          )}
        </section>

        {/* 2. Kontur */}
        <section aria-labelledby="h-kontur" className="flex min-h-[28rem] flex-col rounded-3xl bg-white p-6 shadow-soft lg:col-span-4" aria-busy={state.status === "loading"}>
          <div className="flex items-center justify-between gap-4">
            <h2 id="h-kontur" className="font-bold">
              2. Objek & kontur
            </h2>
            {state.status === "success" && (
              <Segmented
                size="sm"
                label="Tampilan"
                value={view}
                onChange={setView}
                options={[
                  { value: "foto", label: "Foto" },
                  { value: "kontur", label: "Kontur" },
                ]}
              />
            )}
          </div>
          <div className="mt-4 flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-2xl bg-stone-50">
            {state.status === "idle" && (
              <div className="flex max-w-56 flex-col items-center gap-2 text-center">
                <svg viewBox="0 0 80 80" className="size-20 text-stone-300" aria-hidden>
                  <path d="M12 64V32L40 12l28 20v32z" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="6 5" strokeLinejoin="round" />
                </svg>
                <p className="text-sm text-stone-500">Objek yang terdeteksi muncul di sini.</p>
              </div>
            )}
            {state.status === "loading" && (
              <ol className="flex w-full max-w-64 flex-col gap-2" aria-label="Progres">
                {TRACE_STEPS.map((s, i) => (
                  <li key={s} className={cn("flex items-center gap-2 text-sm transition-opacity duration-300", i > state.step && "opacity-40")}>
                    {i < state.step ? <Check className="size-4 text-sage-600" aria-hidden /> : i === state.step ? <Loader2 className="size-4 animate-spin text-orange-600" aria-hidden /> : <span className="size-4" aria-hidden />}
                    {s}
                  </li>
                ))}
                <li className="mt-2 h-1 overflow-hidden rounded-full bg-stone-200" aria-hidden>
                  <div className="h-full origin-left rounded-full bg-orange-500 transition-transform duration-500 ease-[var(--ease-oil)]" style={{ transform: `scaleX(${(state.step + 1) / TRACE_STEPS.length})` }} />
                </li>
              </ol>
            )}
            {state.status === "error" && (
              <div role="alert" className="flex max-w-64 flex-col items-center gap-3 text-center">
                <AlertTriangle className="size-8 text-orange-600" aria-hidden />
                <p className="text-sm text-pretty text-stone-700">{state.error}</p>
                <p className="text-xs text-stone-500">Satu objek, latar polos, cahaya merata — hasilnya paling akurat.</p>
              </div>
            )}
            {state.status === "success" && state.result && (
              <TracePreview result={state.result} showPhoto={view === "foto"} label={`${state.name}: kontur ${state.result.region.outer.length} titik, ${state.result.region.holes.length} lubang`} />
            )}
          </div>
          {state.status === "success" && state.result && (
            <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
              <div>
                <dt className="text-xs text-stone-500">Kemiripan bentuk</dt>
                <dd className="font-bold tabular-nums">{Math.round(state.result.fidelity * 100)}%</dd>
              </div>
              <div>
                <dt className="text-xs text-stone-500">Titik kontur</dt>
                <dd className="font-bold tabular-nums">{state.result.region.outer.length}</dd>
              </div>
              <div>
                <dt className="text-xs text-stone-500">Lubang</dt>
                <dd className="font-bold tabular-nums">{state.result.region.holes.length}</dd>
              </div>
            </dl>
          )}
        </section>

        {/* 3. Pola & 3D */}
        <section aria-labelledby="h-pola" className="flex min-h-[28rem] flex-col gap-4 rounded-3xl bg-white p-6 shadow-soft lg:col-span-5">
          <h2 id="h-pola" className="font-bold">
            3. Pola & simulasi 3D
          </h2>
          <div role="radiogroup" aria-label="Tipe konstruksi" className="grid gap-2 sm:grid-cols-2">
            {CONSTRUCTIONS.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={construction === c.id}
                onClick={() => setConstruction(c.id)}
                className={cn(
                  "flex flex-col gap-1 rounded-2xl p-3 text-left transition-[transform,background-color] duration-200 ease-[var(--ease-oil)] active:scale-[0.98]",
                  construction === c.id ? "bg-stone-900 text-stone-50" : "bg-stone-100 hover:bg-sage-100",
                )}
              >
                <span className="text-sm font-bold">{c.label}</span>
                <span className={cn("text-xs text-pretty", construction === c.id ? "text-stone-300" : "text-stone-500")}>{c.hint}</span>
              </button>
            ))}
          </div>
          {built ? (
            <>
              <div className="grid min-h-0 flex-1 gap-4 sm:grid-cols-2">
                <div className="relative aspect-square overflow-hidden rounded-2xl bg-stone-100">
                  <LazyFoldViewer net={built.resolved} material={material} decals={built.decals} progress={fold / 100} label="Simulasi 3D dari foto" />
                </div>
                <div className="flex aspect-square items-center justify-center rounded-2xl bg-stone-50 p-4">
                  <NetSvg net={built.resolved} decals={built.decals} seams={construction !== "relief"} className="max-h-full max-w-full" title="Pola 2D hasil foto" />
                </div>
              </div>
              <Slider label={construction === "relief" ? "Rakit lapisan" : "Lipatan"} valueText={`${fold}%`} value={fold} min={0} max={100} onChange={setFold} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Slider label="Lebar jadi" valueText={`${width} mm`} value={width} min={60} max={500} step={5} onChange={setWidth} />
                {construction === "relief" ? (
                  <Slider label="Jumlah lapisan" valueText={`${layers}`} value={layers} min={2} max={14} onChange={setLayers} />
                ) : (
                  <Slider label={construction === "kotak" ? "Tinggi dinding" : construction === "berdiri" ? "Kedalaman alas" : "Ketebalan objek"} valueText={`${depth} mm`} value={depth} min={20} max={300} step={5} onChange={setDepth} />
                )}
              </div>
              <Switch label="Cetak foto di permukaan" description="Foto objek dan warna tepinya ikut tercetak di pola, jadi hasil rakitan mirip aslinya." checked={print} onChange={setPrint} />
              <p className="text-xs text-stone-500 tabular-nums">
                {built.resolved.panels.length} panel · {pieces} bagian potong{construction === "relief" ? ` · tebal relief ${(pieces * material.thickness).toLocaleString("id-ID")} mm` : ""}
              </p>
              {errorCount > 0 && (
                <p role="status" className="rounded-xl bg-orange-50 p-3 text-sm text-pretty text-orange-900">
                  Ada {errorCount} panel bertumpuk. Coba tipe konstruksi lain atau kurangi detail kontur.
                </p>
              )}
              <Button variant="primary" size="lg" onClick={open} aria-describedby={openError ? "open-err" : undefined}>
                Edit di Studio
                <ArrowRight aria-hidden />
              </Button>
              {openError && (
                <p id="open-err" role="alert" className="text-sm text-orange-700">
                  {openError}
                </p>
              )}
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-2xl bg-stone-50 p-6 text-center">
              <p className="max-w-64 text-sm text-pretty text-stone-500">{state.status === "loading" ? "Menyiapkan pola…" : state.status === "success" ? "Konstruksi ini belum cocok untuk bentuk tersebut. Coba tipe lain." : "Pola 2D dan simulasi 3D akan muncul di sini."}</p>
            </div>
          )}
        </section>
      </div>
      <p className="mt-6 text-xs text-stone-500">Deteksi kontur 2D dari foto (bukan rekonstruksi 3D otomatis). Bentuk 3D dibangun dari kontur, lapisan kedalaman, dan foto yang tercetak.</p>
    </div>
  );
}
