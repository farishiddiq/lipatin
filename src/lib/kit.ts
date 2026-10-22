import { Matrix4 } from "three";
import { buildBox, buildProfile, type BoxOpts, type ProfileOpts } from "./geometry/builder";
import { foldMatrices } from "./geometry/fold";
import { bbox, rectPoints } from "./geometry/polygon";
import { foldedBounds, resolveNet } from "./geometry/resolve";
import { emptyMods, type NetBase, type Panel, type Vec2 } from "./geometry/types";
import { unfoldMesh } from "./geometry/unfold";
import { type P3, type Part, scalePart, toMesh } from "./solid";
import type { Meta } from "./templates-3d";
import type { BuildCtx, ParamDef, Params, Template } from "./templates";

/*
 * Pembangun template fungsional: menggabungkan bangun 3D tertutup (pajangan) dengan
 * kotak berlubang/berpintu, profil ekstrusi, dan lembaran lepas (sekat, papan, rak)
 * yang masing-masing punya pose akhir. Semua ukuran ditulis dalam mm nominal lalu diskalakan.
 */

/** Kolom rotasi: arah sumbu x pola, normal (arah lipat gunung), arah sumbu y pola. */
export type Rot = [P3, P3, P3];
const cross = (a: P3, b: P3): P3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const frame = (u: P3, v: P3): Rot => [u, cross(v, u), v];
/** Mendatar: x pola → X, y pola → Z, dinding terlipat ke atas. */
export const FLAT = frame([1, 0, 0], [0, 0, 1]);
/** Berdiri menghadap depan: x pola → X, y pola → bawah, dinding terlipat ke depan (+Z). */
export const STAND = frame([1, 0, 0], [0, -1, 0]);
/** Berdiri menyamping: x pola → Z, y pola → bawah. */
export const STAND_Z = frame([0, 0, 1], [0, -1, 0]);
/** Lemari berpintu samping: x pola → bawah, y pola → kiri; tutup kotak menjadi pintu berengsel di kanan. */
export const SIDE = frame([0, -1, 0], [-1, 0, 0]);
/** Turun menyamping: x pola → bawah, y pola → Z (untuk sekat silang berdiri). */
export const DOWN_Z = frame([0, -1, 0], [0, 0, 1]);

/** Pose = titik pola r jatuh di titik dunia W dengan rotasi R. */
export function pose(R: Rot, r: Vec2, W: P3) {
  const t = [0, 1, 2].map((i) => W[i] - (R[0][i] * r[0] + R[2][i] * r[1]));
  return [...R[0], 0, ...R[1], 0, ...R[2], 0, t[0], t[1], t[2], 1];
}

const shift = (poly: Vec2[], o: Vec2) => poly.map(([x, y]) => [x + o[0], y + o[1]] as Vec2);
const mirror = (poly: Vec2[]) => poly.map(([x, y]) => [-x, y] as Vec2);
const MIRROR = new Matrix4().makeScale(-1, 1, 1);
const sc = (poly: Vec2[], k: number) => poly.map(([x, y]) => [x * k, y * k] as Vec2);

/** Pose untuk pola yang dicerminkan lalu digeser o: P · M · P · T(−o). */
function mirroredPose(m: number[], o: Vec2) {
  const M = MIRROR.clone().multiply(new Matrix4().fromArray(m)).multiply(MIRROR).multiply(new Matrix4().makeTranslation(-o[0], 0, -o[1]));
  return Array.from(M.elements);
}

/** Susun kotak-kotak pembatas dalam baris; kembalikan offset tiap kotak. */
function layout(boxes: { minX: number; minY: number; w: number; h: number }[], startY: number, rowMax: number, gap = 12): Vec2[] {
  let x = 0,
    y = startY,
    rowH = 0;
  return boxes.map((b) => {
    if (x > 0 && x + b.w > rowMax) {
      x = 0;
      y += rowH + gap;
      rowH = 0;
    }
    const o: Vec2 = [x - b.minX, y - b.minY];
    x += b.w + gap;
    rowH = Math.max(rowH, b.h);
    return o;
  });
}

