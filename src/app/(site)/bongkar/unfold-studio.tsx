"use client";

import { Tabs } from "@base-ui/react/tabs";
import { ArrowRight, Loader2, Plus, ScanLine, Trash2, Upload, Wand2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";
import { NetSvg } from "@/components/net/net-svg";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/ui/number-input";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { resolveNet } from "@/lib/geometry/resolve";
import { emptyMods } from "@/lib/geometry/types";
import type { RawMesh, UnfoldResult } from "@/lib/geometry/unfold";
import { foldedMesh, geometryToRaw, loadModelFile, mergeToGeometry, normalizeGeometry, primGeometry, PRIM_LABEL, rawToGeometry, triangleCount, type Prim, type PrimKind } from "@/lib/mesh";
import { netProjectData } from "@/lib/project";
import { FREE_PROJECT_LIMIT, useProjects } from "@/lib/store/projects";
import { defaultParams, TEMPLATES, templateById } from "@/lib/templates";
import { simplifyInWorker, unfoldInWorker } from "@/lib/unfold-client";
import { uid } from "@/lib/utils";
import type { BufferGeometry } from "three";

const ModelViewer = dynamic(() => import("@/components/three/model-viewer").then((m) => m.ModelViewer), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse bg-stone-200" aria-busy="true" />,
});

const LIMIT = { free: 200, pro: 2000 };

const tabCls =
  "flex h-9 flex-1 items-center justify-center rounded-md text-sm font-semibold text-stone-600 select-none hover:text-stone-900 data-active:bg-white data-active:text-stone-900 data-active:shadow-sm";

const newPrim = (kind: PrimKind = "balok", x = 0): Prim => ({ id: uid("m_"), kind, w: 80, h: 80, d: 80, n: kind === "limas" ? 4 : 6, x, z: 0 });

