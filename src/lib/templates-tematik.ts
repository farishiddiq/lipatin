import { ConeGeometry, ExtrudeGeometry, OctahedronGeometry, Shape, type BufferGeometry } from "three";
import { buildBox, buildProfile, buildTower, NetBuilder } from "./geometry/builder";
import { bbox, circlePoints, dist, rectPoints, stadiumPoints } from "./geometry/polygon";
import type { NetBase, Panel, Vec2 } from "./geometry/types";
import { meshFromGeometry, unfoldMesh } from "./geometry/unfold";
import type { BuildCtx, Category, Difficulty, ParamDef, Params, Template } from "./templates";

/*
 * Enam kategori tematik: hewan peliharaan, meja & kantor, pesta, hari raya,
 * sains & eksperimen, dan arsitektur Nusantara (masing-masing 4 template).
 */

export const num = (p: Params, k: string) => Number(p[k]);
export const tabP = (d: number): ParamDef => ({ key: "tab", label: "Lebar tab lem", kind: "mm", min: 0, max: 25, step: 1, default: d, advanced: true });
export const mm = (key: string, label: string, def: number, min: number, max: number): ParamDef => ({ key, label, kind: "mm", min, max, step: 1, default: def });
export const circ = (x: number, y: number, r: number, seg = 24) => circlePoints([x, y], r, seg);

export interface Meta {
  id: string;
  title: string;
  category: Category;
  description: string;
  difficulty: Difficulty;
  minutes: number;
  age: number;
  tags: string[];
  featured?: boolean;
}

export const tpl = (m: Meta, params: ParamDef[], build: (p: Params, c: BuildCtx) => NetBase): Template => ({ ...m, tags: ["baru", ...m.tags], params, build });

/* ------------------------------------------------------------------ */
/* Pose akhir bagian terpisah (Matrix4 column-major)                   */
/* ------------------------------------------------------------------ */

export type Rot = [number[], number[], number[]];
/** Mendatar (seperti pola). */
export const FLAT: Rot = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];
/** Tegak di bidang XY: x pola → X, y pola (ke bawah) → −Y. */
export const STAND: Rot = [
  [1, 0, 0],
  [0, 0, 1],
  [0, -1, 0],
];
/** Tegak di bidang ZY: x pola → Z, y pola → −Y. */
export const STAND_Z: Rot = [
  [0, 0, 1],
  [-1, 0, 0],
  [0, -1, 0],
];

/** Pose = T(W) · R · T(−r): titik pola r berpindah ke titik dunia W. */
export function pose(R: Rot, r: Vec2, W: [number, number, number]) {
  const t = [0, 1, 2].map((i) => W[i] - (R[0][i] * r[0] + R[2][i] * r[1]));
  return [...R[0], 0, ...R[1], 0, ...R[2], 0, t[0], t[1], t[2], 1];
}

/** Susun potongan (koordinat lokal, y ke bawah) dalam baris; kembalikan offset tiap potongan. */
export function layout(polys: Vec2[][], startY: number, rowMax: number, gap = 10): Vec2[] {
  let x = 0,
    y = startY,
    rowH = 0;
  return polys.map((poly) => {
    const b = bbox(poly);
    const w = b.maxX - b.minX;
    const h = b.maxY - b.minY;
    if (x > 0 && x + w > rowMax) {
      x = 0;
      y += rowH + gap;
      rowH = 0;
    }
    const o: Vec2 = [x - b.minX, y - b.minY];
    x += w + gap;
    rowH = Math.max(rowH, h);
    return o;
  });
}

export const shift = (poly: Vec2[], o: Vec2) => poly.map(([x, y]) => [x + o[0], y + o[1]] as Vec2);
export const flipY = (poly: Vec2[]) => poly.map(([x, y]) => [x, -y] as Vec2);

/** Tambahkan potongan lepas (dengan pose akhir) di bawah pola utama. */
export function addPieces(panels: Panel[], pieces: { poly: Vec2[]; label: string; pose: (o: Vec2) => number[]; holes?: Vec2[][] }[]) {
  const b = panels.length ? bbox(panels.flatMap((p) => p.points)) : { minX: 0, maxX: 0, maxY: -16 };
  // lebar baris ≈ akar luas total, supaya susunan potongan mendekati persegi
  const totalArea = pieces.reduce((s, pc) => {
    const q = bbox(pc.poly);
    return s + (q.maxX - q.minX + 10) * (q.maxY - q.minY + 10);
  }, 0);
  const widest = Math.max(...pieces.map((pc) => bbox(pc.poly).maxX - bbox(pc.poly).minX));
  const offs = layout(
    pieces.map((p) => p.poly),
    b.maxY + 16,
    Math.max(widest, b.maxX - b.minX, Math.sqrt(totalArea) * 1.15),
  );
  pieces.forEach((pc, i) => {
    const o: Vec2 = [offs[i][0] + b.minX, offs[i][1]];
    panels.push({ id: `piece${i}`, label: pc.label, kind: "face", points: shift(pc.poly, o), holes: pc.holes?.map((h) => shift(h, o)), rootPose: pc.pose(o) });
  });
}

