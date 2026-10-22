import { unfoldMesh } from "./geometry/unfold";
import type { NetBase } from "./geometry/types";
import { beam, block, cyl, hull, loft, type P3, type Part, prism, ring, scalePart, toMesh } from "./solid";
import type { Category, Difficulty, ParamDef, Params, Template } from "./templates";

/*
 * Mainan 3D sungguhan: tiap mainan dirakit dari solid low-poly (badan, roda, sayap, dll.),
 * dibongkar otomatis jadi pola kardus, lalu tiap bagian dirakit kembali ke posisi aslinya.
 */

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

const num = (p: Params, k: string) => Number(p[k]);
const mm = (key: string, label: string, def: number, min: number, max: number): ParamDef => ({ key, label, kind: "mm", min, max, step: 1, default: def });
const tabP = (d: number): ParamDef => ({ key: "tab", label: "Lebar tab lem", kind: "mm", min: 0, max: 25, step: 1, default: d, advanced: true });

/** Template dari kumpulan bagian 3D. `parts` digambar dalam mm nominal; ukuran diskalakan. */
export function solid3d(m: Meta, def: number, sizeLabel: string, parts: () => Part[]): Template {
  let nominal: { parts: Part[]; extent: number } | null = null;
  const cache = new Map<string, NetBase>();
  const base = () => {
    if (!nominal) {
      const ps = parts();
      const all = ps.flat(2);
      const ext = [0, 1, 2].map((i) => Math.max(...all.map((q) => q[i])) - Math.min(...all.map((q) => q[i])));
      nominal = { parts: ps, extent: Math.max(...ext) };
    }
    return nominal;
  };
  const params = [mm("size", sizeLabel, def, Math.round(def * 0.5), Math.round(def * 2.5)), tabP(8)];
  const build = (p: Params): NetBase => {
    const key = `${num(p, "size")}|${num(p, "tab")}`;
    const hit = cache.get(key);
    if (hit) return hit;
    const { parts: ps, extent } = base();
    const k = num(p, "size") / extent;
    const tab = num(p, "tab");
    const net: NetBase = { ...unfoldMesh(toMesh(ps.map((pt) => scalePart(pt, k))), { tabs: tab > 0, tabWidth: tab, keepPose: true }).net, closed: true };
    if (cache.size > 8) cache.delete(cache.keys().next().value!);
    cache.set(key, net);
    return net;
  };
  return { ...m, tags: ["baru", "3d", ...m.tags], params, build };
}

const both = (f: (s: 1 | -1) => Part[]): Part[] => [...f(1), ...f(-1)];
const X: P3 = [1, 0, 0];
const Y: P3 = [0, 1, 0];

/* ------------------------------------------------------------------ */
/* Controller PS4                                                      */
/* ------------------------------------------------------------------ */

function controller(): Part[] {
  const outline: [number, number][] = [
    [-62, -34],
    [62, -34],
    [72, -26],
    [76, -12],
    [70, 6],
    [46, 14],
    [-46, 14],
    [-70, 6],
    [-76, -12],
    [-72, -26],
  ];
  const layer = (y: number, inset: number) =>
    outline.map(([x, z]) => {
      const dx = x,
        dz = z + 10;
      const L = Math.hypot(dx, dz);
      return [x - (dx / L) * inset, y, z - (dz / L) * inset] as P3;
    });
  const body = hull([...layer(4, 6), ...layer(16, 0), ...layer(27, 7)]);
  const dpad: [number, number][] = [
    [-3, -10],
    [3, -10],
    [3, -3],
    [10, -3],
    [10, 3],
    [3, 3],
    [3, 10],
    [-3, 10],
    [-3, 3],
    [-10, 3],
    [-10, -3],
    [-3, -3],
  ];
  return [
    body,
    ...both((s) => {
      const A: P3 = [s * 52, 17, 2],
        B: P3 = [s * 60, 12, 44],
        C: P3 = [s * 61, 10, 56];
      const ax: P3 = [B[0] - A[0], B[1] - A[1], B[2] - A[2]];
      return [
        hull([...ring(A, ax, 16, 14), ...ring(B, ax, 13, 12), ...ring(C, ax, 7, 7)]),
        // stik analog: dudukan, batang, topi
        cyl([s * 22, 26, -2], [s * 22, 30, -2], 9),
        cyl([s * 22, 30, -2], [s * 22, 35, -2], 4),
        cyl([s * 22, 35, -2], [s * 22, 39, -2], 10, 10),
        // L1/R1 dan pelatuk L2/R2
        block([s * 50, 21, -37], 30, 7, 8, 1.5),
        hull([-11, 11].flatMap((dx) => [[s * 50 + dx, 17, -41], [s * 50 + dx, 17, -32], [s * 50 + dx, 3, -47], [s * 50 + dx, 3, -40]] as P3[])),
        // Share / Options
        block([s * 30, 28, -22], 4, 2, 8),
      ];
    }),
    block([0, 28.5, -14], 50, 3, 26, 1),
    prism(
      dpad.map(([u, v]) => [u - 46, v - 14]),
      "xz",
      27,
      30,
    ),
    ...[
      [0, -9],
      [9, 0],
      [0, 9],
      [-9, 0],
    ].map(([dx, dz]) => cyl([46 + dx, 27, -14 + dz], [46 + dx, 30.5, -14 + dz], 4.5)),
    cyl([0, 26, 4], [0, 29, 4], 4),
    block([0, 17, -35], 44, 4, 2),
  ];
}

