import { DodecahedronGeometry, IcosahedronGeometry, OctahedronGeometry, TetrahedronGeometry, type BufferGeometry } from "three";
import { addWheels as wheels, buildBox, buildProfile, buildPyramid, buildTower, NetBuilder, type BoxFace } from "./geometry/builder";
import { circlePoints, rectPoints, regularPolygon, stadiumPoints } from "./geometry/polygon";
import type { NetBase, Vec2 } from "./geometry/types";
import { meshFromGeometry, unfoldMesh } from "./geometry/unfold";
import { JAGOAN } from "./templates-jagoan";
import { HOBI } from "./templates-hobi";
import { TEMATIK } from "./templates-tematik";

export type Category = "kemasan" | "edukasi" | "mainan" | "rumah" | "furnitur" | "dekorasi" | "kostum" | "origami" | "hewan" | "kantor" | "pesta" | "hariraya" | "sains" | "nusantara" | "mainperan" | "hobibapak";
export type Difficulty = "mudah" | "sedang" | "sulit";

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: "kemasan", label: "Kemasan" },
  { id: "edukasi", label: "Edukasi (bangun ruang)" },
  { id: "mainan", label: "Mainan" },
  { id: "rumah", label: "Rumah & miniatur" },
  { id: "furnitur", label: "Furnitur" },
  { id: "dekorasi", label: "Dekorasi" },
  { id: "kostum", label: "Kostum" },
  { id: "origami", label: "Origami kardus" },
  { id: "hewan", label: "Hewan peliharaan" },
  { id: "kantor", label: "Meja & kantor" },
  { id: "pesta", label: "Pesta" },
  { id: "hariraya", label: "Hari raya" },
  { id: "sains", label: "Sains & eksperimen" },
  { id: "nusantara", label: "Arsitektur Nusantara" },
  { id: "mainperan", label: "Main peran" },
  { id: "hobibapak", label: "Hobi bapak" },
];

export interface ParamDef {
  key: string;
  label: string;
  kind: "mm" | "count" | "deg" | "choice";
  min?: number;
  max?: number;
  step?: number;
  default: number | string;
  options?: { value: string; label: string }[];
  /** Disembunyikan di Mode Mudah. */
  advanced?: boolean;
}

export type Params = Record<string, number | string>;

export interface BuildCtx {
  t: number;
  compensate: boolean;
}

export interface Template {
  id: string;
  title: string;
  category: Category;
  description: string;
  difficulty: Difficulty;
  minutes: number;
  age: number;
  tags: string[];
  params: ParamDef[];
  build: (p: Params, ctx: BuildCtx) => NetBase;
  featured?: boolean;
}

const num = (p: Params, k: string) => Number(p[k]);
const tabParam = (d = 15): ParamDef => ({ key: "tab", label: "Lebar tab lem", kind: "mm", min: 0, max: 30, step: 1, default: d, advanced: true });

/* ------------------------------------------------------------------ */
/* Helper bentuk                                                       */
/* ------------------------------------------------------------------ */

const centeredRect = (cx: number, cy: number, w: number, h: number): Vec2[] => rectPoints(cx - w / 2, cy - h / 2, w, h);
const circle = (cx: number, cy: number, r: number) => circlePoints([cx, cy], r, 28);

function polyhedron(geo: BufferGeometry, edge: number, tab: number): NetBase {
  // ukur panjang rusuk pada radius 1 lalu skalakan
  const res0 = unfoldMesh(meshFromGeometry(geo), { tabs: false, tabWidth: 0 });
  const p0 = res0.net.panels[0].points;
  const e0 = Math.hypot(p0[1][0] - p0[0][0], p0[1][1] - p0[0][1]);
  const g = geo.clone().scale(edge / e0, edge / e0, edge / e0);
  return unfoldMesh(meshFromGeometry(g), { tabs: tab > 0, tabWidth: tab }).net;
}

function dicePips(n: number, s: number): Vec2[][] {
  const r = s * 0.08;
  const a = s * 0.25;
  const m = s / 2;
  const at: Record<number, Vec2[]> = {
    1: [[m, m]],
    2: [
      [a, a],
      [s - a, s - a],
    ],
    3: [
      [a, a],
      [m, m],
      [s - a, s - a],
    ],
    4: [
      [a, a],
      [s - a, a],
      [a, s - a],
      [s - a, s - a],
    ],
    5: [
      [a, a],
      [s - a, a],
      [m, m],
      [a, s - a],
      [s - a, s - a],
    ],
    6: [
      [a, a],
      [s - a, a],
      [a, m],
      [s - a, m],
      [a, s - a],
      [s - a, s - a],
    ],
  };
  return at[n].map(([x, y]) => circle(x, y, r));
}