/* ------------------------------------------------------------------ */
/* Pembangun bantu                                                     */
/* ------------------------------------------------------------------ */

interface ExtrudeDef {
  /** Siluet nominal (mm, y ke atas, CCW, titik 0→1 = alas horizontal). */
  pts: Vec2[];
  sizeLabel: string;
  depth: number;
  depthLabel: string;
  tab: number;
  root?: "strip" | "sideA";
  closed?: boolean;
  sideA?: boolean;
  sideB?: boolean;
  holesA?: (k: number) => Vec2[][];
  holesB?: (k: number) => Vec2[][];
  stripHoles?: (k: number, depth: number) => Record<number, Vec2[][]>;
  labels?: { A?: string; B?: string; strip?: (i: number) => string };
  extra?: (panels: Panel[], k: number, depth: number, c: BuildCtx) => void;
  stacked?: boolean;
  /** Bangun punya ujung terbuka (tidak diperiksa sebagai bangun tertutup). */
  open?: boolean;
}

function extrent(pts: Vec2[]) {
  const b = bbox(pts);
  return Math.round(Math.max(b.maxX - b.minX, b.maxY - b.minY));
}

export function extrude(m: Meta, d: ExtrudeDef): Template {
  const nominal = extrent(d.pts);
  return tpl(
    m,
    [mm("size", d.sizeLabel, nominal, Math.round(nominal * 0.4), Math.round(nominal * 2.5)), mm("depth", d.depthLabel, d.depth, 10, Math.max(80, d.depth * 3)), tabP(d.tab)],
    (p, c) => {
      const k = num(p, "size") / nominal;
      const [ox, oy] = d.pts[0];
      const loc = (h: Vec2[][] | undefined) => h?.map((q) => q.map(([x, y]) => [x - ox * k, y - oy * k] as Vec2));
      const depth = num(p, "depth");
      const nb = buildProfile({
        profile: d.pts.map(([x, y]) => [(x - ox) * k, (y - oy) * k] as Vec2),
        depth,
        tab: num(p, "tab"),
        root: d.root ?? "strip",
        closed: d.closed ?? true,
        sideA: d.sideA,
        sideB: d.sideB,
        sideHoles: { A: loc(d.holesA?.(k)), B: loc(d.holesB?.(k) ?? d.holesA?.(k)) },
        stripHoles: d.stripHoles?.(k, depth),
        labels: d.labels,
      });
      const net = nb.build((d.closed ?? true) && !d.open);
      d.extra?.(net.panels, k, depth, c);
      if (d.stacked) net.stacked = true;
      return net;
    },
  );
}

/** Bangun 3D apa pun → dibongkar otomatis, lalu dirakit kembali ke posisi aslinya. */
export function fromMesh(m: Meta, params: ParamDef[], geo: (p: Params) => BufferGeometry, closed = true): Template {
  return tpl(m, params, (p) => {
    const tab = num(p, "tab");
    const res = unfoldMesh(meshFromGeometry(geo(p)), { tabs: tab > 0, tabWidth: tab, keepPose: true });
    return { ...res.net, closed };
  });
}

/** Putar poligon (y ke atas) agar sisi selubung cembung terpanjang menjadi alas (0,0)→(L,0), urutan CCW. */
function seatProfile(poly: Vec2[]): Vec2[] {
  let pts = [...poly];
  let area2 = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    area2 += a[0] * b[1] - b[0] * a[1];
  }
  if (area2 < 0) pts.reverse();
  const n = pts.length;
  let best = 0,
    bestL = -1;
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const L = dist(a, b);
    const hull = pts.every((q) => (b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]) >= -1e-6 * L);
    if (hull && L > bestL) ((bestL = L), (best = i));
  }
  pts = [...pts.slice(best), ...pts.slice(0, best)];
  const [a, b] = pts;
  const ang = -Math.atan2(b[1] - a[1], b[0] - a[0]);
  const c = Math.cos(ang),
    sn = Math.sin(ang);
  return pts.map(([x, y]) => [(x - a[0]) * c - (y - a[1]) * sn, (x - a[0]) * sn + (y - a[1]) * c] as Vec2);
}