/* ------------------------------------------------------------------ */
/* Kendaraan                                                           */
/* ------------------------------------------------------------------ */

/** Irisan badan mobil (bidang YZ) dengan pinggir atas dipotong miring. */
const carSec = (x: number, w: number, yb: number, yt: number, c = 10): P3[] => [
  [x, yb, -w / 2],
  [x, yb, w / 2],
  [x, yt - c, w / 2],
  [x, yt, w / 2 - c],
  [x, yt, -w / 2 + c],
  [x, yt - c, -w / 2],
];

const wheel = (x: number, y: number, z0: number, z1: number, r: number, n = 12) => cyl([x, y, z0], [x, y, z1], r, n);

function sportsCar(): Part[] {
  return [
    loft([carSec(0, 120, 18, 62), carSec(20, 124, 14, 68), carSec(110, 128, 14, 66), carSec(230, 126, 14, 52), carSec(285, 116, 16, 40), carSec(300, 100, 20, 32, 8)]),
    hull([
      ...[95, 225].flatMap((x) => [-54, 54].map((z) => [x, 55, z] as P3)),
      ...[125, 195].flatMap((x) => [-40, 40].map((z) => [x, 100, z] as P3)),
    ]),
    ...both((s) => [
      wheel(62, 30, s * 50, s * 74, 30),
      wheel(238, 30, s * 50, s * 74, 30),
      block([25, 76, s * 35], 10, 28, 6),
      block([296, 34, s * 38], 8, 6, 22),
      cyl([2, 26, s * 30], [-8, 26, s * 30], 6),
    ]),
    block([25, 92, 0], 34, 5, 116, 1),
  ];
}

function monsterTruck(): Part[] {
  return [
    block([150, 95, 0], 230, 26, 110, 3),
    hull([
      ...[90, 200].flatMap((x) => [-52, 52].map((z) => [x, 108, z] as P3)),
      ...[112, 185].flatMap((x) => [-46, 46].map((z) => [x, 152, z] as P3)),
    ]),
    block([238, 118, 0], 70, 20, 104, 4),
    block([50, 116, 0], 92, 18, 108, 3),
    block([150, 154, 0], 34, 6, 80, 1),
    ...[60, 245].flatMap((x) => [cyl([x, 52, -44], [x, 52, 44], 8), ...both((s) => [wheel(x, 52, s * 42, s * 90, 52)])]),
  ];
}

function tank(): Part[] {
  const track: [number, number][] = [
    [20, 0],
    [260, 0],
    [285, 15],
    [292, 35],
    [280, 55],
    [10, 55],
    [-2, 35],
    [5, 15],
  ];
  const turret = (y: number, k: number): P3[] =>
    (
      [
        [95, -45],
        [165, -62],
        [210, -40],
        [222, 0],
        [210, 40],
        [165, 62],
        [95, 45],
        [80, 0],
      ] as [number, number][]
    ).map(([x, z]) => [155 + (x - 155) * k, y, z * k]);
  return [
    hull([
      ...[30, 270].flatMap((x) => [-70, 70].map((z) => [x, 22, z] as P3)),
      ...[0, 300].flatMap((x) => [-78, 78].map((z) => [x, 46, z] as P3)),
      ...[20, 265].flatMap((x) => [-78, 78].map((z) => [x, 66, z] as P3)),
    ]),
    prism(track, "xy", 78, 108),
    prism(track, "xy", -108, -78),
    hull([...turret(66, 1), ...turret(102, 0.78)]),
    block([222, 86, 0], 18, 26, 44, 3),
    cyl([228, 86, 0], [350, 86, 0], 8),
    cyl([340, 86, 0], [364, 86, 0], 12),
    cyl([140, 101, 25], [140, 108, 25], 14),
    cyl([180, 101, -30], [180, 110, -30], 5),
  ];
}