/* ------------------------------------------------------------------ */
/* Katalog                                                             */
/* ------------------------------------------------------------------ */

const boxParams = (W: number, D: number, H: number): ParamDef[] => [
  { key: "W", label: "Panjang", kind: "mm", min: 30, max: 600, step: 1, default: W },
  { key: "D", label: "Lebar", kind: "mm", min: 30, max: 600, step: 1, default: D },
  { key: "H", label: "Tinggi", kind: "mm", min: 20, max: 600, step: 1, default: H },
];

const lidParam = (d: string): ParamDef => ({
  key: "lid",
  label: "Jenis tutup",
  kind: "choice",
  default: d,
  options: [
    { value: "tuck", label: "Tutup selip" },
    { value: "glued", label: "Tutup lem (tertutup rapat)" },
    { value: "open", label: "Tanpa tutup" },
  ],
});

const BASE_TEMPLATES: Template[] = [
  /* ---------------------------- KEMASAN ---------------------------- */
  {
    id: "kotak-selip",
    title: "Kotak Tutup Selip",
    category: "kemasan",
    description: "Kotak kemasan serbaguna dengan lidah selip dan sayap penahan. Cocok untuk kue kering, aksesoris, atau hampers kecil.",
    difficulty: "sedang",
    minutes: 15,
    age: 10,
    tags: ["kotak", "tuck-end", "umkm", "hampers"],
    featured: true,
    params: [...boxParams(120, 80, 60), lidParam("tuck"), tabParam()],
    build: (p, c) =>
      buildBox({ W: num(p, "W"), D: num(p, "D"), H: num(p, "H"), tab: num(p, "tab"), lid: p.lid as "tuck", t: c.t, compensate: c.compensate }).build(p.lid === "glued"),
  },
  {
    id: "baki",
    title: "Baki Terbuka",
    category: "kemasan",
    description: "Baki tanpa tutup untuk display produk, wadah alat tulis, atau tatakan hampers.",
    difficulty: "mudah",
    minutes: 8,
    age: 7,
    tags: ["tray", "wadah", "display"],
    params: [...boxParams(200, 140, 40), tabParam()],
    build: (p, c) => buildBox({ W: num(p, "W"), D: num(p, "D"), H: num(p, "H"), tab: num(p, "tab"), lid: "open", t: c.t, compensate: c.compensate }).build(false),
  },
  {
    id: "kotak-kue",
    title: "Kotak Kue Berjendela",
    category: "kemasan",
    description: "Kotak kue dengan jendela di tutup supaya isinya terlihat. Tempel plastik mika di bagian dalam.",
    difficulty: "sedang",
    minutes: 18,
    age: 10,
    tags: ["kue", "bakery", "jendela", "umkm"],
    params: [...boxParams(160, 160, 70), { key: "win", label: "Ukuran jendela", kind: "mm", min: 20, max: 300, step: 1, default: 90 }, tabParam()],
    build: (p, c) => {
      const W = num(p, "W"),
        D = num(p, "D");
      const win = Math.min(num(p, "win"), W - 20, D - 20);
      const cw = c.compensate ? c.t : 0;
      return buildBox({
        W,
        D,
        H: num(p, "H"),
        tab: num(p, "tab"),
        lid: "tuck",
        t: c.t,
        compensate: c.compensate,
        holes: { lid: [centeredRect(W / 2 + cw, (D + cw) / 2, win, win)] },
      }).build(false);
    },
  },
  {
    id: "kotak-segi-enam",
    title: "Kotak Hadiah Segi Enam",
    category: "kemasan",
    description: "Kotak prisma segi enam dengan tutup engsel. Terlihat istimewa untuk kado dan suvenir.",
    difficulty: "sedang",
    minutes: 20,
    age: 10,
    tags: ["kado", "heksagon", "suvenir"],
    params: [
      { key: "s", label: "Panjang sisi", kind: "mm", min: 20, max: 200, step: 1, default: 50 },
      { key: "H", label: "Tinggi", kind: "mm", min: 20, max: 400, step: 1, default: 80 },
      tabParam(12),
    ],
    build: (p) =>
      buildProfile({
        profile: regularPolygon(6, num(p, "s")),
        depth: num(p, "H"),
        tab: num(p, "tab"),
        root: "sideA",
        sideBTabs: false,
        labels: { A: "Alas", B: "Tutup", strip: (i) => `Dinding ${i + 1}` },
      }).build(false),
  },
  {
    id: "kemasan-segitiga",
    title: "Kemasan Prisma Segitiga",
    category: "kemasan",
    description: "Kemasan memanjang berpenampang segitiga, seperti kemasan cokelat batang.",
    difficulty: "mudah",
    minutes: 10,
    age: 8,
    tags: ["prisma", "cokelat", "snack"],
    params: [
      { key: "s", label: "Sisi segitiga", kind: "mm", min: 20, max: 200, step: 1, default: 45 },
      { key: "L", label: "Panjang", kind: "mm", min: 40, max: 500, step: 1, default: 180 },
      tabParam(12),
    ],
    build: (p) =>
      buildProfile({ profile: regularPolygon(3, num(p, "s")), depth: num(p, "L"), tab: num(p, "tab"), root: "strip", labels: { A: "Ujung kiri", B: "Ujung kanan" } }).build(true),
  },

  /* ---------------------------- EDUKASI ---------------------------- */
  {
    id: "kubus",
    title: "Kubus",
    category: "edukasi",
    description: "Jaring-jaring kubus klasik bentuk salib. Bagus untuk mengenalkan sisi, rusuk, dan titik sudut.",
    difficulty: "mudah",
    minutes: 8,
    age: 7,
    tags: ["bangun ruang", "jaring-jaring", "kubus", "sd"],
    featured: true,
    params: [{ key: "s", label: "Panjang rusuk", kind: "mm", min: 20, max: 400, step: 1, default: 70 }, tabParam(12)],
    build: (p, c) => {
      const s = num(p, "s");
      const nb = buildBox({ W: s, D: s, H: s, tab: num(p, "tab"), lid: "glued", t: c.t, compensate: c.compensate, labels: { lid: "Atas", base: "Bawah", front: "Depan", back: "Belakang", left: "Kiri", right: "Kanan" } });
      nb.dims = [{ a: [0, s * 0.25], b: [s, s * 0.25], param: "s", offset: 0 }];
      return nb.build(true);
    },
  },
  {
    id: "balok",
    title: "Balok",
    category: "edukasi",
    description: "Jaring-jaring balok dengan panjang, lebar, dan tinggi yang bisa diatur. Cocok untuk belajar volume.",
    difficulty: "mudah",
    minutes: 10,
    age: 7,
    tags: ["bangun ruang", "jaring-jaring", "balok", "volume"],
    params: [...boxParams(100, 60, 40), tabParam(12)],
    build: (p, c) => buildBox({ W: num(p, "W"), D: num(p, "D"), H: num(p, "H"), tab: num(p, "tab"), lid: "glued", t: c.t, compensate: c.compensate }).build(true),
  },
  {
    id: "prisma-segi-n",
    title: "Prisma Segi-n",
    category: "edukasi",
    description: "Prisma tegak dengan jumlah sisi alas yang bisa diubah dari 3 sampai 12.",
    difficulty: "sedang",
    minutes: 12,
    age: 10,
    tags: ["bangun ruang", "prisma", "segi banyak", "prisma segitiga", "prisma segi lima"],
    params: [
      { key: "n", label: "Jumlah sisi", kind: "count", min: 3, max: 12, step: 1, default: 5 },
      { key: "s", label: "Panjang sisi alas", kind: "mm", min: 15, max: 200, step: 1, default: 45 },
      { key: "H", label: "Tinggi", kind: "mm", min: 20, max: 400, step: 1, default: 90 },
      tabParam(12),
    ],
    build: (p) =>
      buildProfile({ profile: regularPolygon(num(p, "n"), num(p, "s")), depth: num(p, "H"), tab: num(p, "tab"), root: "sideA", labels: { A: "Alas", B: "Tutup" } }).build(true),
  },
  {
    id: "limas-segi-n",
    title: "Limas Segi-n",
    category: "edukasi",
    description: "Limas dengan alas segi banyak beraturan, dari segitiga sampai segi dua belas.",
    difficulty: "sedang",
    minutes: 12,
    age: 10,
    tags: ["bangun ruang", "limas", "piramida", "limas segitiga", "limas segi empat"],
    params: [
      { key: "n", label: "Jumlah sisi", kind: "count", min: 3, max: 12, step: 1, default: 4 },
      { key: "s", label: "Sisi alas", kind: "mm", min: 15, max: 200, step: 1, default: 60 },
      { key: "h", label: "Tinggi", kind: "mm", min: 10, max: 400, step: 1, default: 80 },
      tabParam(10),
    ],
    build: (p) => buildPyramid({ n: num(p, "n"), s: num(p, "s"), h: num(p, "h"), tab: num(p, "tab") }).build(true),
  },
  {
    id: "tabung",
    title: "Tabung (Silinder Segi Banyak)",
    category: "edukasi",
    description: "Silinder didekati dengan prisma bersisi banyak. Makin banyak sisi, makin bulat.",
    difficulty: "sedang",
    minutes: 15,
    age: 10,
    tags: ["bangun ruang", "tabung", "silinder"],
    params: [
      { key: "n", label: "Jumlah sisi", kind: "count", min: 8, max: 24, step: 1, default: 16 },
      { key: "d", label: "Diameter", kind: "mm", min: 30, max: 300, step: 1, default: 80 },
      { key: "H", label: "Tinggi", kind: "mm", min: 20, max: 400, step: 1, default: 100 },
      tabParam(10),
    ],
    build: (p) => {
      const n = num(p, "n");
      const s = num(p, "d") * Math.sin(Math.PI / n);
      return buildProfile({ profile: regularPolygon(n, s), depth: num(p, "H"), tab: num(p, "tab"), root: "sideA", labels: { A: "Alas", B: "Tutup", strip: (i) => `Selimut ${i + 1}` } }).build(true);
    },
  },
  {
    id: "kerucut",
    title: "Kerucut (Segi Banyak)",
    category: "edukasi",
    description: "Kerucut didekati dengan limas bersisi banyak.",
    difficulty: "sedang",
    minutes: 12,
    age: 10,
    tags: ["bangun ruang", "kerucut"],
    params: [
      { key: "n", label: "Jumlah sisi", kind: "count", min: 8, max: 20, step: 1, default: 14 },
      { key: "d", label: "Diameter alas", kind: "mm", min: 30, max: 300, step: 1, default: 90 },
      { key: "h", label: "Tinggi", kind: "mm", min: 20, max: 400, step: 1, default: 100 },
      tabParam(8),
    ],
    build: (p) => {
      const n = num(p, "n");
      return buildPyramid({ n, s: num(p, "d") * Math.sin(Math.PI / n), h: num(p, "h"), tab: num(p, "tab") }).build(true);
    },
  },
  {
    id: "tetrahedron",
    title: "Tetrahedron (Limas Segitiga Beraturan)",
    category: "edukasi",
    description: "Bangun ruang Platonik dengan 4 sisi segitiga sama sisi.",
    difficulty: "mudah",
    minutes: 6,
    age: 8,
    tags: ["platonik", "limas segitiga"],
    params: [{ key: "e", label: "Panjang rusuk", kind: "mm", min: 20, max: 300, step: 1, default: 80 }, tabParam(10)],
    build: (p) => polyhedron(new TetrahedronGeometry(1), num(p, "e"), num(p, "tab")),
  },
  {
    id: "oktahedron",
    title: "Oktahedron",
    category: "edukasi",
    description: "Bangun ruang Platonik dengan 8 sisi segitiga.",
    difficulty: "sedang",
    minutes: 10,
    age: 10,
    tags: ["platonik"],
    params: [{ key: "e", label: "Panjang rusuk", kind: "mm", min: 20, max: 300, step: 1, default: 60 }, tabParam(10)],
    build: (p) => polyhedron(new OctahedronGeometry(1), num(p, "e"), num(p, "tab")),
  },
  {
    id: "dodekahedron",
    title: "Dodekahedron",
    category: "edukasi",
    description: "Bangun ruang Platonik dengan 12 sisi segi lima.",
    difficulty: "sulit",
    minutes: 25,
    age: 12,
    tags: ["platonik", "segi lima"],
    params: [{ key: "e", label: "Panjang rusuk", kind: "mm", min: 15, max: 200, step: 1, default: 35 }, tabParam(8)],
    build: (p) => polyhedron(new DodecahedronGeometry(1), num(p, "e"), num(p, "tab")),
  },
  {
    id: "ikosahedron",
    title: "Ikosahedron",
    category: "edukasi",
    description: "Bangun ruang Platonik dengan 20 sisi segitiga. Tantangan untuk tangan yang sabar.",
    difficulty: "sulit",
    minutes: 30,
    age: 12,
    tags: ["platonik"],
    params: [{ key: "e", label: "Panjang rusuk", kind: "mm", min: 15, max: 200, step: 1, default: 40 }, tabParam(8)],
    build: (p) => polyhedron(new IcosahedronGeometry(1), num(p, "e"), num(p, "tab")),
  },

  /* ---------------------------- MAINAN ----------------------------- */
  {
    id: "dadu",
    title: "Dadu Berlubang",
    category: "mainan",
    description: "Kubus dengan titik dadu yang dilubangi. Sisi berseberangan selalu berjumlah 7.",
    difficulty: "mudah",
    minutes: 10,
    age: 7,
    tags: ["dadu", "permainan", "kubus"],
    params: [{ key: "s", label: "Ukuran", kind: "mm", min: 30, max: 300, step: 1, default: 70 }, tabParam(12)],
    build: (p, c) => {
      const s = num(p, "s");
      const holes: Partial<Record<BoxFace, Vec2[][]>> = {
        base: dicePips(1, s),
        lid: dicePips(6, s),
        front: dicePips(2, s),
        back: dicePips(5, s),
        left: dicePips(3, s),
        right: dicePips(4, s),
      };
      const nb = buildBox({ W: s, D: s, H: s, tab: num(p, "tab"), lid: "glued", t: c.t, compensate: c.compensate, holes });
      nb.dims = [{ a: [0, s * 0.12], b: [s, s * 0.12], param: "s", offset: 0 }];
      return nb.build(true);
    },
  },
  {
    id: "mobil",
    title: "Mobil Sedan",
    category: "mainan",
    description: "Badan mobil dari satu lembar dengan kap dan kaca berlipat lembah, plus empat roda terpisah.",
    difficulty: "sedang",
    minutes: 25,
    age: 8,
    tags: ["kendaraan", "mobil", "lipat lembah"],
    featured: true,
    params: [
      { key: "L", label: "Panjang", kind: "mm", min: 120, max: 600, step: 1, default: 220 },
      { key: "H", label: "Tinggi", kind: "mm", min: 40, max: 300, step: 1, default: 80 },
      { key: "W", label: "Lebar", kind: "mm", min: 40, max: 300, step: 1, default: 90 },
      tabParam(10),
    ],
    build: (p, c) => {
      const L = num(p, "L"),
        H = num(p, "H"),
        W = num(p, "W");
      const prof: Vec2[] = [
        [0, 0],
        [L, 0],
        [L, 0.42 * H],
        [0.78 * L, 0.5 * H],
        [0.62 * L, H],
        [0.27 * L, H],
        [0.12 * L, 0.55 * H],
        [0, 0.5 * H],
      ];
      const winA: Vec2[] = [
        [0.6 * L, 0.6 * H],
        [0.33 * L, 0.6 * H],
        [0.33 * L, 0.92 * H],
        [0.56 * L, 0.92 * H],
      ];
      const nb = buildProfile({
        profile: prof,
        depth: W,
        tab: num(p, "tab"),
        root: "strip",
        sideHoles: { A: [winA], B: [winA] },
        labels: { A: "Sisi kiri", B: "Sisi kanan", strip: (i) => ["Lantai", "Bumper depan", "Kap mesin", "Kaca depan", "Atap", "Kaca belakang", "Bagasi", "Bumper belakang"][i] ?? `Sisi ${i + 1}` },
      });
      wheels(nb, L, H, W, c.t, [0.22 * L, 0.78 * L], 0.17 * H + 0.06 * L);
      return nb.build(false);
    },
  },
  {
    id: "truk",
    title: "Truk Bak",
    category: "mainan",
    description: "Truk dengan kabin dan bak barang. Sambungan kabin ke bak memakai lipat lembah.",
    difficulty: "sedang",
    minutes: 25,
    age: 8,
    tags: ["kendaraan", "truk", "lipat lembah"],
    params: [
      { key: "L", label: "Panjang", kind: "mm", min: 150, max: 600, step: 1, default: 240 },
      { key: "H", label: "Tinggi", kind: "mm", min: 50, max: 300, step: 1, default: 110 },
      { key: "W", label: "Lebar", kind: "mm", min: 40, max: 300, step: 1, default: 90 },
      tabParam(10),
    ],
    build: (p, c) => {
      const L = num(p, "L"),
        H = num(p, "H"),
        W = num(p, "W");
      const prof: Vec2[] = [
        [0, 0],
        [L, 0],
        [L, 0.45 * H],
        [0.9 * L, 0.75 * H],
        [0.68 * L, 0.75 * H],
        [0.68 * L, H],
        [0, H],
      ];
      const win: Vec2[] = centeredRect(0.8 * L, 0.6 * H, 0.08 * L, 0.18 * H);
      const nb = buildProfile({
        profile: prof,
        depth: W,
        tab: num(p, "tab"),
        root: "strip",
        sideHoles: { A: [win], B: [win] },
        labels: { A: "Sisi kiri", B: "Sisi kanan", strip: (i) => ["Lantai", "Depan", "Kaca depan", "Atap kabin", "Dinding bak", "Atap bak", "Pintu belakang"][i] ?? `Sisi ${i + 1}` },
      });
      wheels(nb, L, H, W, c.t, [0.18 * L, 0.8 * L], 0.14 * H + 0.05 * L);
      return nb.build(false);
    },
  },
  {
    id: "roket",
    title: "Roket",
    category: "mainan",
    description: "Badan roket segi delapan dengan hidung lancip. Bisa jadi celengan dengan menambah slot koin.",
    difficulty: "sedang",
    minutes: 20,
    age: 8,
    tags: ["roket", "luar angkasa", "menara"],
    params: [
      { key: "s", label: "Sisi badan", kind: "mm", min: 15, max: 100, step: 1, default: 28 },
      { key: "H", label: "Tinggi badan", kind: "mm", min: 50, max: 500, step: 1, default: 180 },
      { key: "nose", label: "Tinggi hidung", kind: "mm", min: 20, max: 300, step: 1, default: 90 },
      tabParam(8),
    ],
    build: (p) => {
      const s = num(p, "s");
      return buildTower({ n: 8, s, H: num(p, "H"), roof: num(p, "nose"), tab: num(p, "tab"), stripHoles: { 0: [circle(s / 2, num(p, "H") * 0.3, s * 0.32)] } }).build(true);
    },
  },

  /* ----------------------------- RUMAH ----------------------------- */
  {
    id: "rumah",
    title: "Rumah Mini",
    category: "rumah",
    description: "Rumah beratap pelana dengan pintu yang bisa dibuka dan jendela di kedua sisi.",
    difficulty: "sedang",
    minutes: 25,
    age: 8,
    tags: ["rumah", "miniatur", "diorama"],
    featured: true,
    params: [
      { key: "W", label: "Lebar depan", kind: "mm", min: 60, max: 500, step: 1, default: 120 },
      { key: "D", label: "Panjang", kind: "mm", min: 60, max: 500, step: 1, default: 150 },
      { key: "H", label: "Tinggi dinding", kind: "mm", min: 40, max: 400, step: 1, default: 80 },
      { key: "R", label: "Tinggi atap", kind: "mm", min: 10, max: 300, step: 1, default: 55 },
      tabParam(12),
    ],
    build: (p) => {
      const W = num(p, "W"),
        D = num(p, "D"),
        H = num(p, "H"),
        R = num(p, "R");
      const prof: Vec2[] = [
        [0, 0],
        [W, 0],
        [W, H],
        [W / 2, H + R],
        [0, H],
      ];
      const dw = Math.min(W * 0.28, 40),
        dh = Math.min(H * 0.7, 60);
      const door: Vec2[] = rectPoints(W / 2 - dw / 2, 6, dw, dh);
      const winH = Math.min(H * 0.35, 30);
      const winW = Math.min(D * 0.18, 30);
      const sideWins = [centeredRect(D * 0.28, H * 0.55, winW, winH), centeredRect(D * 0.72, H * 0.55, winW, winH)].map((r) => r.map(([u, v]) => [v, u] as Vec2));
      const nb = buildProfile({
        profile: prof,
        depth: D,
        tab: num(p, "tab"),
        root: "strip",
        sideHoles: { A: [door], B: [centeredRect(W / 2, H * 0.5, W * 0.3, winH)] },
        stripHoles: { 1: sideWins, 4: sideWins },
        labels: { A: "Dinding depan", B: "Dinding belakang", strip: (i) => ["Lantai", "Dinding kanan", "Atap kanan", "Atap kiri", "Dinding kiri"][i] },
      });
      // daun pintu berengsel lipat lembah
      const side = nb.get("sideA");
      const map = (q: Vec2): Vec2 => [q[0], -q[1]];
      const dp = door.map(map);
      nb.add({ id: "door", label: "Daun pintu", kind: "flap", points: dp, parent: side.id, hinge: [dp[3], dp[0]], angle: -35 });
      return nb.build(false);
    },
  },
  {
    id: "menara",
    title: "Menara Kastil",
    category: "rumah",
    description: "Menara segi enam beratap runcing dengan jendela melengkung.",
    difficulty: "sedang",
    minutes: 20,
    age: 9,
    tags: ["kastil", "menara", "miniatur"],
    params: [
      { key: "n", label: "Jumlah sisi", kind: "count", min: 4, max: 12, step: 1, default: 6 },
      { key: "s", label: "Sisi dinding", kind: "mm", min: 15, max: 150, step: 1, default: 40 },
      { key: "H", label: "Tinggi dinding", kind: "mm", min: 40, max: 400, step: 1, default: 140 },
      { key: "roof", label: "Tinggi atap", kind: "mm", min: 20, max: 300, step: 1, default: 80 },
      tabParam(10),
    ],
    build: (p) => {
      const n = num(p, "n"),
        s = num(p, "s"),
        H = num(p, "H");
      const holes: Record<number, Vec2[][]> = {};
      for (let i = 0; i < n; i += 2) holes[i] = [stadiumPoints([s / 2, H * 0.6], s * 0.3, H * 0.22)];
      return buildTower({ n, s, H, roof: num(p, "roof"), tab: num(p, "tab"), stripHoles: holes }).build(true);
    },
  },

  /* ---------------------------- FURNITUR --------------------------- */
  {
    id: "stand-hp",
    title: "Stand HP",
    category: "furnitur",
    description: "Penyangga ponsel dengan bibir penahan. Kokoh kalau memakai kardus double wall.",
    difficulty: "mudah",
    minutes: 12,
    age: 9,
    tags: ["meja", "ponsel", "gadget"],
    params: [
      { key: "L", label: "Panjang alas", kind: "mm", min: 60, max: 250, step: 1, default: 110 },
      { key: "H", label: "Tinggi", kind: "mm", min: 50, max: 250, step: 1, default: 100 },
      { key: "W", label: "Lebar", kind: "mm", min: 40, max: 200, step: 1, default: 75 },
      tabParam(12),
    ],
    build: (p) => {
      const L = num(p, "L"),
        H = num(p, "H");
      const prof: Vec2[] = [
        [0, 0],
        [L, 0],
        [L, 18],
        [L - 10, 18],
        [L - 16, 10],
        [0, H],
      ];
      return buildProfile({ profile: prof, depth: num(p, "W"), tab: num(p, "tab"), root: "strip", labels: { A: "Sisi kiri", B: "Sisi kanan", strip: (i) => ["Alas", "Depan", "Bibir", "Penahan", "Sandaran", "Belakang"][i] } }).build(true);
    },
  },
  {
    id: "meja-laptop",
    title: "Penyangga Laptop",
    category: "furnitur",
    description: "Penyangga miring untuk laptop agar layar lebih tinggi dan sirkulasi udara lebih baik.",
    difficulty: "sedang",
    minutes: 20,
    age: 12,
    tags: ["meja", "laptop", "kerja"],
    params: [
      { key: "L", label: "Kedalaman", kind: "mm", min: 150, max: 400, step: 1, default: 240 },
      { key: "h1", label: "Tinggi depan", kind: "mm", min: 20, max: 150, step: 1, default: 40 },
      { key: "h2", label: "Tinggi belakang", kind: "mm", min: 40, max: 250, step: 1, default: 110 },
      { key: "W", label: "Lebar", kind: "mm", min: 150, max: 450, step: 1, default: 280 },
      tabParam(15),
    ],
    build: (p) => {
      const L = num(p, "L");
      const prof: Vec2[] = [
        [0, 0],
        [L, 0],
        [L, num(p, "h1")],
        [0, num(p, "h2")],
      ];
      return buildProfile({ profile: prof, depth: num(p, "W"), tab: num(p, "tab"), root: "strip", labels: { A: "Sisi kiri", B: "Sisi kanan", strip: (i) => ["Alas", "Depan", "Permukaan miring", "Belakang"][i] } }).build(true);
    },
  },
  {
    id: "tempat-pensil",
    title: "Tempat Pensil",
    category: "furnitur",
    description: "Wadah alat tulis tinggi tanpa tutup, dengan lubang jari untuk mengangkat.",
    difficulty: "mudah",
    minutes: 10,
    age: 7,
    tags: ["meja", "alat tulis", "organizer"],
    params: [...boxParams(80, 80, 110), tabParam(12)],
    build: (p, c) => {
      const W = num(p, "W");
      return buildBox({ W, D: num(p, "D"), H: num(p, "H"), tab: num(p, "tab"), lid: "open", t: c.t, compensate: c.compensate, holes: { front: [stadiumPoints([W / 2, num(p, "H") - 18], 26, 12)] } }).build(false);
    },
  },

  /* ---------------------------- DEKORASI --------------------------- */
  {
    id: "pot-segi-delapan",
    title: "Pot Tanaman Segi Delapan",
    category: "dekorasi",
    description: "Pot hias untuk tanaman kering atau pot plastik kecil.",
    difficulty: "mudah",
    minutes: 12,
    age: 8,
    tags: ["tanaman", "hiasan", "pot"],
    params: [
      { key: "s", label: "Sisi", kind: "mm", min: 15, max: 100, step: 1, default: 35 },
      { key: "H", label: "Tinggi", kind: "mm", min: 40, max: 300, step: 1, default: 90 },
      tabParam(10),
    ],
    build: (p) => buildProfile({ profile: regularPolygon(8, num(p, "s")), depth: num(p, "H"), tab: num(p, "tab"), root: "sideA", sideB: false, labels: { A: "Alas" } }).build(false),
  },

  /* ----------------------------- KOSTUM ---------------------------- */

  /* ----------------------------- ORIGAMI --------------------------- */
  {
    id: "tangga-zigzag",
    title: "Tangga Lipat Zig-zag",
    category: "origami",
    description: "Satu lembar kardus yang dilipat gunung-lembah bergantian menjadi tangga display.",
    difficulty: "mudah",
    minutes: 6,
    age: 7,
    tags: ["origami", "zig-zag", "display", "lipat lembah"],
    params: [
      { key: "k", label: "Jumlah anak tangga", kind: "count", min: 2, max: 8, step: 1, default: 4 },
      { key: "step", label: "Tinggi anak tangga", kind: "mm", min: 15, max: 120, step: 1, default: 40 },
      { key: "W", label: "Lebar", kind: "mm", min: 40, max: 400, step: 1, default: 140 },
    ],
    build: (p) => {
      const k = num(p, "k"),
        st = num(p, "step");
      const prof: Vec2[] = [[0, 0]];
      let x = 0,
        y = 0;
      prof.push([(x += st * 1.2), y]);
      for (let i = 0; i < k; i++) {
        prof.push([x, (y += st)]);
        prof.push([(x += st * 1.2), y]);
      }
      return buildProfile({ profile: prof, depth: num(p, "W"), tab: 0, root: "strip", closed: false, labels: { strip: (i) => (i % 2 === 0 ? `Pijakan ${i / 2 + 1}` : `Tegak ${(i + 1) / 2}`) } }).build(false);
    },
  },
  {
    id: "kartu-meja",
    title: "Kartu Meja Segitiga",
    category: "origami",
    description: "Papan nama atau menu meja berbentuk segitiga dari satu lipatan sederhana.",
    difficulty: "mudah",
    minutes: 4,
    age: 7,
    tags: ["origami", "papan nama", "menu", "acara"],
    params: [
      { key: "W", label: "Lebar", kind: "mm", min: 60, max: 400, step: 1, default: 200 },
      { key: "H", label: "Tinggi sisi", kind: "mm", min: 30, max: 200, step: 1, default: 70 },
      tabParam(15),
    ],
    build: (p) => {
      const H = num(p, "H");
      return buildProfile({ profile: regularPolygon(3, H), depth: num(p, "W"), tab: num(p, "tab"), root: "strip", sideA: false, sideB: false, labels: { strip: (i) => ["Alas", "Muka depan", "Muka belakang"][i] } }).build(false);
    },
  },
];

function taper(L: number, w: number): Vec2[] {
  return [
    [0, 0],
    [L, 0],
    [L * 0.8, w],
    [L * 0.2, w],
  ];
}

export const TEMPLATES: Template[] = [...BASE_TEMPLATES, ...JAGOAN, ...TEMATIK, ...HOBI];

export const templateById = (id: string) => TEMPLATES.find((t) => t.id === id);

export function defaultParams(t: Template): Params {
  return Object.fromEntries(t.params.map((p) => [p.key, p.default]));
}