function crescent(cx: number, cy: number, r: number): Vec2[] {
  const c2: Vec2 = [cx + r * 0.42, cy - r * 0.12];
  const r2 = r * 0.82;
  const outer: Vec2[] = [];
  const inner: Vec2[] = [];
  const N = 48;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const p: Vec2 = [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    if (dist(p, c2) > r2) outer.push(p);
    const q: Vec2 = [c2[0] + Math.cos(a) * r2, c2[1] + Math.sin(a) * r2];
    if (dist(q, [cx, cy]) < r) inner.push(q);
  }
  return [...outer, ...inner.reverse()];
}

export function star(cx: number, cy: number, R: number, r: number, n = 5): Vec2[] {
  return Array.from({ length: n * 2 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / n;
    const rr = i % 2 ? r : R;
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr] as Vec2;
  });
}

/* ================================================================== */
/* 1. Hewan peliharaan                                                 */
/* ================================================================== */

const HEWAN: Template[] = [
  extrude(
    { id: "rumah-kucing", title: "Rumah Kucing", category: "hewan", description: "Rumah beratap pelana dengan pintu bulat dan jendela. Muat untuk kucing dewasa.", difficulty: "sedang", minutes: 35, age: 9, tags: ["kucing", "rumah hewan"], featured: true },
    {
      pts: [
        [0, 0],
        [380, 0],
        [380, 280],
        [190, 430],
        [0, 280],
      ],
      sizeLabel: "Lebar depan",
      depth: 420,
      depthLabel: "Panjang",
      tab: 18,
      holesA: (k) => [circ(190 * k, 120 * k, 78 * k, 32)],
      holesB: (k) => [rectPoints(70 * k, 150 * k, 70 * k, 70 * k), rectPoints(240 * k, 150 * k, 70 * k, 70 * k)],
      labels: { A: "Depan berpintu", B: "Belakang", strip: (i) => ["Lantai", "Dinding kanan", "Atap kanan", "Atap kiri", "Dinding kiri"][i] },
    },
  ),
  tpl(
    { id: "cakar-kucing", title: "Tempat Cakar Kucing", category: "hewan", description: "Lapisan kardus berdiri berjajar dengan permukaan melengkung untuk rebahan sambil mencakar.", difficulty: "mudah", minutes: 40, age: 8, tags: ["kucing", "garukan", "berlapis"] },
    [mm("L", "Panjang", 450, 250, 700), mm("Hm", "Tinggi ujung", 130, 60, 220), mm("W", "Lebar", 200, 80, 400)],
    (p, c) => {
      const L = num(p, "L"),
        Hm = num(p, "Hm");
      const t = Math.max(1, c.t);
      const n = Math.max(6, Math.min(80, Math.round(num(p, "W") / t)));
      const top: Vec2[] = [];
      for (let i = 0; i <= 12; i++) {
        const x = L - (L * i) / 12;
        const u = (x - L / 2) / (L / 2);
        top.push([x, Hm * (0.55 + 0.45 * u * u)]);
      }
      const prof = flipY([[0, 0], [L, 0], ...top]);
      const panels: Panel[] = [];
      addPieces(
        panels,
        Array.from({ length: n }, (_, k) => ({ poly: prof, label: `Lapis ${k + 1}`, pose: (o: Vec2) => pose(STAND, o, [0, 0, (k + 1) * t]) })),
      );
      return { panels, closed: false, stacked: true };
    },
  ),
  extrude(
    { id: "rumah-burung", title: "Rumah Burung", category: "hewan", description: "Rumah burung mungil dengan lubang masuk, lubang tenggeran, dan lubang gantungan di atap.", difficulty: "mudah", minutes: 18, age: 7, tags: ["burung", "rumah hewan", "taman"] },
    {
      pts: [
        [0, 0],
        [140, 0],
        [140, 170],
        [70, 250],
        [0, 170],
      ],
      sizeLabel: "Lebar",
      depth: 140,
      depthLabel: "Kedalaman",
      tab: 10,
      holesA: (k) => [circ(70 * k, 115 * k, 18 * k), circ(70 * k, 72 * k, 4 * k, 12)],
      holesB: () => [],
      stripHoles: (k, depth) => ({ 2: [circ(Math.hypot(70, 80) * k - 14 * k, depth / 2, 4 * k, 12)] }),
      labels: { A: "Depan", B: "Belakang", strip: (i) => ["Alas", "Dinding kanan", "Atap kanan", "Atap kiri", "Dinding kiri"][i] },
    },
  ),
  extrude(
    { id: "terowongan-hamster", title: "Terowongan Hamster", category: "hewan", description: "Terowongan segi delapan dengan jendela intip. Sambung beberapa jadi labirin.", difficulty: "mudah", minutes: 15, age: 7, tags: ["hamster", "kelinci", "mainan hewan"] },
    {
      pts: [
        [30, 0],
        [120, 0],
        [150, 40],
        [150, 90],
        [120, 130],
        [30, 130],
        [0, 90],
        [0, 40],
      ],
      sizeLabel: "Lebar",
      depth: 300,
      depthLabel: "Panjang",
      tab: 12,
      sideA: false,
      sideB: false,
      open: true,
      stripHoles: (k, depth) => ({
        4: [0.25, 0.5, 0.75].map((f) => circ(45 * k, depth * f, 16 * k)),
        2: [0.33, 0.66].map((f) => circ(25 * k, depth * f, 11 * k)),
        6: [0.33, 0.66].map((f) => circ(25 * k, depth * f, 11 * k)),
      }),
      labels: { strip: (i) => (i === 0 ? "Lantai" : `Sisi ${i + 1}`) },
    },
  ),
];