function jet(): Part[] {
  const sec = (x: number, w: number, h: number, y = 60) => ring([x, y, 0], X, w, h);
  return [
    loft([sec(0, 20, 18), sec(40, 26, 24), sec(150, 28, 30), sec(240, 24, 28, 62), sec(300, 14, 16, 62), [[340, 60, 0]]]),
    cyl([0, 60, 0], [-24, 60, 0], 18, 8, 15),
    hull([
      [205, 80, -10],
      [205, 80, 10],
      [292, 76, -5],
      [292, 76, 5],
      [235, 99, -8],
      [235, 99, 8],
      [265, 92, -6],
      [265, 92, 6],
    ]),
    ...both((s) => [
      hull([
        [110, 56, s * 22],
        [250, 57, s * 22],
        [110, 63, s * 22],
        [240, 62, s * 22],
        [60, 57, s * 175],
        [110, 57, s * 175],
        [60, 59, s * 175],
        [110, 59, s * 175],
      ]),
      hull([
        [0, 58, s * 18],
        [50, 58, s * 18],
        [0, 62, s * 18],
        [45, 62, s * 18],
        [-15, 59, s * 75],
        [15, 59, s * 75],
        [-15, 61, s * 75],
        [15, 61, s * 75],
      ]),
      hull([
        [5, 74, s * 12],
        [70, 74, s * 12],
        [5, 74, s * 16],
        [70, 74, s * 16],
        [-15, 140, s * 22],
        [20, 140, s * 22],
        [-15, 140, s * 25],
        [20, 140, s * 25],
      ]),
      block([200, 50, s * 30], 60, 22, 18, 3),
    ]),
    cyl([150, 0, 0], [150, 8, 0], 60, 10),
    cyl([150, 8, 0], [150, 34, 0], 6),
  ];
}

function helicopter(): Part[] {
  const sec = (x: number, w: number, h: number, y: number) => ring([x, y, 0], X, w, h);
  return [
    loft([[[300, 72, 0]], sec(285, 22, 24, 73), sec(260, 42, 44, 75), sec(200, 52, 52, 76), sec(130, 48, 48, 78), sec(96, 24, 24, 92)]),
    loft([sec(105, 14, 14, 94), sec(-20, 8, 8, 100)]),
    hull([
      [-30, 98, -2],
      [-30, 98, 2],
      [5, 100, -2],
      [5, 100, 2],
      [-45, 150, -2],
      [-45, 150, 2],
      [-25, 150, -2],
      [-25, 150, 2],
    ]),
    block([-36, 140, 6], 5, 60, 3),
    cyl([-36, 140, 2], [-36, 140, 9], 5),
    cyl([180, 124, 0], [180, 140, 0], 7),
    block([180, 142, 0], 20, 6, 20, 2),
    block([180, 146, 0], 380, 3, 22),
    block([180, 149.5, 0], 22, 3, 380),
    ...both((s) => [block([175, 10, s * 42], 230, 6, 8, 2), beam([135, 12, s * 42], [145, 34, s * 26], 7, 7), beam([215, 12, s * 42], [225, 32, s * 26], 7, 7)]),
  ];
}

function rocket(): Part[] {
  const sec = (y: number, r: number) => ring([0, y, 0], Y, r, r, 10);
  const fins = [0, 90, 180, 270].map((deg) => {
    const t = (deg * Math.PI) / 180;
    const d: P3 = [Math.cos(t), 0, Math.sin(t)];
    const tg: P3 = [-Math.sin(t), 0, Math.cos(t)];
    const at = (r: number, y: number, w: number): P3 => [d[0] * r + tg[0] * w, y, d[2] * r + tg[2] * w];
    return hull([-1.5, 1.5].flatMap((w) => [at(36, 150, w), at(36, 60, w), at(95, 60, w), at(95, 10, w)]));
  });
  return [
    loft([sec(40, 34), sec(60, 40), sec(230, 40), sec(290, 34), sec(330, 22), sec(355, 10), [[0, 372, 0]]]),
    cyl([0, 40, 0], [0, 10, 0], 24, 10, 32),
    ...fins,
    cyl([0, 250, -38], [0, 250, -44], 11, 10),
    cyl([0, 200, -38], [0, 200, -43], 8, 10),
  ];
}

