"use client";

import { Popover } from "@base-ui/react/popover";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { TemplateCard } from "@/components/gallery/template-card";
import { OIL, SplitReveal } from "@/components/landing/motion-kit";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { CATEGORIES, defaultParams, TEMPLATES, type Template } from "@/lib/templates";
import { cn } from "@/lib/utils";

const TIME = [
  { value: "all", label: "Semua durasi" },
  { value: "15", label: "≤ 15 menit" },
  { value: "30", label: "16–30 menit" },
  { value: "31", label: "> 30 menit" },
];
const DIFF = [
  { value: "all", label: "Semua tingkat" },
  { value: "mudah", label: "Mudah" },
  { value: "sedang", label: "Sedang" },
  { value: "sulit", label: "Sulit" },
];
const AGE = [
  { value: "all", label: "Semua usia" },
  { value: "7", label: "Anak 7+" },
  { value: "10", label: "10+" },
  { value: "12", label: "12+" },
];
const SIZE = [
  { value: "all", label: "Semua ukuran" },
  { value: "a4", label: "Muat A4" },
  { value: "a3", label: "Muat A3" },
  { value: "big", label: "Lebih besar dari A3" },
];

const EMOJI: Record<string, string> = {
  all: "✨",
  jagoan: "⚔️",
  kemasan: "📦",
  edukasi: "📐",
  mainan: "🚂",
  rumah: "🏠",
  furnitur: "🪑",
  dekorasi: "🏮",
  kostum: "🎭",
  origami: "🪭",
  hewan: "🐾",
  kantor: "🗂️",
  pesta: "🎉",
  hariraya: "🌙",
  sains: "🔬",
  nusantara: "🏯",
  mainperan: "🧸",
  hobibapak: "🛠️",
};

const CHIPS = [{ id: "all", label: "Semua" }, { id: "jagoan", label: "Jagoan" }, ...CATEGORIES.map((c) => ({ id: c.id, label: c.label.replace(" (bangun ruang)", "") }))];

const sheetFits = (w: number, h: number, W: number, H: number) => (w <= W && h <= H) || (w <= H && h <= W);