/* ================================================================== */
/* 2. Meja & kantor                                                    */
/* ================================================================== */

const KANTOR: Template[] = [
  tpl(
    { id: "organizer-meja", title: "Organizer Meja Bersekat", category: "kantor", description: "Baki rendah dengan dua sekat lepas yang tinggal diselipkan. Rapikan pulpen, klip, dan kabel.", difficulty: "mudah", minutes: 15, age: 8, tags: ["meja", "alat tulis", "sekat"], featured: true },
    [mm("W", "Panjang", 240, 120, 500), mm("D", "Lebar", 160, 80, 400), mm("H", "Tinggi", 90, 40, 200), tabP(12)],
    (p, c) => {
      const W = num(p, "W"),
        D = num(p, "D"),
        H = num(p, "H");
      const net = buildBox({ W, D, H, tab: num(p, "tab"), lid: "open", t: c.t, compensate: c.compensate }).build(false);
      const h = H * 0.9;
      const div = rectPoints(0, 0, D - 2, h);
      addPieces(
        net.panels,
        [1, 2].map((i) => ({ poly: div, label: `Sekat ${i}`, pose: (o: Vec2) => pose(STAND_Z, o, [(W * i) / 3, h, 1]) })),
      );
      return net;
    },
  ),
  tpl(
    { id: "kotak-kabel", title: "Kotak Kabel", category: "kantor", description: "Sembunyikan stopkontak dan gulungan kabel. Ada lubang kabel di kedua sisi dan ventilasi di tutup.", difficulty: "mudah", minutes: 15, age: 9, tags: ["kabel", "meja", "rapi"] },
    [mm("W", "Panjang", 300, 160, 500), mm("D", "Lebar", 140, 80, 300), mm("H", "Tinggi", 120, 60, 250), tabP(14)],
    (p, c) => {
      const W = num(p, "W"),
        D = num(p, "D"),
        H = num(p, "H");
      const cw = c.compensate ? c.t : 0;
      const side = (len: number) => [stadiumPoints([len / 2, H * 0.45], Math.min(56, len * 0.5), 28)];
      return buildBox({
        W,
        D,
        H,
        tab: num(p, "tab"),
        lid: "glued",
        t: c.t,
        compensate: c.compensate,
        holes: { left: side(D), right: side(D), lid: [0.35, 0.5, 0.65].map((f) => stadiumPoints([W / 2 + cw, (D + cw) * f], W * 0.4, 8)) },
      }).build(true);
    },
  ),
  extrude(
    { id: "rak-buku-meja", title: "Rak Buku Meja", category: "kantor", description: "Rak terbuka di depan dengan satu papan tengah. Kuat untuk buku tulis dan komik.", difficulty: "sedang", minutes: 22, age: 9, tags: ["rak", "buku", "meja"] },
    {
      pts: [
        [0, 0],
        [180, 0],
        [180, 260],
        [0, 260],
      ],
      sizeLabel: "Kedalaman × tinggi",
      depth: 360,
      depthLabel: "Lebar rak",
      tab: 14,
      closed: false,
      sideA: true,
      sideB: true,
      labels: { A: "Sisi kiri", B: "Sisi kanan", strip: (i) => ["Alas", "Punggung", "Atas"][i] },
      extra: (panels, k, depth) => {
        const D = 180 * k;
        addPieces(panels, [{ poly: rectPoints(0, 0, D - 2, depth - 2), label: "Papan tengah", pose: (o) => pose(FLAT, o, [1, 130 * k, 1]) }]);
      },
    },
  ),
];

/* ================================================================== */
/* 3. Pesta                                                            */
/* ================================================================== */

function heartShape(w: number): Shape {
  const s = w / 100;
  const sh = new Shape();
  sh.moveTo(50 * s, 25 * s);
  sh.bezierCurveTo(50 * s, 25 * s, 45 * s, 0, 25 * s, 0);
  sh.bezierCurveTo(-5 * s, 0, -5 * s, 35 * s, -5 * s, 35 * s);
  sh.bezierCurveTo(-5 * s, 55 * s, 15 * s, 77 * s, 50 * s, 95 * s);
  sh.bezierCurveTo(85 * s, 77 * s, 105 * s, 55 * s, 105 * s, 35 * s);
  sh.bezierCurveTo(105 * s, 35 * s, 105 * s, 0, 75 * s, 0);
  sh.bezierCurveTo(60 * s, 0, 50 * s, 25 * s, 50 * s, 25 * s);
  return sh;
}