function excavator(): Part[] {
  const track: [number, number][] = [
    [10, 0],
    [200, 0],
    [222, 14],
    [226, 32],
    [214, 48],
    [-4, 48],
    [-16, 32],
    [-12, 14],
  ];
  return [
    prism(track, "xy", 30, 80),
    prism(track, "xy", -80, -30),
    block([105, 40, 0], 150, 24, 60, 3),
    cyl([110, 52, 0], [110, 63, 0], 50, 10),
    block([95, 92, 0], 170, 58, 140, 5),
    block([5, 94, 0], 30, 54, 136, 8),
    hull([
      [120, 121, 10],
      [185, 121, 10],
      [120, 121, 70],
      [185, 121, 70],
      [130, 200, 14],
      [172, 200, 14],
      [130, 200, 66],
      [172, 200, 66],
    ]),
    beam([165, 118, -20], [290, 250, -20], 26, 30),
    beam([290, 250, -20], [370, 125, -20], 20, 22),
    cyl([150, 112, -42], [250, 210, -42], 6),
    hull(
      [-45, 5].flatMap((z) => [
        [355, 128, z],
        [388, 128, z],
        [398, 80, z],
        [366, 66, z],
        [348, 96, z],
      ]) as P3[],
    ),
  ];
}

function locomotive(): Part[] {
  return [
    block([200, 40, 0], 380, 16, 90, 2),
    ...both((s) => [...[140, 215, 290].map((x) => wheel(x, 36, s * 46, s * 62, 34)), wheel(360, 22, s * 40, s * 54, 20, 10), cyl([392, 60, s * 30], [404, 60, s * 30], 6)]),
    cyl([110, 90, 0], [350, 90, 0], 42, 12),
    cyl([350, 90, 0], [385, 90, 0], 46, 12),
    cyl([385, 90, 0], [391, 90, 0], 34, 12),
    loft([ring([360, 128, 0], Y, 14, 14, 10), ring([360, 175, 0], Y, 12, 12, 10), ring([360, 186, 0], Y, 20, 20, 10)]),
    cyl([250, 124, 0], [250, 145, 0], 18, 10, 14),
    cyl([250, 145, 0], [250, 152, 0], 14, 10, 6),
    block([70, 120, 0], 90, 142, 100),
    block([70, 196, 0], 106, 10, 114, 3),
    hull([
      [392, 48, -45],
      [392, 48, 45],
      [392, 16, -45],
      [392, 16, 45],
      [432, 16, 0],
      [420, 34, 0],
    ]),
  ];
}

function pirateShip(): Part[] {
  const sec = (x: number, hw: number, deck: number, keel: number): P3[] => {
    const mid = keel + (deck - keel) * 0.35;
    return [
      [x, deck, -hw],
      [x, mid, -hw * 0.75],
      [x, keel, 0],
      [x, mid, hw * 0.75],
      [x, deck, hw],
    ];
  };
  const sail = (x: number, hw: number, y0: number, y1: number): Part =>
    hull([
      ...[-hw, hw].flatMap((z) => [y0, y1].flatMap((y) => [[x, y, z] as P3, [x - 3, y, z] as P3])),
      [x + 14, (y0 + y1) / 2, 0],
      [x + 9, (y0 + y1) / 2, hw * 0.6],
      [x + 9, (y0 + y1) / 2, -hw * 0.6],
    ]);
  return [
    loft([sec(0, 50, 110, 30), sec(40, 62, 104, 18), sec(160, 66, 96, 10), sec(290, 56, 98, 14), sec(360, 30, 106, 30), sec(395, 4, 112, 70)]),
    block([30, 125, 0], 60, 30, 108, 3),
    cyl([150, 96, 0], [150, 300, 0], 5),
    cyl([260, 96, 0], [260, 270, 0], 5),
    sail(156, 75, 150, 280),
    sail(266, 60, 150, 250),
    beam([156, 284, -85], [156, 284, 85], 6, 6),
    beam([266, 254, -70], [266, 254, 70], 6, 6),
    block([150, 312, 14], 2, 18, 26),
    cyl([370, 108, 0], [445, 150, 0], 5),
    ...both((s) => [80, 130, 200].map((x) => cyl([x, 86, s * 60], [x, 86, s * 76], 5))),
  ];
}

