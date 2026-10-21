"use client";

import { ImagePlus, Loader2, Lock, MousePointerClick, PenTool, Repeat, Trash2, Type, Shapes } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { defaultDecal, emptyDesign, readDesignFile, type Decal, type Design } from "@/lib/decals";
import type { ResolvedNet } from "@/lib/geometry/resolve";
import { useEditor } from "@/lib/store/editor";
import { cn, uid } from "@/lib/utils";

/** Fitur A: unggah logo, pilih sisi, atur posisi/skala/rotasi per sisi. */
export function DesignSection({ net }: { net: ResolvedNet }) {
  const data = useEditor((s) => s.data)!;
  const selection = useEditor((s) => s.selection);
  const commit = useEditor((s) => s.commit);
  const set = useEditor((s) => s.set);
  const design = data.design ?? emptyDesign();
  const fileId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logos = design.assets.filter((a) => !a.hidden && !(design.prints ?? []).some((p) => p.assetId === a.id));
  const [activeAsset, setActiveAsset] = useState<string | null>(logos[0]?.id ?? null);
  const asset = logos.find((a) => a.id === activeAsset) ?? logos[0];
  const prints = design.prints ?? [];

  const faces = useMemo(() => net.panels.filter((p) => p.kind === "face"), [net]);
  const selectedPanel = selection?.kind === "panel" || selection?.kind === "hinge" ? selection.id : selection?.kind === "edge" ? selection.panelId : null;
  const decalOn = (pid: string) => design.decals.find((d) => d.panelId === pid && (!asset || d.assetId === asset.id));
  const editing = (selectedPanel && decalOn(selectedPanel)) || design.decals.find((d) => asset && d.assetId === asset.id);

  const setDesign = (fn: (d: Design) => Design, key?: string) => commit((p) => ({ ...p, design: fn(p.design ?? emptyDesign()) }), key);

  const upload = async (f?: File) => {
    if (!f) return;
    setBusy(true);
    setError(null);
    try {
      const a = { id: uid("a_"), ...(await readDesignFile(f)) };
      setDesign((d) => ({ ...d, assets: [...d.assets, a] }));
      setActiveAsset(a.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const toggle = (pid: string) => {
    if (!asset) return;
    setDesign((d) => {
      const has = d.decals.some((x) => x.panelId === pid && x.assetId === asset.id);
      const template = d.decals.find((x) => x.assetId === asset.id);
      return {
        ...d,
        decals: has ? d.decals.filter((x) => !(x.panelId === pid && x.assetId === asset.id)) : [...d.decals.filter((x) => x.panelId !== pid), { ...(template ?? defaultDecal(pid, asset.id)), panelId: pid }],
      };
    });
  };

  const setAll = (on: boolean) => {
    if (!asset) return;
    setDesign((d) => {
      const template = d.decals.find((x) => x.assetId === asset.id) ?? defaultDecal("", asset.id);
      const others = d.decals.filter((x) => x.assetId !== asset.id && (!on || !faces.some((f) => f.id === x.panelId)));
      return { ...d, decals: on ? [...others, ...faces.map((f) => ({ ...template, panelId: f.id }))] : others };
    });
  };

  const patch = (pid: string, p: Partial<Decal>, key: string) =>
    setDesign((d) => ({ ...d, decals: d.decals.map((x) => (x.panelId === pid && asset && x.assetId === asset.id ? { ...x, ...p } : x)) }), key);

  const repeatToAll = () => {
    if (!editing) return;
    setDesign((d) => ({ ...d, decals: d.decals.map((x) => (x.assetId === editing.assetId ? { ...x, x: editing.x, y: editing.y, scale: editing.scale, rotation: editing.rotation } : x)) }));
  };

  const removeAsset = (id: string) => {
    setDesign((d) => ({ ...d, assets: d.assets.filter((a) => a.id !== id), decals: d.decals.filter((x) => x.assetId !== id) }));
    setActiveAsset(null);
  };

  const count = asset ? design.decals.filter((d) => d.assetId === asset.id).length : 0;
  const label = (pid: string) => net.byId.get(pid)?.label ?? pid;

  return (
    <section aria-labelledby="h-desain" className="flex flex-col gap-4">
      <div>
        <h2 id="h-desain" className="font-bold">
          Logo di sisi kardus
        </h2>
        <p className="text-xs text-pretty text-stone-500">Unggah logo, pilih sisi, lalu lihat hasilnya di pola 2D dan 3D. Ikut tercetak saat ekspor.</p>
      </div>

      <label
        htmlFor={fileId}
        className={cn(
          "group flex cursor-pointer flex-col items-center gap-2 rounded-2xl bg-stone-100 p-4 text-center transition-[transform,background-color] duration-200 ease-[var(--ease-oil)] hover:bg-sage-100 active:scale-[0.98]",
          busy && "cursor-wait",
        )}
      >
        {busy ? <Loader2 className="size-6 animate-spin text-stone-500" aria-hidden /> : <ImagePlus className="size-6 text-stone-500 transition-transform duration-200 group-hover:-translate-y-0.5" aria-hidden />}
        <span className="text-sm font-semibold">{busy ? "Memproses gambar…" : logos.length ? "Tambah logo lain" : "Unggah logo atau gambar"}</span>
        <span className="text-xs text-stone-500">PNG, JPG, atau SVG · maks 5 MB</span>
      </label>
      <input
        id={fileId}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,.svg"
        className="sr-only"
        aria-invalid={!!error}
        aria-describedby={error ? `${fileId}-err` : undefined}
        onChange={(e) => {
          upload(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {error && (
        <p id={`${fileId}-err`} role="alert" className="-mt-2 text-sm text-orange-700">
          {error}
        </p>
      )}

      {prints.length > 0 && (
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-sage-100 p-4">
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Foto tercetak</span>
            <span className="text-xs text-stone-600 tabular-nums">{new Set(prints.map((p) => p.panelId)).size} panel dari foto asli</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setDesign((d) => {
                const used = new Set((d.prints ?? []).map((p) => p.assetId));
                return { ...d, prints: [], assets: d.assets.filter((a) => !used.has(a.id)) };
              })
            }
          >
            Hapus cetakan
          </Button>
        </div>
      )}

      {logos.length > 0 && (
        <ul aria-label="Logo terunggah" className="flex flex-wrap gap-2">
          {logos.map((a) => (
            <li key={a.id} className="relative">
              <button
                type="button"
                onClick={() => setActiveAsset(a.id)}
                aria-pressed={asset?.id === a.id}
                aria-label={`Pakai ${a.name}`}
                className="flex size-16 items-center justify-center rounded-xl bg-white p-2 shadow-soft ring-orange-500 transition-transform duration-200 hover:-translate-y-0.5 aria-pressed:ring-2"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.src} alt="" className="max-h-full max-w-full object-contain" />
              </button>
              <button type="button" onClick={() => removeAsset(a.id)} aria-label={`Hapus ${a.name}`} className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-stone-900 text-white hover:bg-orange-600">
                <Trash2 className="size-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {asset ? (
        <>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium text-stone-700">
              Tempel di sisi <span className="text-stone-500 tabular-nums">({count} dari {faces.length})</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {faces.map((f) => {
                const on = !!decalOn(f.id);
                return (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      toggle(f.id);
                      set({ selection: { kind: "panel", id: f.id } });
                    }}
                    className={cn(
                      "h-8 rounded-full px-3 text-xs font-semibold transition-[transform,background-color] duration-200 active:scale-95",
                      on ? "bg-orange-600 text-white" : "bg-stone-100 text-stone-700 hover:bg-sage-100",
                    )}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setAll(true)}>
                Semua sisi
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAll(false)} disabled={count === 0}>
                Kosongkan
              </Button>
            </div>
            <p className="flex items-center gap-2 text-xs text-stone-500">
              <MousePointerClick className="size-4 shrink-0" aria-hidden />
              Bisa juga klik panel di model 3D atau pola 2D, lalu tekan tombol di bawah.
            </p>
            {selectedPanel && faces.some((f) => f.id === selectedPanel) && (
              <Button size="sm" variant={decalOn(selectedPanel) ? "outline" : "primary"} onClick={() => toggle(selectedPanel)}>
                {decalOn(selectedPanel) ? `Lepas dari ${label(selectedPanel)}` : `Tempel di ${label(selectedPanel)}`}
              </Button>
            )}
          </fieldset>

          {editing ? (
            <fieldset className="flex flex-col gap-4 rounded-2xl bg-stone-100/70 p-4">
              <legend className="sr-only">Atur tempelan</legend>
              <p className="text-sm font-semibold">Atur di {label(editing.panelId)}</p>
              <Slider label="Geser kiri–kanan" valueText={`${Math.round(editing.x * 100)}%`} value={Math.round(editing.x * 100)} min={-50} max={50} onChange={(v) => patch(editing.panelId, { x: v / 100 }, `dx:${editing.panelId}`)} />
              <Slider label="Geser atas–bawah" valueText={`${Math.round(editing.y * 100)}%`} value={Math.round(editing.y * 100)} min={-50} max={50} onChange={(v) => patch(editing.panelId, { y: v / 100 }, `dy:${editing.panelId}`)} />
              <Slider label="Skala" valueText={`${Math.round(editing.scale * 100)}%`} value={Math.round(editing.scale * 100)} min={10} max={150} onChange={(v) => patch(editing.panelId, { scale: v / 100 }, `ds:${editing.panelId}`)} />
              <Slider label="Rotasi" valueText={`${editing.rotation}°`} value={editing.rotation} min={-180} max={180} onChange={(v) => patch(editing.panelId, { rotation: v }, `dr:${editing.panelId}`)} />
              <Button size="sm" variant="secondary" onClick={repeatToAll} disabled={count < 2} aria-describedby={count < 2 ? "repeat-hint" : undefined}>
                <Repeat aria-hidden />
                Ulangi ke semua sisi terpilih
              </Button>
              {count < 2 && (
                <p id="repeat-hint" className="-mt-2 text-xs text-stone-500">
                  Pilih minimal dua sisi untuk menyamakan posisinya.
                </p>
              )}
            </fieldset>
          ) : (
            <p className="rounded-2xl bg-stone-100/70 p-4 text-sm text-stone-600">Pilih satu sisi dulu untuk mengatur posisi, skala, dan rotasi.</p>
          )}
        </>
      ) : (
        <p className="rounded-2xl bg-stone-100/70 p-4 text-sm text-pretty text-stone-600">Belum ada logo. Unggah satu gambar untuk mulai menempel.</p>
      )}

      <ProDesignCard />
    </section>
  );
}

/** Editor desain bawaan: fitur Pro yang belum dibangun. Ditampilkan terkunci. */
export function ProDesignCard() {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white p-4 shadow-soft">
      <div className="flex items-start gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sage-100 text-sage-700 transition-transform duration-300 ease-[var(--ease-oil)] group-hover:rotate-6">
          <Lock className="size-5" aria-hidden />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="flex items-center gap-2 text-sm font-bold">
            Editor desain
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-bold text-orange-800">Pro · Segera</span>
          </p>
          <p className="text-xs text-pretty text-stone-500">Gambar, teks, dan bentuk langsung di permukaan kardus.</p>
          <div className="mt-2 flex gap-2 text-stone-400" aria-hidden>
            <PenTool className="size-4" />
            <Type className="size-4" />
            <Shapes className="size-4" />
          </div>
        </div>
      </div>
      <button type="button" disabled aria-disabled className="mt-4 h-8 w-full cursor-not-allowed rounded-lg bg-stone-100 text-xs font-semibold text-stone-500">
        Belum tersedia
      </button>
    </div>
  );
}