const PESTA: Template[] = [
  fromMesh(
    { id: "topi-pesta", title: "Topi Pesta Kerucut", category: "pesta", description: "Topi kerucut klasik untuk ulang tahun. Makin banyak sisi, makin bulat.", difficulty: "mudah", minutes: 8, age: 5, tags: ["ulang tahun", "topi", "pesta"], featured: true },
    [mm("d", "Diameter bawah", 160, 100, 260), mm("h", "Tinggi", 200, 100, 320), { key: "n", label: "Jumlah sisi", kind: "count", min: 8, max: 24, step: 1, default: 16 }, tabP(10)],
    (p) => {
      const g = new ConeGeometry(num(p, "d") / 2, num(p, "h"), num(p, "n"), 1, true);
      g.translate(0, num(p, "h") / 2, 0);
      return g;
    },
    false,
  ),
  fromMesh(
    { id: "pinata-bintang", title: "Piñata Bintang", category: "pesta", description: "Kotak bintang lima sudut untuk diisi permen, lalu digantung dan dipukul ramai-ramai.", difficulty: "sedang", minutes: 30, age: 8, tags: ["pinata", "ulang tahun", "bintang"] },
    [mm("R", "Jari-jari", 150, 80, 260), mm("D", "Tebal", 110, 50, 200), tabP(14)],
    (p) => {
      const R = num(p, "R");
      const pts = star(0, 0, R, R * 0.45);
      const sh = new Shape();
      pts.forEach(([x, y], i) => (i ? sh.lineTo(x, -y) : sh.moveTo(x, -y)));
      sh.closePath();
      return new ExtrudeGeometry(sh, { depth: num(p, "D"), bevelEnabled: false });
    },
  ),
  tpl(
    { id: "kotak-hati", title: "Kotak Suvenir Hati", category: "pesta", description: "Kotak berbentuk hati dengan tutup berengsel untuk cokelat dan suvenir pernikahan atau ulang tahun.", difficulty: "sedang", minutes: 25, age: 9, tags: ["hati", "suvenir", "kado"] },
    [mm("W", "Lebar", 160, 80, 300), mm("D", "Tinggi kotak", 60, 30, 150), tabP(10)],
    (p) => {
      const pts = heartShape(num(p, "W"))
        .getPoints(4)
        .map((v) => [v.x, -v.y] as Vec2);
      if (dist(pts[0], pts[pts.length - 1]) < 0.5) pts.pop();
      return buildProfile({ profile: seatProfile(pts), depth: num(p, "D"), tab: num(p, "tab"), root: "sideA", sideBTabs: false, labels: { A: "Alas", B: "Tutup", strip: (i) => `Dinding ${i + 1}` } }).build(false);
    },
  ),
  tpl(
    { id: "bendera-segitiga", title: "Bendera Segitiga (Bunting)", category: "pesta", description: "Rangkaian bendera segitiga dengan lipatan atas untuk dilewati tali. Cocok untuk dekorasi dinding.", difficulty: "mudah", minutes: 12, age: 5, tags: ["dekorasi", "bunting", "ulang tahun"] },
    [{ key: "n", label: "Jumlah bendera", kind: "count", min: 3, max: 12, step: 1, default: 6 }, mm("W", "Lebar bendera", 120, 60, 220), mm("H", "Tinggi bendera", 150, 70, 260)],
    (p) => {
      const n = num(p, "n"),
        W = num(p, "W"),
        H = num(p, "H");
      const F = 22;
      const nb = new NetBuilder();
      const offs = layout(
        Array.from({ length: n }, () => [
          [0, -F],
          [W, -F],
          [W, H],
          [0, H],
        ] as Vec2[]),
        0,
        W * 4 + 40,
        12,
      );
      offs.forEach((o, k) => {
        const flag: Vec2[] = shift(
          [
            [0, 0],
            [W, 0],
            [W / 2, H],
          ],
          o,
        );
        const sag = -24 * (1 - ((k - (n - 1) / 2) / Math.max(1, (n - 1) / 2)) ** 2);
        nb.add({ id: `flag${k}`, label: `Bendera ${k + 1}`, kind: "face", points: flag, rootPose: pose(STAND, o, [k * (W + 16), sag, 0]) });
        nb.attachEdge(`flag${k}`, 0, (L) => rectPoints(0, 0, L, F), { id: `fold${k}`, label: "Lipatan tali", kind: "flap", angle: 172 });
      });
      const net = nb.build(false);
      net.stacked = true;
      return net;
    },
  ),
];

