"use client";

import { ArrowLeft, Download, FileImage, FileText, Loader2, PenTool } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useProjectQuery } from "@/components/use-project-query";
import { assemblySteps } from "@/lib/assembly";
import { billOfMaterials } from "@/lib/bom";
import { computeTiling, download, exportPdf, exportPng, exportSvg, fileSlug, PAPERS, tileName, type Paper } from "@/lib/export";
import { pointsToPath } from "@/lib/geometry/sketch";
import { LINE_STYLES } from "@/lib/line-styles";
import { decalRenders } from "@/lib/decals";
import { DecalLayer } from "@/components/net/decal-layer";
import { resolveProject } from "@/lib/project";
import { useProjects } from "@/lib/store/projects";

type Format = "pdf" | "svg" | "png";

export function ExportView() {
  const q = useProjectQuery();
  const plan = useProjects((s) => s.plan);
  const [format, setFormat] = useState<Format>("pdf");
  const [paper, setPaper] = useState<Paper>("A4");
  const [orientation, setOrientation] = useState<"auto" | "portrait" | "landscape">("auto");
  const [overlap, setOverlap] = useState(10);
  const [seams, setSeams] = useState(true);
  const [dpi, setDpi] = useState("300");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const net = useMemo(() => (q.data ? resolveProject(q.data) : null), [q.data]);
  const bom = useMemo(() => (net && q.data ? billOfMaterials(net, q.data.material) : null), [net, q.data]);
  const decals = useMemo(() => (net ? decalRenders(net, q.data?.design) : []), [net, q.data]);
  const tiling = useMemo(() => (net ? computeTiling(net, paper, orientation, overlap) : null), [net, paper, orientation, overlap]);

  if (q.status === "loading") return <div className="mx-auto max-w-7xl px-4 py-16 text-sm text-stone-500" aria-busy="true">Memuat proyek…</div>;
  if (q.status === "missing" || !q.data || !net || !bom || !tiling) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-start gap-4 px-4 py-16">
        <h1 className="text-2xl font-extrabold">Proyek tidak ditemukan</h1>
        <p className="text-stone-600">Buka proyek dari Studio atau Proyek saya untuk mengekspornya.</p>
        <Link href="/dashboard" className={buttonClass("primary", "md")}>
          Ke Proyek saya
        </Link>
      </div>
    );
  }

  const free = plan === "free";
  const svgLocked = free && format === "svg";
  const pages = tiling.cols * tiling.rows;
  const errors = net.issues.filter((i) => i.level === "error");

  const run = async () => {
    setBusy(true);
    setError(null);
    setDone(null);
    const name = fileSlug(q.data!.title);
    try {
      if (format === "pdf") {
        const blob = await exportPdf(net, { paper, orientation, overlap, seams, watermark: free, title: q.data!.title, bom, decals, steps: assemblySteps(net).map((s) => `${s.title}. ${s.body}`) });
        download(blob, `${name}-${paper}.pdf`);
        setDone(`PDF ${pages + 1} halaman siap (1 sampul + ${pages} halaman pola).`);
      } else if (format === "svg") {
        download(new Blob([exportSvg(net, { seams, decals })], { type: "image/svg+xml" }), `${name}.svg`);
        setDone("SVG berlapis (potong, gunung, lembah, perforasi, score, nomor) siap.");
      } else {
        download(await exportPng(net, Number(dpi), seams, free, decals), `${name}-${dpi}dpi.png`);
        setDone(`PNG ${dpi} dpi siap.`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ekspor gagal. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  const pad = 6;
  const ox = tiling.origin[0];
  const oy = tiling.origin[1];
  const totalW = (tiling.cols - 1) * tiling.step[0] + tiling.printW;
  const totalH = (tiling.rows - 1) * tiling.step[1] + tiling.printH;
  const sw = Math.max(totalW, totalH) / 400;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Link href={q.id ? `/studio?id=${q.id}` : "/template"} className="inline-flex items-center gap-1 text-sm font-semibold text-stone-600 hover:text-stone-900">
        <ArrowLeft className="size-4" aria-hidden />
        Kembali ke Studio
      </Link>
      <h1 className="mt-3 text-3xl font-extrabold text-balance">Ekspor & cetak</h1>
      <p className="mt-1 text-stone-600">{q.data.title}</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <section aria-labelledby="h-pratinjau" className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 id="h-pratinjau" className="font-bold">
              Pratinjau halaman cetak
            </h2>
            <p className="text-sm text-stone-600 tabular-nums">
              {format === "pdf" ? `${pages} halaman ${paper} ${tiling.landscape ? "mendatar" : "tegak"} + sampul` : `${Math.round(bom.net.w)} × ${Math.round(bom.net.h)} mm`}
            </p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-stone-100 p-4">
            <svg viewBox={`${ox - pad} ${oy - pad} ${totalW + pad * 2} ${totalH + pad * 2}`} className="max-h-[60vh] w-full" role="img" aria-label={`Pola dibagi menjadi ${pages} halaman ${paper}`}>
              {format === "pdf" &&
                Array.from({ length: tiling.rows }).flatMap((_, r) =>
                  Array.from({ length: tiling.cols }).map((__, c) => {
                    const x = ox + c * tiling.step[0];
                    const y = oy + r * tiling.step[1];
                    return (
                      <g key={`${r}-${c}`}>
                        <rect x={x} y={y} width={tiling.printW} height={tiling.printH} fill="white" fillOpacity={0.85} stroke="var(--color-stone-400)" strokeWidth={sw} strokeDasharray={`${sw * 4} ${sw * 3}`} className="" />
                        <text x={x + sw * 8} y={y + sw * 22} fontSize={sw * 18} className="fill-stone-500 font-bold">
                          {tileName(r, c)}
                        </text>
                      </g>
                    );
                  }),
                )}
              {net.panels.map((p) => (
                <path key={p.id} d={pointsToPath(p.points, true) + (p.holes ?? []).map((h) => pointsToPath(h, true)).join("")} fillRule="evenodd" fill={p.kind === "tab" ? "var(--panel-fill-tab)" : "var(--panel-fill)"} />
              ))}
              <DecalLayer net={net} decals={decals} />
              {net.lines.map((l, i) => (
                <line key={i} x1={l.a[0]} y1={l.a[1]} x2={l.b[0]} y2={l.b[1]} stroke={LINE_STYLES[l.type].cssVar} strokeWidth={sw * 1.4} strokeDasharray={LINE_STYLES[l.type].dash?.join(" ")} />
              ))}
            </svg>
          </div>
          {errors.length > 0 && (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-pretty text-red-900">
              Pola masih punya {errors.length} masalah (mis. panel bertumpuk). Kamu tetap bisa mengekspor, tapi sebaiknya perbaiki dulu di tab Cek pada Studio.
            </p>
          )}
        </section>

        <aside className="flex flex-col gap-5">
          <section aria-labelledby="h-opsi" className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-5">
            <h2 id="h-opsi" className="font-bold">
              Pengaturan
            </h2>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-stone-700">Format</span>
              <Segmented
                label="Format berkas"
                value={format}
                onChange={setFormat}
                options={[
                  { value: "pdf", label: (<><FileText aria-hidden />PDF</>) },
                  { value: "svg", label: (<><PenTool aria-hidden />SVG</>) },
                  { value: "png", label: (<><FileImage aria-hidden />PNG</>) },
                ]}
              />
            </div>
            {format === "pdf" && (
              <>
                <Select label="Ukuran kertas" value={paper} onChange={(v) => setPaper(v as Paper)} options={Object.entries(PAPERS).map(([k, v]) => ({ value: k, label: v.label }))} />
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-stone-700">Orientasi</span>
                  <Segmented
                    label="Orientasi kertas"
                    value={orientation}
                    onChange={setOrientation}
                    options={[
                      { value: "auto", label: "Otomatis" },
                      { value: "portrait", label: "Tegak" },
                      { value: "landscape", label: "Mendatar" },
                    ]}
                  />
                </div>
                <Slider label="Tumpang tindih antarhalaman" valueText={`${overlap} mm`} value={overlap} min={0} max={25} onChange={setOverlap} />
              </>
            )}
            {format === "png" && (
              <Select
                label="Resolusi"
                value={dpi}
                onChange={setDpi}
                options={[
                  { value: "150", label: "150 dpi (layar)" },
                  { value: "300", label: "300 dpi (cetak)" },
                ]}
              />
            )}
            <Switch label="Nomor pasangan tepi" description="Membantu mencocokkan tepi saat merakit (1↔1, 2↔2)." checked={seams} onChange={setSeams} />
            {format === "pdf" && <p className="text-xs text-pretty text-stone-500">Halaman sampul berisi kotak kalibrasi 10 cm, legenda garis, peta halaman, daftar bahan, dan langkah singkat.</p>}
            {free && format !== "svg" && <p className="text-xs text-pretty text-stone-500">Paket Gratis menambahkan watermark kecil di tepi halaman.</p>}
            {svgLocked && (
              <p id="svg-locked" className="rounded-lg bg-amber-50 p-3 text-sm text-pretty text-amber-900">
                Ekspor SVG berlapis tersedia di paket Pro.{" "}
                <Link href="/harga" className="font-semibold underline underline-offset-2">
                  Lihat paket
                </Link>
              </p>
            )}
            <Button variant="primary" size="lg" onClick={run} disabled={busy || svgLocked} aria-describedby={svgLocked ? "svg-locked" : error ? "export-err" : undefined} aria-busy={busy}>
              {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Download aria-hidden />}
              {busy ? "Menyiapkan berkas…" : `Unduh ${format.toUpperCase()}`}
            </Button>
            {error && (
              <p id="export-err" role="alert" className="text-sm text-red-700">
                {error}
              </p>
            )}
            {done && (
              <p role="status" className="text-sm text-emerald-700">
                {done}
              </p>
            )}
          </section>

          <section aria-labelledby="h-bahan" className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-5">
            <h2 id="h-bahan" className="font-bold">
              Daftar bahan
            </h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-stone-500">Kardus minimum</dt>
              <dd className="text-right font-semibold tabular-nums">
                {Math.round(bom.minSheet.w)} × {Math.round(bom.minSheet.h)} mm
              </dd>
              <dt className="text-stone-500">Lembar kardus</dt>
              <dd className="text-right font-semibold tabular-nums">{bom.fitsSheet ? `${bom.sheets} lembar` : "Perlu lembar lebih besar"}</dd>
              <dt className="text-stone-500">Hasil jadi</dt>
              <dd className="text-right font-semibold tabular-nums">
                {Math.round(bom.folded.w)} × {Math.round(bom.folded.d)} × {Math.round(bom.folded.h)} mm
              </dd>
            </dl>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-stone-700">
              <li>{bom.material}</li>
              <li>{bom.glue}</li>
              {bom.tools.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            <Link href={q.id ? `/panduan?id=${q.id}` : "/template"} className={buttonClass("outline", "md")}>
              Buka panduan rakit
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