/** Papan bercelah untuk sekat silang tanpa lem: celah selebar `slot` sedalam setengah tinggi dari tepi atas/bawah. */
export function comb(len: number, h: number, cuts: number[], slot: number, side: "top" | "bottom"): Vec2[] {
  const d = h / 2;
  const s = slot / 2;
  const c = [...cuts].sort((a, b) => a - b);
  if (side === "top") {
    const pts: Vec2[] = [[0, 0]];
    for (const x of c) pts.push([x - s, 0], [x - s, d], [x + s, d], [x + s, 0]);
    pts.push([len, 0], [len, h], [0, h]);
    return pts;
  }
  const pts: Vec2[] = [
    [0, 0],
    [len, 0],
    [len, h],
  ];
  for (const x of c.reverse()) pts.push([x + s, h], [x + s, h - d], [x - s, h - d], [x - s, h]);
  pts.push([0, h]);
  return pts;
}

interface Sub {
  panels: Panel[];
  label: string;
  /** Pose akar (titik pola asli → dunia); geseran susunan pola ditambahkan saat dirakit. */
  pose: (root: Panel, o: Vec2) => number[];
}

type BoxIn = Omit<BoxOpts, "t" | "compensate" | "tab"> & { tab?: number };
type ProfileIn = Omit<ProfileOpts, "tab"> & { tab?: number };

export class Kit {
  private solids: Part[] = [];
  private subs: Sub[] = [];
  constructor(
    readonly k: number,
    readonly ctx: BuildCtx,
    readonly tabW: number,
  ) {}

  private at = (p: P3): P3 => [p[0] * this.k, p[1] * this.k, p[2] * this.k];
  get slot() {
    return Math.max(1, this.ctx.t);
  }

  /** Bangun 3D tertutup (pajangan, pegangan, hiasan). */
  add(...parts: Part[]) {
    for (const p of parts) this.solids.push(scalePart(p, this.k));
    return this;
  }

  /** Kotak dari pola klasik; titik pola (0,0) alas jatuh di `at` dengan rotasi R. */
  box(o: BoxIn, R: Rot, at: P3, label: string) {
    const k = this.k;
    const holes = o.holes && Object.fromEntries(Object.entries(o.holes).map(([f, hs]) => [f, hs!.map((h) => sc(h, k))]));
    const nb = buildBox({ ...o, W: o.W * k, D: o.D * k, H: o.H * k, holes, tab: o.tab ?? this.tabW, t: this.ctx.t, compensate: this.ctx.compensate });
    const W = this.at(at);
    this.subs.push({ panels: nb.build(false).panels, label, pose: (_r, off) => pose(R, off, W) });
    return this;
  }

  /** Profil yang diekstrusi (rak bertingkat, rumah kaca, badan gitar) dengan lubang di sisi/jalur. */
  profile(o: ProfileIn, R: Rot, at: P3, label: string) {
    const k = this.k;
    const nb = buildProfile({
      ...o,
      profile: sc(o.profile, k),
      depth: o.depth * k,
      tab: o.tab ?? this.tabW,
      sideHoles: o.sideHoles && { A: o.sideHoles.A?.map((h) => sc(h, k)), B: o.sideHoles.B?.map((h) => sc(h, k)) },
      stripHoles: o.stripHoles && Object.fromEntries(Object.entries(o.stripHoles).map(([i, hs]) => [i, hs.map((h) => sc(h, k))])),
    });
    const W = this.at(at);
    // akar profil berdiri di sisi A memakai koordinat (x, −y); selain itu jalur alas mulai di (0,0)
    this.subs.push({ panels: nb.build(o.closed ?? true).panels, label, pose: (_r, off) => pose(R, off, W) });
    return this;
  }

  /** Lembaran lepas (sekat, papan rak, dinding tipis); titik lokal (0,0) jatuh di `at`. */
  sheet(poly: Vec2[], R: Rot, at: P3, label: string, holes?: Vec2[][]) {
    const k = this.k;
    const W = this.at(at);
    this.subs.push({ panels: [{ id: "s", label, kind: "face", points: sc(poly, k), holes: holes?.map((h) => sc(h, k)) }], label, pose: (_r, off) => pose(R, off, W) });
    return this;
  }