/* ------------------------------------------------------------------ */
/* Figur & senjata                                                     */
/* ------------------------------------------------------------------ */

function robot(): Part[] {
  return [
    ...both((s) => [
      block([s * 28, 8, 6], 34, 16, 52, 3),
      block([s * 28, 50, 0], 26, 68, 28, 3),
      block([s * 28, 88, 2], 30, 14, 32, 4),
      block([s * 28, 120, 0], 28, 50, 30, 3),
      block([s * 72, 232, 0], 30, 26, 38, 6),
      block([s * 74, 196, 0], 22, 48, 24, 3),
      block([s * 74, 146, 4], 26, 52, 28, 3),
      block([s * 74, 110, 4], 22, 22, 22, 4),
    ]),
    block([0, 152, 0], 80, 22, 40, 4),
    hull([
      ...[-40, 40].flatMap((x) => [-22, 22].map((z) => [x, 162, z] as P3)),
      ...[-58, 58].flatMap((x) => [-30, 30].map((z) => [x, 240, z] as P3)),
    ]),
    block([0, 215, 30], 60, 34, 6, 2),
    cyl([0, 239, 0], [0, 251, 0], 12),
    block([0, 275, 0], 52, 50, 48, 6),
    block([0, 280, 25], 40, 12, 4, 1),
    cyl([0, 299, 0], [0, 320, 0], 3, 6),
    block([0, 323, 0], 9, 9, 9, 2),
  ];
}

function trex(): Part[] {
  const sec = (x: number, w: number, h: number, y: number) => ring([x, y, 0], X, w, h);
  return [
    loft([[[-220, 150, 0]], sec(-170, 10, 12, 148), sec(-100, 22, 26, 140), sec(-30, 38, 48, 132), sec(40, 44, 56, 136), sec(95, 34, 44, 160), sec(130, 24, 30, 190)]),
    hull([
      ...([
        [126, 168],
        [126, 228],
        [200, 218],
        [252, 202],
        [252, 180],
        [235, 170],
      ] as [number, number][]).flatMap(([x, y]) => {
        const w = x < 200 ? 24 : 15;
        return [[x, y, -w] as P3, [x, y, w] as P3];
      }),
    ]),
    ...both((s) => [
      hull([...ring([20, 140, s * 40], Y, 28, 26), ...ring([30, 92, s * 42], Y, 16, 16)]),
      cyl([30, 95, s * 42], [12, 16, s * 44], 12, 8, 9),
      block([30, 7, s * 44], 66, 14, 30, 4),
      beam([108, 152, s * 26], [128, 130, s * 30], 9, 9),
      beam([128, 130, s * 30], [142, 140, s * 30], 7, 7),
    ]),
  ];
}

function sword(): Part[] {
  const blade = (y: number, w: number, t: number): P3[] => [
    [-w / 2, y, 0],
    [0, y, -t / 2],
    [w / 2, y, 0],
    [0, y, t / 2],
  ];
  const r = (y: number, rad: number) => ring([0, y, 0], Y, rad, rad, 8);
  return [
    loft([blade(70, 44, 9), blade(380, 36, 8), blade(440, 24, 6), [[0, 492, 0]]]),
    block([0, 64, 0], 140, 14, 22, 4),
    ...both((s) => [block([s * 74, 64, 0], 16, 24, 26, 5)]),
    loft([r(-60, 13), r(0, 14), r(57, 12)]),
    hull([...r(-64, 10), ...r(-80, 18), ...r(-96, 10)]),
  ];
}

/* ================================================================== */

