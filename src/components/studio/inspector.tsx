"use client";

import { Tabs } from "@base-ui/react/tabs";
import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { NumberInput } from "@/components/ui/number-input";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { billOfMaterials } from "@/lib/bom";
import type { ResolvedNet } from "@/lib/geometry/resolve";
import { MATERIALS, materialInfo, type MaterialType } from "@/lib/materials";
import { templateOf } from "@/lib/project";
import { useEditor } from "@/lib/store/editor";
import type { ParamDef } from "@/lib/templates";
import { fmt, fromUnit, toUnit, unitStep, UNITS, type Unit } from "@/lib/units";
import { cn } from "@/lib/utils";
import { DesignSection } from "./design-section";
import { Onboarding } from "./onboarding";

const tabCls =
  "flex h-8 flex-1 items-center justify-center gap-1 rounded-md text-xs font-semibold text-stone-600 select-none hover:text-stone-900 data-active:bg-white data-active:text-stone-900 data-active:shadow-sm";

export function Inspector({ net, className }: { net: ResolvedNet; className?: string }) {
  const issues = net.issues;
  const errs = issues.filter((i) => i.level !== "info").length;
  return (
    <aside aria-label="Pengaturan proyek" className={cn("flex min-h-0 flex-col bg-white shadow-[-1px_0_0_rgb(31_26_23/0.06)]", className)}>
      <Tabs.Root defaultValue="ukuran" className="flex min-h-0 flex-1 flex-col">
        <Tabs.List className="m-4 mb-0 flex gap-0.5 rounded-xl bg-stone-100 p-1">
          <Tabs.Tab value="ukuran" className={tabCls}>
            Ukuran
          </Tabs.Tab>
          <Tabs.Tab value="desain" className={tabCls}>
            Desain
          </Tabs.Tab>
          <Tabs.Tab value="material" className={tabCls}>
            Material
          </Tabs.Tab>
          <Tabs.Tab value="cek" className={tabCls}>
            Cek
            {errs > 0 && <span className="rounded-full bg-amber-500 px-1.5 text-xs font-bold text-white tabular-nums">{errs}</span>}
          </Tabs.Tab>
          <Tabs.Tab value="tampilan" className={tabCls}>
            Opsi
          </Tabs.Tab>
        </Tabs.List>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Tabs.Panel value="ukuran" className="flex flex-col gap-5 p-4">
            <Onboarding />
            <ParamsSection />
          </Tabs.Panel>
          <Tabs.Panel value="desain" className="flex flex-col gap-5 p-4">
            <DesignSection net={net} />
          </Tabs.Panel>
          <Tabs.Panel value="material" className="flex flex-col gap-5 p-4">
            <MaterialSection />
          </Tabs.Panel>
          <Tabs.Panel value="cek" className="flex flex-col gap-5 p-4">
            <ChecksSection net={net} />
          </Tabs.Panel>
          <Tabs.Panel value="tampilan" className="flex flex-col gap-4 p-4">
            <DisplaySection />
          </Tabs.Panel>
        </div>
      </Tabs.Root>
    </aside>
  );
}

function ParamControl({ def, value, unit, easy, onChange }: { def: ParamDef; value: number | string; unit: Unit; easy: boolean; onChange: (v: number | string) => void }) {
  if (def.kind === "choice") {
    return <Select label={def.label} value={String(value)} onChange={onChange} options={def.options ?? []} />;
  }
  const isLen = def.kind === "mm";
  const n = Number(value);
  const shown = isLen ? toUnit(n, unit) : n;
  const min = isLen ? toUnit(def.min ?? 0, unit) : (def.min ?? 0);
  const max = isLen ? toUnit(def.max ?? 1000, unit) : (def.max ?? 100);
  const step = isLen ? unitStep(unit) : (def.step ?? 1);
  const text = isLen ? fmt(n, unit) : def.kind === "deg" ? `${n}°` : `${n}`;
  return (
    <div className="flex flex-col gap-2">
      <Slider label={def.label} valueText={text} value={shown} min={min} max={max} step={step} onChange={(v) => onChange(isLen ? Math.round(fromUnit(v, unit) * 10) / 10 : v)} />
      {!easy && isLen && <NumberInput label={`${def.label} (angka)`} hideLabel value={Number(shown.toFixed(3))} min={min} max={max} step={step} suffix={unit} onChange={(v) => onChange(Math.round(fromUnit(v, unit) * 10) / 10)} />}
    </div>
  );
}