const sizeCache = new Map<string, [number, number]>();
function netSize(t: Template): [number, number] {
  const hit = sizeCache.get(t.id);
  if (hit) return hit;
  const net = t.build(defaultParams(t), { t: 3, compensate: true });
  const xs = net.panels.flatMap((p) => p.points.map((q) => q[0]));
  const ys = net.panels.flatMap((p) => p.points.map((q) => q[1]));
  const s: [number, number] = [Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
  sizeCache.set(t.id, s);
  return s;
}

export function Gallery() {
  const params = useSearchParams();
  const router = useRouter();
  const reduced = useReducedMotion();
  const [q, setQ] = useState(params.get("q") ?? "");
  const cat = params.get("kategori") ?? "all";
  const [diff, setDiff] = useState("all");
  const [time, setTime] = useState("all");
  const [age, setAge] = useState("all");
  const [size, setSize] = useState("all");
  const activeFilters = [diff, time, age, size].filter((v) => v !== "all").length;

  const setCat = (c: string) => {
    const sp = new URLSearchParams(params.toString());
    if (c === "all") sp.delete("kategori");
    else sp.set("kategori", c);
    router.replace(`/template${sp.size ? `?${sp}` : ""}`, { scroll: false });
  };

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return TEMPLATES.filter((t) => {
      if (cat === "jagoan" ? !t.tags.includes("jagoan") : cat !== "all" && t.category !== cat) return false;
      if (diff !== "all" && t.difficulty !== diff) return false;
      if (time === "15" && t.minutes > 15) return false;
      if (time === "30" && (t.minutes <= 15 || t.minutes > 30)) return false;
      if (time === "31" && t.minutes <= 30) return false;
      if (age !== "all" && t.age > Number(age)) return false;
      if (size !== "all") {
        const [w, h] = netSize(t);
        const a4 = sheetFits(w, h, 190, 277);
        const a3 = sheetFits(w, h, 277, 400);
        if (size === "a4" && !a4) return false;
        if (size === "a3" && !a3) return false;
        if (size === "big" && a3) return false;
      }
      if (needle) {
        const hay = [t.title, t.description, ...t.tags].join(" ").toLowerCase();
        if (!needle.split(/\s+/).every((w) => hay.includes(w))) return false;
      }
      return true;
    });
  }, [q, cat, diff, time, age, size]);

  const resetFilters = () => {
    setDiff("all");
    setTime("all");
    setAge("all");
    setSize("all");
  };
  const resetAll = () => {
    setQ("");
    resetFilters();
    setCat("all");
  };

  return (
    <div className="flex flex-col gap-12">
      <header className="grid grid-cols-12 items-end gap-6">
        <SplitReveal as="h1" text="Pilih. Ubah. Lipat." className="col-span-12 text-[clamp(56px,9vw,144px)] leading-[0.9] font-bold tracking-[-0.03em] md:col-span-9" />
        <p className="col-span-12 text-base text-stone-600 md:col-span-3 md:text-right">
          <span className="block text-4xl font-bold tracking-[-0.03em] text-ink tabular-nums">{TEMPLATES.length}</span>
          template siap diukur ulang
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 rounded-full bg-white p-2 pl-6 shadow-soft">
          <Search className="size-5 shrink-0 text-stone-400" aria-hidden />
          <label htmlFor="cari" className="sr-only">
            Cari template
          </label>
          <input
            id="cari"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari pedang, kotak kue, limas…"
            className="h-12 min-w-0 flex-1 bg-transparent text-lg placeholder:text-stone-400 focus:outline-none"
          />
          {q && (
            <button type="button" onClick={() => setQ("")} aria-label="Hapus pencarian" className="flex size-10 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100">
              <X className="size-4" aria-hidden />
            </button>
          )}
          <Popover.Root>
            <Popover.Trigger
              className={cn(
                "relative inline-flex h-12 shrink-0 items-center gap-2 rounded-full px-6 text-sm font-semibold transition-[transform,background-color] duration-300 ease-[var(--ease-oil)] active:scale-95",
                activeFilters ? "bg-ink text-cream" : "bg-stone-100 text-ink hover:bg-sage-100",
              )}
            >
              <SlidersHorizontal className="size-4" aria-hidden />
              Filter
              {activeFilters > 0 && <span className="flex size-6 items-center justify-center rounded-full bg-flame text-xs font-bold text-white tabular-nums">{activeFilters}</span>}
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Positioner sideOffset={8} align="end" className="z-50">
                <Popover.Popup className="flex w-[min(22rem,calc(100vw-2rem))] origin-[var(--transform-origin)] flex-col gap-4 rounded-3xl bg-white p-6 shadow-soft transition-[scale,opacity] duration-200 ease-[var(--ease-oil)] data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
                  <Popover.Title className="font-bold">Saring template</Popover.Title>
                  <Select label="Tingkat kesulitan" value={diff} onChange={setDiff} options={DIFF} />
                  <Select label="Waktu rakit" value={time} onChange={setTime} options={TIME} />
                  <Select label="Ukuran kardus" value={size} onChange={setSize} options={SIZE} />
                  <Select label="Usia" value={age} onChange={setAge} options={AGE} />
                  <div className="flex justify-between gap-2 pt-2">
                    <Button variant="ghost" size="sm" onClick={resetFilters} disabled={!activeFilters}>
                      Atur ulang
                    </Button>
                    <Popover.Close className="h-8 rounded-full bg-ink px-4 text-sm font-semibold text-cream hover:bg-stone-800">Tampilkan {list.length}</Popover.Close>
                  </div>
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
        </div>

        <div role="group" aria-label="Kategori" className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-2 md:mx-0 md:flex-wrap md:px-0">
          {CHIPS.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={cat === c.id}
              onClick={() => setCat(c.id)}
              className={cn(
                "inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-[transform,background-color,color] duration-300 ease-[var(--ease-oil)] active:scale-95",
                cat === c.id ? "bg-flame text-white" : "bg-white text-ink shadow-soft hover:-translate-y-0.5",
              )}
            >
              <span aria-hidden>{EMOJI[c.id]}</span>
              {c.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-stone-500" aria-live="polite">
          <span className="font-semibold text-ink tabular-nums">{list.length}</span> template
          {activeFilters > 0 && (
            <>
              {" · "}
              <button type="button" onClick={resetFilters} className="font-semibold text-orange-700 underline-offset-2 hover:underline">
                hapus {activeFilters} filter
              </button>
            </>
          )}
        </p>
      </div>

      <h2 className="sr-only">Daftar template</h2>
      {list.length ? (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((t, i) => (
            <motion.li
              key={t.id}
              className="flex"
              initial={reduced ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-5% 0px" }}
              transition={{ duration: 0.5, ease: OIL, delay: (i % 4) * 0.06 }}
            >
              <TemplateCard t={t} />
            </motion.li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-3xl bg-white px-6 py-16 text-center shadow-soft">
          <span className="text-5xl" aria-hidden>
            📦
          </span>
          <p className="text-xl font-bold">Belum ada yang cocok.</p>
          <Button variant="secondary" onClick={resetAll}>
            Tampilkan semua template
          </Button>
        </div>
      )}
    </div>
  );
}