export const MAINAN3D: Template[] = [
  solid3d(
    { id: "controller-ps4", title: "Controller PS4 3D", category: "replika", description: "Replika DualShock 4 penuh 3D: grip melengkung, touchpad, dua stik analog, D-pad, empat tombol, L1/R1, dan pelatuk L2/R2.", difficulty: "sulit", minutes: 120, age: 12, tags: ["playstation", "game", "replika", "konsol"], featured: true },
    240,
    "Lebar",
    controller,
  ),
  solid3d({ id: "mobil-sport-3d", title: "Mobil Sport 3D", category: "kendaraan", description: "Mobil balap berbadan lonjong dengan kabin miring, empat roda silinder, knalpot, dan sayap belakang.", difficulty: "sulit", minutes: 90, age: 10, tags: ["mobil", "balap", "kendaraan"] }, 300, "Panjang", sportsCar),
  solid3d({ id: "truk-monster-3d", title: "Truk Monster 3D", category: "kendaraan", description: "Truk bak berroda raksasa lengkap dengan as roda, kap mesin, dan lampu sorot di atap.", difficulty: "sedang", minutes: 75, age: 9, tags: ["truk", "monster truck", "kendaraan"] }, 300, "Panjang", monsterTruck),
  solid3d({ id: "tank-3d", title: "Tank Tempur 3D", category: "kendaraan", description: "Tank berlapis baja miring dengan rantai, kubah segi delapan, meriam panjang, dan palka.", difficulty: "sulit", minutes: 90, age: 10, tags: ["tank", "militer", "kendaraan"] }, 340, "Panjang", tank),
  solid3d({ id: "jet-tempur-3d", title: "Jet Tempur 3D", category: "kendaraan", description: "Pesawat jet berbadan bulat dengan kokpit, sayap delta, ekor kembar, saluran udara, dan dudukan pajangan.", difficulty: "sulit", minutes: 100, age: 11, tags: ["pesawat", "jet", "militer"] }, 360, "Panjang", jet),
  solid3d({ id: "helikopter-3d", title: "Helikopter 3D", category: "kendaraan", description: "Helikopter berkabin bulat dengan ekor panjang, baling-baling silang, rotor ekor, dan kaki ski.", difficulty: "sulit", minutes: 90, age: 10, tags: ["helikopter", "penyelamat", "kendaraan"] }, 380, "Panjang", helicopter),
  solid3d({ id: "roket-3d", title: "Roket Antariksa 3D", category: "kendaraan", description: "Roket segi sepuluh berhidung lancip dengan empat sirip, mesin pendorong, dan jendela timbul.", difficulty: "sedang", minutes: 60, age: 8, tags: ["roket", "antariksa", "luar angkasa"] }, 370, "Tinggi", rocket),
  solid3d({ id: "robot-3d", title: "Robot Tempur 3D", category: "figur", description: "Figur robot berdiri dengan dada lebar, kepala bervisor, antena, lutut, bahu, dan tangan kotak.", difficulty: "sedang", minutes: 80, age: 9, tags: ["robot", "figur", "mecha"] }, 330, "Tinggi", robot),
  solid3d({ id: "trex-3d", title: "T-Rex 3D", category: "figur", description: "Dinosaurus T-Rex berbadan bulat dari ekor sampai leher, kepala besar, kaki kekar, dan lengan kecil.", difficulty: "sulit", minutes: 100, age: 10, tags: ["dinosaurus", "t-rex", "hewan purba"] }, 470, "Panjang", trex),
  solid3d({ id: "pedang-3d", title: "Pedang Ksatria 3D", category: "figur", description: "Pedang bermata ganda dengan bilah belah ketupat yang meruncing, pelindung tangan, gagang segi delapan, dan pangkal bulat.", difficulty: "sedang", minutes: 45, age: 8, tags: ["pedang", "ksatria", "senjata"] }, 590, "Panjang", sword),
  solid3d({ id: "kapal-bajak-laut-3d", title: "Kapal Bajak Laut 3D", category: "kendaraan", description: "Lambung kapal melengkung, buritan tinggi, dua tiang dengan layar mengembang, meriam, dan cucur haluan.", difficulty: "sulit", minutes: 110, age: 10, tags: ["kapal", "bajak laut", "laut"] }, 450, "Panjang", pirateShip),
  solid3d({ id: "ekskavator-3d", title: "Ekskavator (Bego) 3D", category: "kendaraan", description: "Alat berat beroda rantai dengan meja putar, kabin, pemberat, lengan boom, piston, dan bucket.", difficulty: "sulit", minutes: 100, age: 9, tags: ["bego", "alat berat", "konstruksi"] }, 420, "Panjang", excavator),
  solid3d({ id: "kereta-uap-3d", title: "Kereta Uap 3D", category: "kendaraan", description: "Lokomotif dengan ketel silinder, cerobong melebar, kubah uap, kabin masinis, delapan roda, dan bajak depan.", difficulty: "sulit", minutes: 100, age: 9, tags: ["kereta", "lokomotif", "kendaraan"] }, 440, "Panjang", locomotive),
];