/* ================================================================== */
/* 4. Hari raya                                                        */
/* ================================================================== */

const HARIRAYA: Template[] = [
  tpl(
    { id: "lentera-ramadan", title: "Lentera Ramadan", category: "hariraya", description: "Lentera segi enam beratap runcing dengan jendela bulan sabit dan bintang. Pakai lampu LED.", difficulty: "sedang", minutes: 30, age: 9, tags: ["ramadan", "lentera", "bulan sabit"], featured: true },
    [mm("s", "Lebar sisi", 60, 35, 120), mm("H", "Tinggi badan", 170, 90, 320), mm("roof", "Tinggi atap", 90, 40, 200), tabP(10)],
    (p) => {
      const s = num(p, "s"),
        H = num(p, "H");
      const holes: Record<number, Vec2[][]> = {};
      for (let i = 0; i < 6; i++) holes[i] = i % 2 === 0 ? [crescent(s / 2, H * 0.55, s * 0.28)] : [star(s / 2, H * 0.55, s * 0.26, s * 0.11), circ(s / 2, H * 0.22, s * 0.08, 12)];
      return buildTower({ n: 6, s, H, roof: num(p, "roof"), tab: num(p, "tab"), stripHoles: holes }).build(true);
    },
  ),
  fromMesh(
    { id: "ketupat", title: "Ketupat Lebaran", category: "hariraya", description: "Ketupat kardus berbentuk belah ketupat untuk hiasan Lebaran atau wadah kue kecil.", difficulty: "mudah", minutes: 12, age: 7, tags: ["lebaran", "ketupat", "hiasan"] },
    [mm("w", "Lebar", 120, 60, 240), mm("h", "Tinggi", 160, 80, 320), tabP(10)],
    (p) => {
      const g = new OctahedronGeometry(1);
      g.scale(num(p, "w") / 2, num(p, "h") / 2, num(p, "w") / 2);
      return g;
    },
  ),
  tpl(
    { id: "pohon-natal", title: "Pohon Natal Silang", category: "hariraya", description: "Dua siluet pohon bercelah yang disilangkan jadi pohon berdiri. Tanpa lem sama sekali.", difficulty: "mudah", minutes: 10, age: 6, tags: ["natal", "pohon", "tanpa lem"] },
    [mm("H", "Tinggi", 240, 120, 600)],
    (p, c) => {
      const k = num(p, "H") / 240;
      const t = Math.max(0.6, c.t);
      const right: Vec2[] = (
        [
          [20, 30],
          [90, 30],
          [50, 95],
          [75, 95],
          [38, 160],
          [58, 160],
        ] as Vec2[]
      ).map(([x, y]) => [x * k, y * k]);
      const left = right.map(([x, y]) => [-x, y] as Vec2).reverse();
      const half = 120 * k;
      const tipY = 160 * k + 80 * k * (1 - t / 2 / (58 * k));
      const A: Vec2[] = [[-20 * k, 0], [-t / 2, 0], [-t / 2, half], [t / 2, half], [t / 2, 0], [20 * k, 0], ...right, [0, 240 * k], ...left];
      const B: Vec2[] = [[-20 * k, 0], [20 * k, 0], ...right, [t / 2, tipY], [t / 2, half], [-t / 2, half], [-t / 2, tipY], ...left];
      const panels: Panel[] = [];
      addPieces(panels, [
        { poly: flipY(A), label: "Pohon A (celah bawah)", pose: (o) => pose(STAND, o, [0, 0, 0]) },
        { poly: flipY(B), label: "Pohon B (celah atas)", pose: (o) => pose(STAND_Z, o, [0, 0, 0]) },
      ]);
      return { panels, closed: false, stacked: true };
    },
  ),
];

/* ================================================================== */
/* 5. Sains & eksperimen                                               */
/* ================================================================== */