  /** Papan persegi panjang w × h dengan sudut kiri-atas lokal di `at`. */
  board(w: number, h: number, R: Rot, at: P3, label: string, holes?: Vec2[][]) {
    return this.sheet(rectPoints(0, 0, w, h), R, at, label, holes);
  }

  build(): NetBase {
    const panels: Panel[] = this.solids.length ? unfoldMesh(toMesh(this.solids), { tabs: this.tabW > 0, tabWidth: this.tabW, keepPose: true }).net.panels : [];
    if (this.subs.length) {
      // Hasil bongkar sudah dicerminkan (x → −x, pose P·M·P) agar sisi luar = sisi cetak di penampil
      // yang membalik sumbu x. Bagian pola lain diperlakukan sama supaya posisinya cocok dengan bangun 3D.
      for (const s of this.subs)
        s.panels = s.panels.map((p) => ({ ...p, points: mirror(p.points), holes: p.holes?.map(mirror), hinge: p.hinge && [mirror([p.hinge[0]])[0], mirror([p.hinge[1]])[0]] }));
      const base = panels.length ? bbox(panels.flatMap((p) => p.points)) : { minX: 0, maxX: 0, maxY: -16 };
      const boxes = this.subs.map((s) => {
        const b = bbox(s.panels.flatMap((p) => p.points));
        return { minX: b.minX, minY: b.minY, w: b.maxX - b.minX, h: b.maxY - b.minY };
      });
      const area = boxes.reduce((s, b) => s + (b.w + 12) * (b.h + 12), 0);
      const rowMax = Math.max(...boxes.map((b) => b.w), base.maxX - base.minX, Math.sqrt(area) * 1.2);
      const offs = layout(boxes, base.maxY + 20, rowMax);
      this.subs.forEach((s, i) => {
        const o: Vec2 = [offs[i][0] + base.minX, offs[i][1]];
        for (const p of s.panels)
          panels.push({
            ...p,
            id: `b${i}-${p.id}`,
            parent: p.parent && `b${i}-${p.parent}`,
            label: p.label && p.label !== s.label ? `${s.label} · ${p.label}` : s.label,
            points: shift(p.points, o),
            holes: p.holes?.map((h) => shift(h, o)),
            hinge: p.hinge && [shift([p.hinge[0]], o)[0], shift([p.hinge[1]], o)[0]],
            rootPose: p.parent ? undefined : mirroredPose(s.pose(p, [0, 0]), o),
          });
      });
    }
    return { panels, closed: true };
  }
}

const mm = (key: string, label: string, def: number, min: number, max: number): ParamDef => ({ key, label, kind: "mm", min, max, step: 1, default: def });
const tabP = (d: number): ParamDef => ({ key: "tab", label: "Lebar tab lem", kind: "mm", min: 0, max: 25, step: 1, default: d, advanced: true });

/** Template dari rancangan Kit. `def` = ukuran terbesar default (mm); rancangan digambar di skala nominal. */
export function kitTemplate(m: Meta, def: number, sizeLabel: string, design: (kit: Kit) => void): Template {
  let extent = 0;
  const cache = new Map<string, NetBase>();
  const make = (k: number, c: BuildCtx, tab: number) => {
    const kit = new Kit(k, c, tab);
    design(kit);
    return kit.build();
  };
  const build = (p: Params, c: BuildCtx): NetBase => {
    const size = Number(p.size),
      tab = Number(p.tab);
    const key = `${size}|${tab}|${c.t}|${c.compensate}`;
    const hit = cache.get(key);
    if (hit) return hit;
    if (!extent) {
      const r = resolveNet(make(1, c, 0), emptyMods(), [], c.t);
      const b = foldedBounds(r, foldMatrices(r, 1));
      extent = Math.max(b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z) || 1;
    }
    const net = make(size / extent, c, tab);
    if (cache.size > 8) cache.delete(cache.keys().next().value!);
    cache.set(key, net);
    return net;
  };
  return { ...m, tags: ["baru", "3d", ...m.tags], params: [mm("size", sizeLabel, def, Math.round(def * 0.5), Math.round(def * 2.5)), tabP(8)], build };
}