function ParamsSection() {
  const data = useEditor((s) => s.data)!;
  const unit = useEditor((s) => s.unit);
  const easy = useEditor((s) => s.easy);
  const commit = useEditor((s) => s.commit);
  const t = templateOf(data);
  const fromPhoto = data.source.kind === "net" && data.source.origin === "gambar";
  if (!t || data.source.kind !== "template") {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-stone-200 p-4 text-sm">
        <p className="font-bold">{fromPhoto ? "Pola dari foto" : "Pola hasil bongkar 3D"}</p>
        <p className="text-pretty text-stone-600">
          {fromPhoto ? "Ukuran dan cetakan foto mengikuti foto asalnya; atur cetakan di tab Desain." : "Ukuran mengikuti model asalnya."} Tambahkan tab, slot, atau lubang dengan alat di kiri; ubah sudut lipat dengan memilih garis lipat.
        </p>
        <Link href={fromPhoto ? "/gambar" : "/bongkar"} className="font-semibold text-orange-700 underline-offset-2 hover:underline">
          {fromPhoto ? "Kembali ke Foto jadi kardus" : "Kembali ke Unfold Studio"}
        </Link>
      </div>
    );
  }
  const params = data.source.params;
  const defs = t.params.filter((p) => !(easy && p.advanced));
  const setParam = (k: string, v: number | string) =>
    commit((d) => (d.source.kind === "template" ? { ...d, source: { ...d.source, params: { ...d.source.params, [k]: v } } } : d), `param:${k}`);
  return (
    <section aria-labelledby="h-param" className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="h-param" className="font-bold">
          {t.title}
        </h2>
        <Link href="/template" className="text-sm font-semibold text-orange-700 underline-offset-2 hover:underline">
          Ganti
        </Link>
      </div>
      {defs.map((def) => (
        <ParamControl key={def.key} def={def} value={params[def.key] ?? def.default} unit={unit} easy={easy} onChange={(v) => setParam(def.key, v)} />
      ))}
      {!easy && (
        <Switch
          label="Kompensasi ketebalan"
          description="Panel yang membungkus panel lain diperlebar setebal kardus supaya sambungan rapat. Ukuran yang diisi adalah ukuran dalam."
          checked={data.compensate}
          onChange={(v) => commit((d) => ({ ...d, compensate: v }))}
        />
      )}
      {easy && <p className="text-xs text-pretty text-stone-500">Mode Mudah menyembunyikan angka presisi, lebar tab, dan kurva bezier. Matikan di bilah atas untuk kontrol penuh.</p>}
    </section>
  );
}