const SAINS: Template[] = [
  extrude(
    { id: "kaleidoskop", title: "Kaleidoskop", category: "sains", description: "Tabung segitiga untuk tiga cermin akrilik. Ujung kecil untuk mengintip, ujung besar untuk manik-manik.", difficulty: "mudah", minutes: 15, age: 8, tags: ["optik", "cermin", "eksperimen"] },
    {
      pts: [
        [0, 0],
        [60, 0],
        [30, 52],
      ],
      sizeLabel: "Lebar sisi",
      depth: 260,
      depthLabel: "Panjang",
      tab: 10,
      holesA: (k) => [circ(30 * k, 17 * k, 6 * k, 16)],
      holesB: (k) => [circ(30 * k, 17 * k, 13 * k, 20)],
      labels: { A: "Ujung intip", B: "Ujung objek" },
    },
  ),
  tpl(
    { id: "periskop", title: "Periskop", category: "sains", description: "Tabung tinggi dengan jendela atas dan bawah di sisi berlawanan. Pasang dua cermin miring 45°.", difficulty: "sedang", minutes: 20, age: 9, tags: ["optik", "cermin", "eksperimen"], featured: true },
    [mm("W", "Lebar", 70, 50, 140), mm("H", "Tinggi", 420, 200, 700), tabP(12)],
    (p, c) => {
      const W = num(p, "W"),
        H = num(p, "H");
      const w = W * 0.72;
      return buildBox({
        W,
        D: W,
        H,
        tab: num(p, "tab"),
        lid: "glued",
        t: c.t,
        compensate: c.compensate,
        holes: { front: [rectPoints(W / 2 - w / 2, H - W - 10, w, W * 0.8)], back: [rectPoints(W / 2 - w / 2, 14, w, W * 0.8)] },
        labels: { front: "Depan (jendela atas)", back: "Belakang (jendela bawah)" },
      }).build(true);
    },
  ),
  tpl(
    { id: "kamera-lubang-jarum", title: "Kamera Lubang Jarum", category: "sains", description: "Kotak gelap dengan lubang jarum di depan dan layar kertas kalkir di belakang. Bayangan tampak terbalik!", difficulty: "mudah", minutes: 15, age: 9, tags: ["optik", "kamera", "eksperimen"] },
    [mm("W", "Lebar", 150, 80, 260), mm("D", "Panjang", 200, 100, 360), mm("H", "Tinggi", 130, 80, 240), tabP(12)],
    (p, c) => {
      const W = num(p, "W"),
        H = num(p, "H");
      return buildBox({
        W,
        D: num(p, "D"),
        H,
        tab: num(p, "tab"),
        lid: "glued",
        t: c.t,
        compensate: c.compensate,
        holes: { front: [circ(W / 2, H / 2, 2.5, 12)], back: [rectPoints(W * 0.15, H * 0.2, W * 0.7, H * 0.6)] },
        labels: { front: "Depan (lubang jarum)", back: "Belakang (layar)" },
      }).build(true);
    },
  ),
  tpl(
    { id: "labirin-kelereng", title: "Labirin Kelereng", category: "sains", description: "Baki labirin dengan dinding lepas dan lubang tujuan. Miringkan untuk mengantar kelereng.", difficulty: "sedang", minutes: 25, age: 7, tags: ["permainan", "kelereng", "labirin"] },
    [mm("W", "Ukuran baki", 260, 160, 420), mm("H", "Tinggi dinding", 35, 20, 60), tabP(12)],
    (p, c) => {
      const W = num(p, "W"),
        H = num(p, "H");
      const net = buildBox({ W, D: W, H, tab: num(p, "tab"), lid: "open", t: c.t, compensate: c.compensate, holes: { base: [circ(W - 30, W - 30, 13)] } }).build(false);
      const h = H * 0.85;
      const walls: { a: number; b: number; at: number; dir: "x" | "z" }[] = [
        { dir: "x", a: 0, b: 0.7, at: 0.22 },
        { dir: "x", a: 0.3, b: 1, at: 0.46 },
        { dir: "x", a: 0, b: 0.72, at: 0.72 },
        { dir: "z", a: 0, b: 0.14, at: 0.5 },
        { dir: "z", a: 0.58, b: 0.72, at: 0.18 },
        { dir: "z", a: 0.72, b: 0.88, at: 0.8 },
      ];
      addPieces(
        net.panels,
        walls.map((w, i) => {
          const len = (w.b - w.a) * W - 2;
          return {
            poly: rectPoints(0, 0, len, h),
            label: `Dinding labirin ${i + 1}`,
            pose: (o: Vec2) => (w.dir === "x" ? pose(STAND, o, [w.a * W + 1, h, w.at * W]) : pose(STAND_Z, o, [w.at * W, h, w.a * W + 1])),
          };
        }),
      );
      return net;
    },
  ),
];

/* ================================================================== */
/* 6. Arsitektur Nusantara                                             */
/* ================================================================== */

const GADANG: Vec2[] = [
  [0, 0],
  [300, 0],
  [300, 110],
  [320, 130],
  [345, 200],
  [362, 300],
  [330, 280],
  [225, 230],
  [150, 215],
  [75, 230],
  [-30, 280],
  [-62, 300],
  [-45, 200],
  [-20, 130],
];

const JOGLO: Vec2[] = [
  [0, 0],
  [300, 0],
  [300, 100],
  [345, 105],
  [216, 172],
  [186, 260],
  [114, 260],
  [84, 172],
  [-45, 105],
  [0, 100],
];