export function UnfoldStudio() {
  const router = useRouter();
  const plan = useProjects((s) => s.plan);
  const create = useProjects((s) => s.create);
  const count = useProjects((s) => Object.keys(s.projects).length);
  const fileId = useId();

  const [source, setSource] = useState<"primitif" | "file" | "galeri">("primitif");
  const [prims, setPrims] = useState<Prim[]>([newPrim("balok")]);
  const [fileGeom, setFileGeom] = useState<BufferGeometry | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [height, setHeight] = useState(150);
  const [tpl, setTpl] = useState("rumah");
  const [simplified, setSimplified] = useState<{ key: string; mesh: RawMesh } | null>(null);
  const [target, setTarget] = useState(150);
  const [tabs, setTabs] = useState(true);
  const [tabWidth, setTabWidth] = useState(10);
  const [thickness, setThickness] = useState(1.5);
  const [mode, setMode] = useState<"shell" | "slice" | "waffle">("shell");
  const [busy, setBusy] = useState<null | "simplify" | "unfold">(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UnfoldResult | null>(null);

  const sourceKey = source === "primitif" ? JSON.stringify(prims) : source === "file" ? `file:${fileName}:${height}` : `tpl:${tpl}`;

  const baseGeom = useMemo(() => {
    if (source === "primitif") return prims.length ? mergeToGeometry(prims.map(primGeometry)) : null;
    if (source === "file") return fileGeom ? normalizeGeometry(fileGeom.clone(), height) : null;
    const t = templateById(tpl);
    if (!t) return null;
    const net = resolveNet(t.build(defaultParams(t), { t: 0, compensate: false }), emptyMods(), [], 0.5);
    return foldedMesh(net);
  }, [source, prims, fileGeom, height, tpl]);

  const geom = useMemo(() => (simplified && simplified.key === sourceKey ? rawToGeometry(simplified.mesh) : baseGeom), [simplified, sourceKey, baseGeom]);
  const tris = geom ? Math.round(triangleCount(geom)) : 0;
  const limit = LIMIT[plan];

  useEffect(() => {
    setResult(null);
    setError(null);
  }, [sourceKey, simplified]);

  const resolved = useMemo(() => (result ? resolveNet(result.net, emptyMods(), [], thickness) : null), [result, thickness]);

  const runSimplify = async () => {
    if (!geom) return;
    setBusy("simplify");
    setError(null);
    try {
      const mesh = await simplifyInWorker(geometryToRaw(geom), target);
      setSimplified({ key: sourceKey, mesh });
    } catch (e) {
      setError(`Penyederhanaan gagal: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  const runUnfold = async () => {
    if (!geom) return;
    if (tris > limit) {
      setError(`Model punya ${tris} sisi segitiga, melebihi batas ${limit} sisi paket ${plan === "pro" ? "Pro" : "Gratis"}. Sederhanakan dulu atau aktifkan Pro.`);
      return;
    }
    setBusy("unfold");
    setError(null);
    try {
      const res = await unfoldInWorker(geometryToRaw(geom), { tabs, tabWidth });
      setResult(res);
    } catch (e) {
      setError(`Gagal membongkar: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  const openInStudio = () => {
    if (!result) return;
    if (plan === "free" && count >= FREE_PROJECT_LIMIT) {
      setError("Batas 10 proyek paket Gratis tercapai. Hapus proyek lama di Proyek saya dulu.");
      return;
    }
    const title = source === "file" ? `Bongkar ${fileName.replace(/\.[^.]+$/, "")}` : source === "galeri" ? `Bongkar ${templateById(tpl)?.title}` : `Bongkar ${prims.map((p) => PRIM_LABEL[p.kind].split(" ")[0].toLowerCase()).join(" + ")}`;
    const p = create(netProjectData(title, result.net, source, thickness));
    router.push(`/studio?id=${p.id}`);
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setLoadingFile(true);
    setFileError(null);
    try {
      const g = await loadModelFile(f);
      setFileGeom(g);
      setFileName(f.name);
    } catch (e) {
      setFileError((e as Error).message);
    } finally {
      setLoadingFile(false);
    }
  };

  const updatePrim = (id: string, patch: Partial<Prim>) => setPrims((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  return (
    <div className="mx-auto max-w-[96rem] px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-extrabold text-balance sm:text-4xl">Unfold Studio</h1>
      <p className="mt-2 max-w-2xl text-pretty text-stone-600">Bangun model dari bentuk dasar atau impor model low-poly, lalu bongkar menjadi jaring-jaring tanpa panel bertumpuk. Bila perlu, model dipecah menjadi beberapa bagian.</p>

      <div className="mt-8 grid gap-6 xl:grid-cols-[22rem_1fr_1fr]">
        <aside className="flex flex-col gap-5">
          <section aria-labelledby="h-sumber" className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-4">
            <h2 id="h-sumber" className="font-bold">
              1. Model 3D
            </h2>
            <Tabs.Root value={source} onValueChange={(v) => setSource(v as typeof source)}>
              <Tabs.List className="flex gap-0.5 rounded-lg bg-stone-200/70 p-0.5">
                <Tabs.Tab value="primitif" className={tabCls}>
                  Bentuk dasar
                </Tabs.Tab>
                <Tabs.Tab value="file" className={tabCls}>
                  Impor
                </Tabs.Tab>
                <Tabs.Tab value="galeri" className={tabCls}>
                  Dari galeri
                </Tabs.Tab>
              </Tabs.List>
              <Tabs.Panel value="primitif" className="mt-4 flex flex-col gap-4">
                {prims.map((p, i) => (
                  <fieldset key={p.id} className="flex flex-col gap-3 rounded-xl border border-stone-200 p-3">
                    <legend className="px-1 text-sm font-bold">Bentuk {i + 1}</legend>
                    <div className="flex items-end gap-2">
                      <Select className="flex-1" label="Jenis" value={p.kind} onChange={(v) => updatePrim(p.id, { kind: v as PrimKind, n: v === "limas" ? 4 : p.n })} options={Object.entries(PRIM_LABEL).map(([value, label]) => ({ value, label }))} />
                      {prims.length > 1 && (
                        <Button variant="ghost" size="icon" aria-label={`Hapus bentuk ${i + 1}`} onClick={() => setPrims((ps) => ps.filter((x) => x.id !== p.id))}>
                          <Trash2 aria-hidden />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <NumberInput label={p.kind === "balok" ? "Lebar" : "Diameter"} value={p.w} min={10} max={600} suffix="mm" onChange={(v) => updatePrim(p.id, { w: v })} />
                      <NumberInput label="Tinggi" value={p.h} min={10} max={600} suffix="mm" onChange={(v) => updatePrim(p.id, { h: v })} />
                      {p.kind === "balok" && <NumberInput label="Kedalaman" value={p.d} min={10} max={600} suffix="mm" onChange={(v) => updatePrim(p.id, { d: v })} />}
                      {["prisma", "limas", "silinder", "kerucut"].includes(p.kind) && <NumberInput label="Jumlah sisi" value={p.n} min={3} max={32} onChange={(v) => updatePrim(p.id, { n: Math.round(v) })} />}
                      {prims.length > 1 && <NumberInput label="Posisi X" value={p.x} min={-600} max={600} step={5} suffix="mm" onChange={(v) => updatePrim(p.id, { x: v })} />}
                    </div>
                  </fieldset>
                ))}
                <Button variant="outline" onClick={() => setPrims((ps) => [...ps, newPrim("limas", ps.length * 110)])}>
                  <Plus aria-hidden />
                  Tambah bentuk
                </Button>
                {prims.length > 1 && <p className="text-xs text-pretty text-stone-500">Setiap bentuk dibongkar menjadi bagian terpisah lalu disatukan dalam satu proyek.</p>}
              </Tabs.Panel>
              <Tabs.Panel value="file" className="mt-4 flex flex-col gap-3">
                <label htmlFor={fileId} className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-stone-300 p-6 text-center hover:border-orange-400">
                  {loadingFile ? <Loader2 className="size-6 animate-spin text-stone-500" aria-hidden /> : <Upload className="size-6 text-stone-500" aria-hidden />}
                  <span className="text-sm font-semibold">{fileName || "Pilih berkas OBJ, STL, atau GLB"}</span>
                  <span className="text-xs text-stone-500">Maksimal 50 MB · model low-poly bekerja paling baik</span>
                </label>
                <input
                  id={fileId}
                  type="file"
                  accept=".obj,.stl,.glb"
                  className="sr-only"
                  aria-describedby={fileError ? `${fileId}-err` : undefined}
                  aria-invalid={!!fileError}
                  onChange={(e) => onFile(e.target.files?.[0])}
                />
                {fileError && (
                  <p id={`${fileId}-err`} role="alert" className="text-sm text-red-700">
                    {fileError}
                  </p>
                )}
                <NumberInput label="Tinggi hasil" value={height} min={20} max={1000} step={5} suffix="mm" onChange={setHeight} />
              </Tabs.Panel>
              <Tabs.Panel value="galeri" className="mt-4 flex flex-col gap-3">
                <Select label="Ambil bentuk dari template" value={tpl} onChange={setTpl} options={TEMPLATES.filter((t) => !t.params.some((p) => p.key === "lid")).map((t) => ({ value: t.id, label: t.title }))} />
                <p className="text-xs text-pretty text-stone-500">Model jadi dari template dibongkar ulang menjadi pola yang bisa diedit bebas.</p>
              </Tabs.Panel>
            </Tabs.Root>
          </section>

          <section aria-labelledby="h-sederhana" className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4">
            <h2 id="h-sederhana" className="font-bold">
              2. Penyederhanaan mesh
            </h2>
            <p className="text-sm text-stone-600 tabular-nums">
              Model saat ini: <strong className="text-stone-900">{tris}</strong> sisi segitiga · batas paket {plan === "pro" ? "Pro" : "Gratis"} {limit}
            </p>
            <Slider label="Target jumlah sisi" valueText={`${target}`} value={target} min={20} max={limit} step={10} onChange={setTarget} />
            <Button variant="outline" onClick={runSimplify} disabled={!geom || busy !== null || tris <= target} aria-busy={busy === "simplify"}>
              {busy === "simplify" ? <Loader2 className="animate-spin" aria-hidden /> : <Wand2 aria-hidden />}
              Sederhanakan
            </Button>
            {tris <= target && <p className="text-xs text-stone-500">Model sudah di bawah target.</p>}
          </section>

          <section aria-labelledby="h-opsi" className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-4">
            <h2 id="h-opsi" className="font-bold">
              3. Cara konstruksi
            </h2>
            <Segmented
              label="Mode konstruksi"
              value={mode}
              onChange={(v) => setMode(v)}
              options={[
                { value: "shell", label: "Shell" },
                { value: "slice", label: "Slice" },
                { value: "waffle", label: "Waffle" },
              ]}
            />
            {mode !== "shell" && (
              <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-pretty text-amber-900">
                Mode {mode === "slice" ? "irisan bertumpuk" : "waffle (slot silang)"} masuk fase berikutnya. Untuk sekarang pola dibuat dengan mode Shell (lipat permukaan).
              </p>
            )}
            <Switch label="Tab lem otomatis" description="Ditaruh di salah satu sisi setiap sambungan, tanpa menumpuk panel lain." checked={tabs} onChange={setTabs} />
            {tabs && <Slider label="Lebar tab" valueText={`${tabWidth} mm`} value={tabWidth} min={4} max={25} onChange={setTabWidth} />}
            <Slider label="Tebal material" valueText={`${thickness.toLocaleString("id-ID")} mm`} value={thickness} min={0.3} max={7} step={0.1} onChange={(v) => setThickness(Math.round(v * 10) / 10)} />
            <Button variant="primary" size="lg" onClick={runUnfold} disabled={!geom || busy !== null} aria-busy={busy === "unfold"} aria-describedby={error ? "unfold-err" : undefined}>
              {busy === "unfold" ? <Loader2 className="animate-spin" aria-hidden /> : <ScanLine aria-hidden />}
              {busy === "unfold" ? "Membongkar…" : "Bongkar jadi pola 2D"}
            </Button>
            {error && (
              <p id="unfold-err" role="alert" className="text-sm text-pretty text-red-700">
                {error}
              </p>
            )}
          </section>
        </aside>

        <section aria-labelledby="h-model" className="flex min-h-[28rem] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-stone-100">
          <h2 id="h-model" className="border-b border-stone-200 px-4 py-3 text-sm font-bold">
            Model 3D
          </h2>
          <div className="relative min-h-0 flex-1">{geom ? <ModelViewer geometry={geom} label={`Model 3D dengan ${tris} sisi. Seret untuk memutar.`} /> : <p className="p-6 text-sm text-stone-500">Belum ada model. Tambahkan bentuk atau impor berkas.</p>}</div>
        </section>

        <section aria-labelledby="h-hasil" className="flex min-h-[28rem] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white">
          <div className="flex items-center justify-between gap-2 border-b border-stone-200 px-4 py-3">
            <h2 id="h-hasil" className="text-sm font-bold">
              Jaring-jaring 2D
            </h2>
            {result && (
              <p className="text-xs text-stone-500 tabular-nums" aria-live="polite">
                {result.faceCount} panel · {result.pieces} bagian · {Math.round(result.ms)} ms
              </p>
            )}
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center bg-stone-50 p-4">
            {resolved ? (
              <NetSvg net={resolved} seams className="max-h-[32rem] w-full" title="Jaring-jaring hasil bongkar dengan nomor pasangan tepi" />
            ) : (
              <div className="flex max-w-xs flex-col items-center gap-3 text-center">
                <p className="text-sm text-pretty text-stone-500">Hasil bongkar muncul di sini, lengkap dengan nomor pasangan tepi (1↔1, 2↔2).</p>
                <Button variant="secondary" onClick={runUnfold} disabled={!geom || busy !== null}>
                  Bongkar sekarang
                </Button>
              </div>
            )}
          </div>
          {resolved && result && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 p-4">
              <p className="text-sm text-stone-600">
                {resolved.issues.filter((i) => i.level === "error").length === 0 ? "Tanpa panel bertumpuk." : "Ada panel bertumpuk — periksa di Studio."} {result.pieces > 1 ? `Dipecah menjadi ${result.pieces} bagian.` : ""}
              </p>
              <Button variant="primary" onClick={openInStudio}>
                Buka di Studio
                <ArrowRight aria-hidden />
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