function MaterialSection() {
  const data = useEditor((s) => s.data)!;
  const easy = useEditor((s) => s.easy);
  const commit = useEditor((s) => s.commit);
  const m = data.material;
  const setM = (patch: Partial<typeof m>, key?: string) => commit((d) => ({ ...d, material: { ...d.material, ...patch } }), key);
  const info = materialInfo(m.type);
  return (
    <section aria-label="Material" className="flex flex-col gap-4">
      <Select
        label="Jenis material"
        value={m.type}
        onChange={(v) => setM({ type: v as MaterialType, thickness: materialInfo(v as MaterialType).thickness })}
        options={MATERIALS.map((x) => ({ value: x.type, label: `${x.label} · ${x.thickness.toLocaleString("id-ID")} mm` }))}
      />
      <Slider label="Ketebalan" valueText={`${m.thickness.toLocaleString("id-ID")} mm`} value={m.thickness} min={0.3} max={8} step={0.1} onChange={(v) => setM({ thickness: Math.round(v * 10) / 10 }, "thickness")} />
      {!easy && <NumberInput label="Ketebalan (mm)" hideLabel value={m.thickness} min={0.3} max={8} step={0.1} suffix="mm" onChange={(v) => setM({ thickness: v }, "thickness")} />}
      {info.pitch > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-stone-700">Arah flute</span>
          <Segmented
            label="Arah flute"
            value={m.flute}
            onChange={(v) => setM({ flute: v })}
            options={[
              { value: "vertical", label: "Vertikal ↕" },
              { value: "horizontal", label: "Horizontal ↔" },
            ]}
          />
          <p className="text-xs text-pretty text-stone-500">Lipatan sejajar flute lebih mudah dan rapi. Gelombang flute tampak di tepi model 3D.</p>
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-stone-700">Warna</span>
        <Segmented
          label="Warna kardus"
          value={m.color}
          onChange={(v) => setM({ color: v })}
          options={[
            { value: "kraft", label: "Cokelat" },
            { value: "white", label: "Putih" },
          ]}
        />
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium text-stone-700">Ukuran lembar kardus yang kamu punya</legend>
        <div className="grid grid-cols-2 gap-2">
          <NumberInput label="Lebar lembar" value={m.sheet.w} min={100} max={2000} step={10} suffix="mm" onChange={(v) => setM({ sheet: { ...m.sheet, w: v } }, "sheet")} />
          <NumberInput label="Tinggi lembar" value={m.sheet.h} min={100} max={2000} step={10} suffix="mm" onChange={(v) => setM({ sheet: { ...m.sheet, h: v } }, "sheet")} />
        </div>
      </fieldset>
    </section>
  );
}

const ICON = { error: OctagonAlert, warning: AlertTriangle, info: Info };

function ChecksSection({ net }: { net: ResolvedNet }) {
  const data = useEditor((s) => s.data)!;
  const unit = useEditor((s) => s.unit);
  const set = useEditor((s) => s.set);
  const bom = useMemo(() => billOfMaterials(net, data.material), [net, data.material]);
  const issues = net.issues;
  return (
    <>
      <section aria-labelledby="h-valid" className="flex flex-col gap-2">
        <h2 id="h-valid" className="font-bold">
          Validasi pola
        </h2>
        {issues.length === 0 ? (
          <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
            <CheckCircle2 className="size-5 shrink-0" aria-hidden />
            Pola siap dipotong: tidak ada panel bertumpuk dan semua tab bertemu pasangannya.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {issues.map((iss, i) => {
              const Icon = ICON[iss.level];
              return (
                <li key={i}>
                  <button
                    type="button"
                    disabled={!iss.panelIds?.length}
                    onClick={() => iss.panelIds?.[0] && set({ selection: { kind: "panel", id: iss.panelIds[0] } })}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-xl p-3 text-left text-sm text-pretty disabled:cursor-default",
                      iss.level === "error" && "bg-red-50 text-red-900",
                      iss.level === "warning" && "bg-amber-50 text-amber-900",
                      iss.level === "info" && "bg-stone-100 text-stone-700",
                    )}
                  >
                    <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
                    <span>
                      <span className="sr-only">{iss.level === "error" ? "Galat: " : iss.level === "warning" ? "Peringatan: " : "Info: "}</span>
                      {iss.message}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <section aria-labelledby="h-bom" className="flex flex-col gap-2">
        <h2 id="h-bom" className="font-bold">
          Ukuran & daftar bahan
        </h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-stone-500">Pola datar</dt>
          <dd className="text-right font-semibold tabular-nums">
            {fmt(bom.net.w, unit)} × {fmt(bom.net.h, unit)}
          </dd>
          <dt className="text-stone-500">Hasil jadi</dt>
          <dd className="text-right font-semibold tabular-nums">
            {fmt(bom.folded.w, unit, false)} × {fmt(bom.folded.d, unit, false)} × {fmt(bom.folded.h, unit)}
          </dd>
          <dt className="text-stone-500">Kardus minimum</dt>
          <dd className="text-right font-semibold tabular-nums">
            {fmt(bom.minSheet.w, unit)} × {fmt(bom.minSheet.h, unit)}
          </dd>
          <dt className="text-stone-500">Bagian terpisah</dt>
          <dd className="text-right font-semibold tabular-nums">{bom.pieces}</dd>
          <dt className="text-stone-500">Lembar dibutuhkan</dt>
          <dd className={cn("text-right font-semibold tabular-nums", !bom.fitsSheet && "text-red-700")}>{bom.fitsSheet ? bom.sheets : "Bagian terlalu besar"}</dd>
          <dt className="text-stone-500">Sambungan</dt>
          <dd className="text-right font-semibold tabular-nums">{bom.seams}</dd>
        </dl>
        {!bom.fitsSheet && <p className="text-xs text-pretty text-red-700">Ada bagian yang lebih besar dari lembar kardusmu. Perbesar ukuran lembar di tab Material atau kecilkan modelnya.</p>}
        <ul className="mt-1 flex list-disc flex-col gap-1 pl-5 text-sm text-stone-700">
          <li>{bom.material}</li>
          <li>{bom.glue}</li>
          {bom.tools.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>
    </>
  );
}

function DisplaySection() {
  const s = useEditor();
  return (
    <>
      <Select label="Satuan" value={s.unit} onChange={(v) => s.set({ unit: v as Unit })} options={UNITS} />
      <Switch label="Grid" checked={s.grid} onChange={(v) => s.set({ grid: v })} />
      <Switch label="Snap ke grid & titik" description="Tahan Shift saat menggambar garis untuk mengunci sudut 45°." checked={s.snap} onChange={(v) => s.set({ snap: v })} />
      <Switch label="Nomor pasangan tepi" description="Tepi dengan nomor sama disambung saat merakit (1↔1, 2↔2)." checked={s.showSeams} onChange={(v) => s.set({ showSeams: v })} />
      <Switch label="Nama panel" checked={s.showLabels} onChange={(v) => s.set({ showLabels: v })} />
      {!s.easy && (
        <Slider label="Panjang slot baru" valueText={`${s.slotLength} mm`} value={s.slotLength} min={5} max={150} onChange={(v) => s.set({ slotLength: v })} />
      )}
    </>
  );
}