const NUSANTARA: Template[] = [
  extrude(
    { id: "rumah-gadang", title: "Rumah Gadang", category: "nusantara", description: "Rumah adat Minangkabau dengan atap bergonjong melengkung tajam di kedua ujung.", difficulty: "sulit", minutes: 40, age: 10, tags: ["minangkabau", "sumatra barat", "rumah adat"], featured: true },
    {
      pts: GADANG,
      sizeLabel: "Panjang",
      depth: 160,
      depthLabel: "Lebar rumah",
      tab: 10,
      holesA: (k) => [...[40, 110, 190, 260].map((x) => rectPoints(x * k, 40 * k, 34 * k, 46 * k))],
      labels: { A: "Sisi muka", B: "Sisi belakang", strip: (i) => (i === 0 ? "Lantai" : `Dinding/atap ${i + 1}`) },
    },
  ),
  extrude(
    { id: "rumah-joglo", title: "Rumah Joglo", category: "nusantara", description: "Rumah adat Jawa dengan atap bersusun: landai di bawah, curam di tengah.", difficulty: "sedang", minutes: 30, age: 9, tags: ["jawa", "joglo", "rumah adat"] },
    {
      pts: JOGLO,
      sizeLabel: "Panjang",
      depth: 220,
      depthLabel: "Lebar rumah",
      tab: 10,
      holesA: (k) => [rectPoints(130 * k, 8 * k, 40 * k, 70 * k), rectPoints(50 * k, 35 * k, 34 * k, 34 * k), rectPoints(216 * k, 35 * k, 34 * k, 34 * k)],
      labels: { A: "Pendopo depan", B: "Belakang", strip: (i) => (i === 0 ? "Lantai" : `Dinding/atap ${i + 1}`) },
    },
  ),
  tpl(
    { id: "rumah-honai", title: "Rumah Honai", category: "nusantara", description: "Rumah adat Papua berdinding bundar dengan atap kerucut jerami dan satu pintu rendah.", difficulty: "sedang", minutes: 30, age: 9, tags: ["papua", "honai", "rumah adat"] },
    [mm("d", "Diameter", 220, 120, 400), mm("H", "Tinggi dinding", 90, 50, 200), mm("roof", "Tinggi atap", 150, 60, 300), tabP(10)],
    (p) => {
      const n = 14;
      const s = num(p, "d") * Math.sin(Math.PI / n);
      const H = num(p, "H");
      return buildTower({ n, s, H, roof: num(p, "roof"), tab: num(p, "tab"), stripHoles: { 0: [stadiumPoints([s / 2, H * 0.4], s * 0.7, H * 0.55)] } }).build(true);
    },
  ),
  tpl(
    { id: "candi-berundak", title: "Candi Berundak", category: "nusantara", description: "Candi bertingkat ala Borobudur dari lapisan kardus bertumpuk, dengan stupa di puncak.", difficulty: "mudah", minutes: 35, age: 8, tags: ["candi", "borobudur", "berlapis", "sejarah"] },
    [mm("W", "Lebar dasar", 320, 160, 600), { key: "tiers", label: "Jumlah undakan", kind: "count", min: 3, max: 7, step: 1, default: 5 }, mm("th", "Tinggi undakan", 24, 9, 60)],
    (p, c) => {
      const W = num(p, "W");
      const T = num(p, "tiers");
      const t = Math.max(0.6, c.t);
      const per = Math.max(1, Math.round(num(p, "th") / t));
      const pieces: { poly: Vec2[]; label: string; size: number; oct?: boolean }[] = [];
      for (let i = 0; i < T; i++) {
        const s = W * (1 - (i / T) * 0.7);
        for (let j = 0; j < per; j++) pieces.push({ poly: rectPoints(-s / 2, -s / 2, s, s), label: `Undakan ${i + 1} · lapis ${j + 1}`, size: s });
      }
      const top = W * 0.3 * 0.75;
      for (const f of [1, 0.8, 0.55, 0.3]) {
        const r = (top / 2) * f;
        const oct = Array.from({ length: 8 }, (_, i) => [Math.cos(((i + 0.5) * Math.PI) / 4) * r, Math.sin(((i + 0.5) * Math.PI) / 4) * r] as Vec2);
        for (let j = 0; j < Math.max(1, Math.round(per * 0.6)); j++) pieces.push({ poly: oct, label: "Stupa", size: r * 2, oct: true });
      }
      const panels: Panel[] = [];
      addPieces(
        panels,
        pieces.map((pc, k) => ({ poly: pc.poly, label: pc.label, pose: (o: Vec2) => pose(FLAT, o, [0, (k + 1) * t, 0]) })),
      );
      return { panels, closed: false, stacked: true };
    },
  ),
];

export const TEMATIK: Template[] = [...HEWAN, ...KANTOR, ...PESTA, ...HARIRAYA, ...SAINS, ...NUSANTARA];
