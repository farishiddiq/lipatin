import { IcosahedronGeometry } from "three";
import { addWheels, buildBox, buildProfile, buildTower, NetBuilder } from "./geometry/builder";
import { bbox, centroid, rectPoints, regularPolygon, stadiumPoints } from "./geometry/polygon";
import type { Panel, Vec2 } from "./geometry/types";
import { meshFromGeometry, unfoldMesh } from "./geometry/unfold";
import { addPieces, circ, extrude, FLAT, flipY, layout, mm, num, pose, type Rot, shift, STAND, STAND_Z, tabP, tpl } from "./templates-tematik";
import type { Template } from "./templates";

/*
 * Dua kategori: "Main peran" (mainan anak) dan "Hobi bapak" (koleksi & hobi),
 * masing-masing 9 template.
 */

/* ------------------------------------------------------------------ */
/* Pembantu                                                            */
/* ------------------------------------------------------------------ */

type V3 = [number, number, number];
const crossV = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
/** Rotasi dari arah dunia sumbu x pola (u) dan sumbu y pola (v). */
const frame = (u: V3, v: V3): Rot => [u, crossV(v, u), v];
/** Tegak di bidang ZY, x pola turun (−Y), y pola → Z. */
const DOWN_Z = frame([0, -1, 0], [0, 0, 1]);

/** Geser pose akar agar tetap benar setelah polanya dipindah sejauh o, lalu pindahkan di dunia sejauh d. */
function movePose(m: number[], o: Vec2, d: V3 = [0, 0, 0]) {
  const r = [...m];
  for (let i = 0; i < 3; i++) r[12 + i] = m[12 + i] - (m[i] * o[0] + m[8 + i] * o[1]) + d[i];
  return r;
}

interface Part {
  net: { panels: Panel[] };
  prefix: string;
  label: string;
  /** Pose akhir akar; `orig` = panel akar sebelum digeser, `o` = pergeseran pola. */
  pose: (orig: Panel, o: Vec2) => number[];
}

/** Tempel bangun lain (kotak, rantai lipat, hasil bongkar) di bawah pola utama sebagai bagian terpisah. */
function assemble(panels: Panel[], parts: Part[]) {
  const b = panels.length ? bbox(panels.flatMap((p) => p.points)) : { minX: 0, maxX: 0, maxY: -16 };
  const boxes = parts.map((pt) => {
    const q = bbox(pt.net.panels.flatMap((p) => p.points));
    return rectPoints(q.minX, q.minY, q.maxX - q.minX, q.maxY - q.minY);
  });
  const area = boxes.reduce((s, r) => s + (r[1][0] - r[0][0] + 10) * (r[2][1] - r[0][1] + 10), 0);
  const widest = Math.max(...boxes.map((r) => r[1][0] - r[0][0]));
  const offs = layout(boxes, b.maxY + 16, Math.max(widest, b.maxX - b.minX, Math.sqrt(area) * 1.15));
  parts.forEach((pt, i) => {
    const o: Vec2 = [offs[i][0] + b.minX, offs[i][1]];
    for (const p of pt.net.panels) {
      panels.push({
        ...p,
        id: pt.prefix + p.id,
        parent: p.parent && pt.prefix + p.parent,
        label: p.label ? `${pt.label} · ${p.label}` : pt.label,
        points: shift(p.points, o),
        holes: p.holes?.map((h) => shift(h, o)),
        hinge: p.hinge && [shift([p.hinge[0]], o)[0], shift([p.hinge[1]], o)[0]],
        rootPose: p.parent ? undefined : pt.pose(p, o),
      });
    }
  });
}

/** Pose akar mendatar: titik pola `at` (sebelum digeser) jatuh di titik dunia W. */
const flatAt = (at: Vec2, W: V3) => (_: Panel, o: Vec2) => pose(FLAT, [at[0] + o[0], at[1] + o[1]], W);
const cent = (p: Panel) => centroid(p.points);

/** Papan bercelah (sambungan silang tanpa lem): celah selebar `slot` sedalam setengah tinggi dari tepi atas/bawah. */
function comb(len: number, h: number, cuts: number[], slot: number, side: "top" | "bottom"): Vec2[] {
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

/** Busur titik (derajat), sumbu y ke atas. */
const arc = (cx: number, cy: number, r: number, a0: number, a1: number, n = 8) =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as Vec2;
  });

const scaleP = (pts: Vec2[], k: number) => pts.map(([x, y]) => [x * k, y * k] as Vec2);

/** Siluet simetris (setengah kanan dari alas ke puncak, y ke atas) → pasangan silang A (celah bawah) & B (celah atas). */
function crossPair(half: Vec2[], t: number): [Vec2[], Vec2[]] {
  const H = Math.max(...half.map((p) => p[1]));
  const hs = H / 2;
  const mirror = (pts: Vec2[]) => pts.map(([x, y]) => [-x, y] as Vec2).reverse();
  const body = half.filter((p) => p[0] > 1e-6);
  const A: Vec2[] = [[-t / 2, 0], [-t / 2, hs], [t / 2, hs], [t / 2, 0], ...half, ...mirror(body)];
  const keep = half.filter((p) => p[0] >= t / 2 + 0.3);
  const top = keep[keep.length - 1][1];
  const B: Vec2[] = [...keep, [t / 2, top], [t / 2, hs], [-t / 2, hs], [-t / 2, top], ...mirror(keep)];
  return [A, B];
}

/* ================================================================== */
/* 1. Main peran                                                       */
/* ================================================================== */

const KASIR: Vec2[] = [
  [0, 0],
  [220, 0],
  [220, 170],
  [150, 170],
  [150, 110],
  [0, 70],
];

const SELAM: Vec2[] = [
  [40, 0],
  [340, 0],
  [385, 20],
  [400, 45],
  [385, 70],
  [340, 90],
  [230, 90],
  [220, 145],
  [140, 145],
  [130, 90],
  [60, 90],
  [20, 75],
  [0, 45],
  [20, 15],
];

/** Tirai bergelombang (scallop) untuk atap gerobak. */
function scallop(len: number, h0: number) {
  const n = Math.max(3, Math.round(len / 40));
  const rr = len / n / 2;
  const pts: Vec2[] = [
    [0, 0],
    [len, 0],
    [len, h0],
  ];
  for (let i = n; i >= 1; i--) {
    const xc = (i - 0.5) * (len / n);
    for (let j = 1; j <= 6; j++) {
      const a = (j / 6) * Math.PI;
      pts.push([xc + rr * Math.cos(a), h0 + rr * 0.6 * Math.sin(a)]);
    }
  }
  return pts;
}

const GUNUNGAN: Vec2[] = (() => {
  const right: Vec2[] = [
    [0, 1],
    [0.18, 0.86],
    [0.34, 0.68],
    [0.46, 0.47],
    [0.5, 0.28],
    [0.45, 0.12],
    [0.32, 0.03],
    [0.04, 0],
    [0.04, -0.55],
  ];
  const left = right
    .slice(1)
    .map(([x, y]) => [-x, y] as Vec2)
    .reverse();
  return [...right, ...left];
})();

const MAINPERAN: Template[] = [
  tpl(
    { id: "mesin-kasir", title: "Mesin Kasir Mainan", category: "mainperan", description: "Kasir dengan layar, papan tombol, celah koin, dan laci uang yang bisa ditarik keluar.", difficulty: "sedang", minutes: 35, age: 6, tags: ["kasir", "jualan", "main peran"], featured: true },
    [mm("L", "Panjang", 220, 150, 360), mm("W", "Lebar", 260, 160, 420), tabP(12)],
    (p, c) => {
      const k = num(p, "L") / 220;
      const W = num(p, "W");
      const keyLen = Math.hypot(150, 40) * k;
      const keys: Vec2[][] = [];
      for (const fu of [0.25, 0.5, 0.75]) for (const fv of [0.2, 0.4, 0.6, 0.8]) keys.push(circ(keyLen * fu, W * fv, 9 * k, 16));
      const net = buildProfile({
        profile: scaleP(KASIR, k),
        depth: W,
        tab: num(p, "tab"),
        root: "strip",
        stripHoles: {
          2: [stadiumPoints([35 * k, W / 2], 8, Math.min(60, W * 0.3))],
          3: [rectPoints(10 * k, W * 0.15, 36 * k, W * 0.7)],
          4: keys,
          5: [rectPoints(22 * k, W * 0.12, 42 * k, W * 0.76)],
        },
        labels: { A: "Sisi kiri", B: "Sisi kanan", strip: (i) => ["Alas", "Punggung", "Atas (celah koin)", "Layar", "Papan tombol", "Muka laci"][i] },
      }).build(true);
      const dw = W * 0.76 - 4;
      const dh = 40 * k - 4;
      const drawer = buildBox({ W: 130 * k, D: dw, H: dh, tab: num(p, "tab"), lid: "open", t: c.t, compensate: c.compensate, holes: { left: [circ(dw / 2, dh * 0.55, 9, 16)] }, labels: { left: "Muka laci (lubang jari)" } });
      assemble(net.panels, [{ net: drawer, prefix: "laci-", label: "Laci", pose: flatAt([0, 0], [-12, 7 * k, W * 0.12 + 2]) }]);
      return net;
    },
  ),
  tpl(
    { id: "kompor-oven", title: "Kompor & Oven Mini", category: "mainperan", description: "Dapur-dapuran dengan empat tungku, kenop putar, dan pintu oven berjendela.", difficulty: "sedang", minutes: 35, age: 5, tags: ["dapur", "masak", "main peran"] },
    [mm("W", "Lebar", 320, 200, 500), mm("D", "Kedalaman", 260, 160, 400), mm("H", "Tinggi", 300, 180, 500), tabP(15)],
    (p, c) => {
      const W = num(p, "W"),
        D = num(p, "D"),
        H = num(p, "H");
      const net = buildBox({
        W,
        D,
        H,
        tab: num(p, "tab"),
        lid: "glued",
        t: c.t,
        compensate: c.compensate,
        holes: { front: [rectPoints(W * 0.14, 30, W * 0.72, H * 0.42)] },
        labels: { front: "Depan (lubang oven)", lid: "Atas kompor" },
      }).build(true);
      const zf = D + 2 * c.t + 1;
      const doorTop = 30 + H * 0.46;
      addPieces(net.panels, [
        {
          poly: rectPoints(0, 0, W * 0.78, H * 0.5),
          holes: [stadiumPoints([W * 0.39, H * 0.05], W * 0.4, 10), rectPoints(W * 0.14, H * 0.13, W * 0.5, H * 0.26)],
          label: "Pintu oven",
          pose: (o) => pose(STAND, o, [W * 0.11, doorTop, zf]),
        },
        ...[0.2, 0.4, 0.6, 0.8].map((f, i) => ({ poly: circ(0, 0, 15, 20), holes: [circ(0, -8, 3, 10)], label: `Kenop ${i + 1}`, pose: (o: Vec2) => pose(STAND, o, [W * f, (doorTop + H) / 2, zf]) })),
        ...[
          [0.28, 0.3],
          [0.72, 0.3],
          [0.28, 0.7],
          [0.72, 0.7],
        ].map(([fx, fz], i) => ({ poly: circ(0, 0, Math.min(W, D) * 0.13, 28), holes: [circ(0, 0, Math.min(W, D) * 0.07, 20)], label: `Tungku ${i + 1}`, pose: (o: Vec2) => pose(FLAT, o, [W * fx, H + 2 * c.t + 1, D * fz]) })),
      ]);
      return net;
    },
  ),
  tpl(
    { id: "garasi-parkir", title: "Garasi Parkir Bertingkat", category: "mainperan", description: "Gedung parkir dengan jalan menanjak bergantian kiri-kanan. Pas untuk mobil diecast 1:64.", difficulty: "sulit", minutes: 50, age: 7, tags: ["mobil", "hot wheels", "parkir"], featured: true },
    [mm("W", "Lebar lantai", 300, 200, 500), mm("D", "Kedalaman", 220, 150, 360), mm("h", "Tinggi per lantai", 85, 60, 140), { key: "n", label: "Jumlah lantai atas", kind: "count", min: 1, max: 4, step: 1, default: 3 }],
    (p, c) => {
      const W = num(p, "W"),
        D = num(p, "D"),
        h = num(p, "h"),
        n = num(p, "n");
      const rw = 80;
      const t = Math.max(1, c.t);
      const len = Math.hypot(D, h);
      const s = h / len,
        co = D / len;
      const panels: Panel[] = [];
      addPieces(panels, [
        { poly: rectPoints(0, 0, W + 2 * rw, D), label: "Lantai dasar", pose: (o) => pose(FLAT, o, [-rw, 0, 0]) },
        ...Array.from({ length: n }, (_, i) => ({ poly: rectPoints(0, 0, W, D), label: `Lantai ${i + 1}`, pose: (o: Vec2) => pose(FLAT, o, [0, (i + 1) * h, 0]) })),
        {
          // tinggi sampai pagar lantai teratas; satu jendela memanjang per lantai
          poly: rectPoints(0, 0, W, n * h + 30),
          holes: Array.from({ length: n }, (_, i) => rectPoints(W * 0.12, n * h + 30 - (i * h + h * 0.65), W * 0.76, h * 0.3)),
          label: "Dinding belakang",
          pose: (o) => pose(STAND, o, [0, n * h + 30, 0]),
        },
        { poly: rectPoints(0, 0, D * 0.45, n * h - t), label: "Dinding tengah", pose: (o) => pose(STAND_Z, o, [W / 2, n * h - t, 0]) },
        ...[10, W - 10].map((x, i) => ({ poly: rectPoints(0, 0, 22, n * h - t), label: `Tiang depan ${i + 1}`, pose: (o: Vec2) => pose(STAND_Z, o, [x, n * h - t, D - 26]) })),
        ...Array.from({ length: n }, (_, i) => ({
          poly: rectPoints(0, 0, len, rw),
          label: `Jalan naik ${i + 1}`,
          pose: (o: Vec2) => (i % 2 === 0 ? pose(frame([0, s, -co], [1, 0, 0]), o, [W, i * h, D]) : pose(frame([0, s, co], [-1, 0, 0]), o, [0, i * h, 0])),
        })),
      ]);
      return { panels, closed: false, stacked: true };
    },
  ),
  tpl(
    { id: "mesin-capit", title: "Mesin Capit Hadiah", category: "mainperan", description: "Kotak berjendela dengan capit gantung, lantai hadiah berlubang, tuas, tombol, dan celah koin.", difficulty: "sulit", minutes: 40, age: 7, tags: ["capit", "arkade", "hadiah"] },
    [mm("W", "Lebar", 220, 160, 360), mm("H", "Tinggi", 380, 260, 600), tabP(14)],
    (p, c) => {
      const W = num(p, "W"),
        D = W,
        H = num(p, "H");
      const win = (len: number) => rectPoints(len * 0.1, H * 0.45, len * 0.8, H * 0.47);
      const net = buildBox({
        W,
        D,
        H,
        tab: num(p, "tab"),
        lid: "glued",
        t: c.t,
        compensate: c.compensate,
        holes: {
          front: [win(W), rectPoints(W * 0.32, 22, W * 0.36, H * 0.17), circ(W * 0.28, H * 0.33, 7, 16), circ(W * 0.72, H * 0.33, 11, 20)],
          left: [win(D)],
          right: [win(D), stadiumPoints([D / 2, H * 0.3], 8, 36)],
        },
        labels: { front: "Depan (jendela & pintu hadiah)", right: "Kanan (celah koin)" },
      }).build(true);
      const w = W * 0.36;
      const L = H * 0.25;
      const claw: Vec2[] = [
        [-4, 0],
        [4, 0],
        [4, L],
        [24, L + 10],
        [28, L + 40],
        [20, L + 42],
        [16, L + 20],
        [4, L + 16],
        [4, L + 38],
        [-4, L + 38],
        [-4, L + 16],
        [-16, L + 20],
        [-20, L + 42],
        [-28, L + 40],
        [-24, L + 10],
        [-4, L],
      ];
      addPieces(net.panels, [
        { poly: rectPoints(0, 0, W - 2, D - 2), holes: [rectPoints((W - 2) / 2 - w / 2, D - 8 - w, w, w)], label: "Lantai hadiah", pose: (o) => pose(FLAT, o, [1, H * 0.4, 1]) },
        { poly: claw, label: "Capit gantung", pose: (o) => pose(STAND, o, [W / 2, H - 2, D / 2]) },
      ]);
      return net;
    },
  ),
  tpl(
    { id: "panggung-wayang", title: "Panggung Wayang", category: "mainperan", description: "Panggung lipat bermahkota dengan layar lengkung dan dua sayap penyangga, plus dua gunungan.", difficulty: "mudah", minutes: 25, age: 6, tags: ["wayang", "boneka", "pertunjukan"] },
    [mm("W", "Lebar", 420, 280, 700), mm("H", "Tinggi", 480, 320, 800), mm("wing", "Lebar sayap", 160, 80, 300)],
    (p) => {
      const W = num(p, "W"),
        H = num(p, "H");
      const nb = new NetBuilder();
      const x0 = W * 0.15,
        x1 = W * 0.85;
      const r = (x1 - x0) / 2;
      const yb = H * 0.62;
      const ys = Math.max(r + 20, yb - H * 0.2);
      const window: Vec2[] = [[x0, yb], [x1, yb], ...arc(W / 2, -ys, r, 0, 180, 16).map(([x, y]) => [x, -y] as Vec2)];
      nb.add({
        id: "panel",
        label: "Panel depan",
        kind: "face",
        points: [
          [0, 0],
          [W * 0.15, -25],
          [W * 0.35, -40],
          [W * 0.5, -90],
          [W * 0.65, -40],
          [W * 0.85, -25],
          [W, 0],
          [W, H],
          [0, H],
        ],
        holes: [window],
        rootPose: pose(STAND, [0, H], [0, 0, 0]),
      });
      nb.attachEdge("panel", 6, (L) => rectPoints(0, 0, L, num(p, "wing")), { id: "wingR", label: "Sayap kanan", angle: -70 });
      nb.attachEdge("panel", 8, (L) => rectPoints(0, 0, L, num(p, "wing")), { id: "wingL", label: "Sayap kiri", angle: -70 });
      const net = nb.build(false);
      const g = Math.min(W * 0.36, H * 0.32);
      addPieces(
        net.panels,
        [0.32, 0.68].map((f, i) => ({ poly: flipY(scaleP(GUNUNGAN, g)), label: `Gunungan ${i + 1}`, pose: (o: Vec2) => pose(STAND, o, [W * f, H - yb + 12, -40]) })),
      );
      return net;
    },
  ),
  extrude(
    { id: "kapal-selam", title: "Kapal Selam", category: "mainperan", description: "Kapal selam berjendela bulat dengan menara, periskop, dan baling-baling belakang.", difficulty: "sedang", minutes: 30, age: 7, tags: ["kapal", "laut", "kendaraan"] },
    {
      pts: SELAM,
      sizeLabel: "Panjang",
      depth: 90,
      depthLabel: "Lebar badan",
      tab: 10,
      holesA: (k) => [...[90, 150, 270, 330].map((x) => circ(x * k, 50 * k, 11 * k, 18)), circ(180 * k, 118 * k, 9 * k, 16)],
      labels: { A: "Sisi kiri", B: "Sisi kanan", strip: (i) => (i === 0 ? "Lunas" : `Badan ${i + 1}`) },
      extra: (panels, k, depth) =>
        addPieces(panels, [
          {
            poly: scaleP(
              [
                [0, 0],
                [34, 0],
                [34, 10],
                [10, 10],
                [10, 50],
                [0, 50],
              ],
              k,
            ),
            label: "Periskop",
            pose: (o) => pose(STAND, o, [135 * k, 195 * k, depth / 2]),
          },
          {
            poly: scaleP(
              [
                [-6, -28],
                [6, -28],
                [6, -6],
                [28, -6],
                [28, 6],
                [6, 6],
                [6, 28],
                [-6, 28],
                [-6, 6],
                [-28, 6],
                [-28, -6],
                [-6, -6],
              ],
              k,
            ),
            label: "Baling-baling",
            pose: (o) => pose(STAND_Z, o, [360 * k + 2, 45 * k, depth / 2]),
          },
        ]),
    },
  ),
  tpl(
    { id: "set-bowling", title: "Set Bowling", category: "mainperan", description: "Sepuluh pin segi enam, bola, dan papan penyusun segitiga untuk main bowling di lantai.", difficulty: "sedang", minutes: 45, age: 6, tags: ["bowling", "olahraga", "permainan"] },
    [mm("s", "Lebar sisi pin", 16, 10, 30), mm("H", "Tinggi pin", 110, 70, 200), tabP(8)],
    (p, c) => {
      const s = num(p, "s"),
        H = num(p, "H"),
        tab = num(p, "tab");
      const t = Math.max(0.6, c.t);
      const sp = 3 * s;
      const spots: [number, number][] = [];
      for (let r = 0; r < 4; r++) for (let j = 0; j <= r; j++) spots.push([(j - r / 2) * sp, 60 + r * sp * 0.866]);
      const margin = 2 * s + 10;
      const back = 60 + 3 * sp * 0.866 + margin;
      const half = 1.5 * sp + margin * 1.4;
      const panels: Panel[] = [];
      addPieces(panels, [
        {
          poly: [
            [0, 60 - margin * 1.4],
            [half, back],
            [-half, back],
          ],
          holes: spots.map(([x, z]) => circ(x, z, 3, 12)),
          label: "Papan penyusun",
          // koordinat lokal papan = koordinat dunia (x, z)
          pose: (o) => pose(FLAT, o, [0, 0, 0]),
        },
      ]);
      const pin = buildTower({ n: 6, s, H, roof: H * 0.22, tab });
      const ballR = s * 2.6;
      const ball = unfoldMesh(meshFromGeometry(new IcosahedronGeometry(ballR, 1)), { tabs: tab > 0, tabWidth: tab, keepPose: true }).net;
      assemble(panels, [
        ...spots.map(([x, z], i) => ({ net: pin, prefix: `pin${i}-`, label: `Pin ${i + 1}`, pose: (orig: Panel, o: Vec2) => pose(FLAT, [cent(orig)[0] + o[0], cent(orig)[1] + o[1]], [x, t + 0.5, z]) })),
        { net: ball, prefix: "bola-", label: "Bola", pose: (orig: Panel, o: Vec2) => movePose(orig.rootPose!, o, [0, ballR, -20]) },
      ]);
      return { panels, closed: false };
    },
  ),
  tpl(
    { id: "gerobak-es-krim", title: "Gerobak Es Krim", category: "mainperan", description: "Gerobak beroda dengan atap bertirai, etalase depan, tiga lubang wadah, dan pegangan dorong.", difficulty: "sedang", minutes: 40, age: 6, tags: ["gerobak", "jualan", "es krim", "bakso"] },
    [mm("W", "Panjang", 260, 180, 420), mm("D", "Lebar", 150, 100, 260), mm("H", "Tinggi badan", 150, 100, 260), tabP(14)],
    (p, c) => {
      const W = num(p, "W"),
        D = num(p, "D"),
        H = num(p, "H");
      const cw = c.compensate ? c.t : 0;
      const rr = Math.min(D * 0.2, W * 0.1);
      const nb = buildBox({
        W,
        D,
        H,
        tab: num(p, "tab"),
        lid: "glued",
        t: c.t,
        compensate: c.compensate,
        holes: { front: [rectPoints(W * 0.15, H * 0.35, W * 0.7, H * 0.4)], lid: [0.25, 0.5, 0.75].map((f) => circ(W * f + cw, (D + cw) / 2, rr, 24)) },
        labels: { front: "Depan (etalase)", lid: "Atas (lubang wadah)" },
      });
      addWheels(nb, 0, 0, D, c.t, [W * 0.3], Math.min(55, H * 0.4));
      const net = nb.build(true);
      const roofH = 150;
      const roof = new NetBuilder();
      roof.add({ id: "atap", label: "Atap", kind: "face", points: rectPoints(0, 0, W + 40, D + 50) });
      roof.attachEdge("atap", 2, (L) => scallop(L, 18), { id: "tirai-depan", label: "Tirai depan", kind: "flap", angle: -90 });
      roof.attachEdge("atap", 0, (L) => scallop(L, 18), { id: "tirai-belakang", label: "Tirai belakang", kind: "flap", angle: -90 });
      assemble(net.panels, [{ net: roof, prefix: "atap-", label: "Atap", pose: flatAt([0, 0], [-20, H + roofH, -25]) }]);
      const top = H + 2 * c.t + 1;
      addPieces(net.panels, [
        ...[
          [6, 24],
          [W - 18, 24],
          [6, D - 24],
          [W - 18, D - 24],
        ].map(([x, z], i) => ({ poly: rectPoints(0, 0, 12, roofH), label: `Tiang atap ${i + 1}`, pose: (o: Vec2) => pose(STAND, o, [x, H + roofH, z]) })),
        {
          poly: [
            [0, 0],
            [120, 0],
            [120, D],
            [0, D],
            [0, D - 16],
            [104, D - 16],
            [104, 16],
            [0, 16],
          ],
          label: "Pegangan dorong",
          pose: (o) => pose(FLAT, o, [W - 50, top, 0]),
        },
        { poly: rectPoints(0, 0, D - 30, Math.min(55, H * 0.4)), label: "Kaki penyangga", pose: (o) => pose(STAND_Z, o, [W - 25, 0, 15]) },
      ]);
      return net;
    },
  ),
  tpl(
    { id: "ring-basket", title: "Ring Basket Meja", category: "mainperan", description: "Tiang, papan pantul, dan ring di atas baki penampung bola. Main pakai bola kertas.", difficulty: "mudah", minutes: 25, age: 6, tags: ["basket", "olahraga", "permainan"] },
    [mm("H", "Tinggi tiang", 300, 180, 500), mm("B", "Ukuran baki", 220, 160, 360), tabP(12)],
    (p, c) => {
      const H = num(p, "H"),
        B = num(p, "B"),
        tab = num(p, "tab");
      const net = buildBox({ W: B, D: B, H: 40, tab, lid: "open", t: c.t, compensate: c.compensate, labels: { base: "Alas baki" } }).build(false);
      const pole = buildBox({ W: 40, D: 40, H, tab, lid: "glued", t: c.t, compensate: c.compensate });
      const hoop = new NetBuilder();
      hoop.add({ id: "ring", label: "Ring", kind: "face", points: [[0, 0], [90, 0], ...arc(45, 45, 45, 0, 180, 16)], holes: [circ(45, 45, 33, 28)] });
      hoop.attachEdge("ring", 0, (L) => rectPoints(0, 0, L, 40), { id: "flap", label: "Lidah tempel", kind: "flap", angle: 90 });
      assemble(net.panels, [
        { net: pole, prefix: "tiang-", label: "Tiang", pose: flatAt([0, 0], [B / 2 - 20, c.t + 0.5, 8]) },
        { net: hoop, prefix: "ring-", label: "Ring", pose: flatAt([0, 0], [B / 2 - 45, H - 20, 52]) },
      ]);
      addPieces(net.panels, [{ poly: rectPoints(0, 0, 170, 115), label: "Papan pantul", pose: (o) => pose(STAND, o, [B / 2 - 85, H + 40, 50]) }]);
      return net;
    },
  ),
];

/* ================================================================== */
/* 2. Hobi bapak                                                       */
/* ================================================================== */

const BODY_VESPA: Vec2[] = [
  [100, 14],
  [205, 14],
  [215, 22],
  ...arc(250, 25, 30, 157, 23),
  [285, 44],
  [280, 58],
  [262, 66],
  [242, 70],
  [236, 150],
  [248, 196],
  [256, 210],
  [244, 224],
  [212, 224],
  [206, 212],
  [222, 198],
  [212, 160],
  [203, 60],
  [196, 34],
  [186, 30],
  [122, 30],
  [124, 96],
  [130, 118],
  [128, 130],
  [48, 130],
  [38, 122],
  [20, 108],
  [8, 84],
  [5, 62],
  ...arc(60, 25, 30, 170, 10),
  [96, 24],
];
const COWL = arc(66, 84, 1, 0, 360, 24)
  .slice(0, 24)
  .map(([x, y]) => [66 + (x - 66) * 52, 84 + (y - 84) * 36] as Vec2);

const STEPS: Vec2[] = [
  [0, 0],
  [150, 0],
  [150, 120],
  [100, 120],
  [100, 80],
  [50, 80],
  [50, 40],
  [0, 40],
];

const RACK: Vec2[] = [
  [0, 0],
  [90, 0],
  [90, 40],
  [66, 40],
  [63, 20],
  [60, 28],
  [36, 28],
  [33, 8],
  [30, 16],
  [0, 16],
];

const STICK: Vec2[] = (() => {
  const right: Vec2[] = [
    [240, 0],
    [240, 25],
    [140, 25],
    [140, 100],
    [205, 100],
    [205, 140],
    [192, 140],
    [192, 114],
    [140, 114],
    [140, 236],
    [190, 236],
    [196, 226],
    [208, 230],
    [204, 248],
    [186, 262],
  ];
  return [[0, 0], ...right, [120, 266], ...right.slice(1).map(([x, y]) => [240 - x, y] as Vec2).reverse()];
})();

/** Siluet bidak catur (setengah kanan, mm untuk kotak 34 mm). */
const CHESS: Record<string, { name: string; half: Vec2[] }> = {
  P: { name: "Pion", half: [[12, 0], [12, 4], [8, 7], [5, 22], [8, 25], [5, 27], [7, 31], [7, 35], [4, 39], [0, 40]] },
  R: { name: "Benteng", half: [[13, 0], [13, 5], [9, 8], [8, 36], [11, 38], [11, 48], [7, 48], [7, 44], [3, 44], [3, 48], [0, 48]] },
  N: { name: "Kuda", half: [[13, 0], [13, 5], [9, 8], [6, 20], [10, 30], [12, 40], [9, 47], [10, 53], [5, 50], [0, 50]] },
  B: { name: "Gajah", half: [[12, 0], [12, 5], [8, 8], [5, 32], [9, 36], [5, 38], [9, 44], [8, 49], [4, 53], [0, 55]] },
  Q: { name: "Ratu", half: [[13, 0], [13, 5], [9, 8], [5, 40], [10, 43], [6, 46], [11, 56], [7, 58], [5, 55], [3, 60], [0, 62]] },
  K: { name: "Raja", half: [[13, 0], [13, 5], [9, 8], [5, 42], [10, 45], [6, 48], [10, 56], [6, 58], [3, 58], [3, 61], [7, 61], [7, 65], [3, 65], [3, 71], [0, 71]] },
};

const HOBIBAPAK: Template[] = [
  tpl(
    { id: "rak-diecast", title: "Rak Pajang Diecast", category: "hobibapak", description: "Rak dinding bersekat silang untuk koleksi diecast 1:64 atau action figure. Sekat tinggal diselipkan.", difficulty: "sedang", minutes: 35, age: 10, tags: ["koleksi", "diecast", "rak", "tanpa lem"], featured: true },
    [
      mm("W", "Lebar", 380, 200, 700),
      mm("Ht", "Tinggi", 300, 160, 600),
      mm("dep", "Kedalaman", 60, 40, 140),
      { key: "cols", label: "Kolom", kind: "count", min: 2, max: 8, step: 1, default: 4 },
      { key: "rows", label: "Baris", kind: "count", min: 2, max: 8, step: 1, default: 4 },
      tabP(12),
    ],
    (p, c) => {
      const W = num(p, "W"),
        Ht = num(p, "Ht"),
        dep = num(p, "dep"),
        cols = num(p, "cols"),
        rows = num(p, "rows");
      const slot = Math.max(1, c.t);
      const net = buildBox({
        W,
        D: Ht,
        H: dep,
        tab: num(p, "tab"),
        lid: "open",
        t: c.t,
        compensate: c.compensate,
        holes: { base: [circ(W * 0.2, 15, 4, 12), circ(W * 0.8, 15, 4, 12)] },
        labels: { base: "Punggung (lubang paku)", front: "Dasar", back: "Atap", left: "Sisi kiri", right: "Sisi kanan" },
      }).build(false);
      net.panels.find((q) => q.id === "base")!.rootPose = pose(STAND, [0, Ht], [0, 0, 0]);
      const colX = Array.from({ length: cols - 1 }, (_, j) => (W * (j + 1)) / cols);
      const rowY = Array.from({ length: rows - 1 }, (_, i) => (Ht * (i + 1)) / rows);
      addPieces(net.panels, [
        ...rowY.map((y, i) => ({ poly: comb(W - 2, dep - 2, colX.map((x) => x - 1), slot, "top"), label: `Papan ${i + 1} (celah belakang)`, pose: (o: Vec2) => pose(FLAT, o, [1, y, 1]) })),
        ...colX.map((x, j) => ({ poly: comb(Ht - 2, dep - 2, rowY.map((y) => Ht - 1 - y), slot, "bottom"), label: `Sekat ${j + 1} (celah depan)`, pose: (o: Vec2) => pose(DOWN_Z, o, [x, Ht - 1, 1]) })),
      ]);
      return net;
    },
  ),
  tpl(
    { id: "diorama-bengkel", title: "Diorama Bengkel", category: "hobibapak", description: "Bengkel mini tiga dinding: papan perkakas berlubang, jendela, rolling door setengah terbuka, dan meja kerja.", difficulty: "sulit", minutes: 45, age: 10, tags: ["diorama", "bengkel", "garasi", "diecast"] },
    [mm("W", "Lebar", 360, 240, 600), mm("D", "Kedalaman", 240, 160, 400), mm("H", "Tinggi dinding", 200, 120, 320), tabP(12)],
    (p, c) => {
      const W = num(p, "W"),
        D = num(p, "D"),
        H = num(p, "H"),
        tab = num(p, "tab");
      const nb = new NetBuilder();
      nb.add({ id: "base", label: "Lantai", kind: "face", points: rectPoints(0, 0, W, D) });
      const peg: Vec2[][] = [];
      for (let u = W * 0.42; u <= W * 0.92; u += 16) for (let v = 70; v <= H - 25; v += 16) peg.push(circ(u, v, 2.5, 10));
      nb.attachEdge("base", 0, (L) => rectPoints(0, 0, L, H), { id: "back", label: "Dinding belakang (papan perkakas)", holes: peg });
      nb.attachEdge("base", 3, (L) => rectPoints(0, 0, L, H), { id: "left", label: "Dinding kiri (jendela)", holes: [rectPoints(D * 0.25, H * 0.45, D * 0.5, H * 0.3)] });
      nb.attachEdge("base", 1, (L) => rectPoints(0, 0, L, H), { id: "right", label: "Dinding kanan (pintu)", holes: [rectPoints(D * 0.2, 4, D * 0.65, H * 0.72)] });
      if (tab > 0) {
        nb.tryTab([["left", 1]], tab);
        nb.tryTab([["right", 3]], tab);
      }
      const net = nb.build(false);
      const door = new NetBuilder();
      const dw = D * 0.65 + 12;
      const slats = 6;
      door.add({ id: "s0", label: "Bilah 1", kind: "face", points: rectPoints(0, 0, dw, 15) });
      for (let i = 1; i < slats; i++) door.attachEdge(`s${i - 1}`, 2, (L) => rectPoints(0, 0, L, 15), { id: `s${i}`, label: `Bilah ${i + 1}`, angle: i % 2 ? 6 : -6 });
      const bench = buildBox({ W: 140, D: 55, H: 75, tab, lid: "glued", t: c.t, compensate: c.compensate, labels: { lid: "Daun meja" } });
      assemble(net.panels, [
        { net: door, prefix: "pintu-", label: "Rolling door", pose: (_, o) => pose(STAND_Z, o, [W + 2 * c.t + 1, H * 0.72 + 4, D * 0.2 - 6]) },
        { net: bench, prefix: "meja-", label: "Meja kerja", pose: flatAt([0, 0], [20, c.t + 0.5, 12]) },
      ]);
      addPieces(net.panels, [{ poly: rectPoints(0, 0, 130, 40), label: "Rak dinding", pose: (o) => pose(FLAT, o, [20, H * 0.75, 2]) }]);
      return net;
    },
  ),
  tpl(
    { id: "vespa-klasik", title: "Replika Vespa Klasik", category: "hobibapak", description: "Pajangan meja dari lapisan kardus bertumpuk: bodi bulat, tameng kaki, setang, dan roda di lapisan tengah.", difficulty: "sedang", minutes: 50, age: 10, tags: ["vespa", "motor", "pajangan", "berlapis"], featured: true },
    [mm("L", "Panjang", 290, 180, 480), mm("Wd", "Lebar", 60, 30, 120)],
    (p, c) => {
      const k = num(p, "L") / 290;
      const t = Math.max(1, c.t);
      const n = Math.max(6, Math.min(60, Math.round(num(p, "Wd") / t)));
      const body = flipY(scaleP(BODY_VESPA, k));
      const cowl = flipY(scaleP(COWL, k));
      const floor = flipY(scaleP(rectPoints(100, 14, 100, 16), k));
      const grip = flipY(scaleP(rectPoints(210, 213, 32, 10), k));
      const wheel = (x: number) => ({ poly: flipY(circ(x * k, 25 * k, 25 * k, 28)), holes: [flipY(circ(x * k, 25 * k, 5 * k, 12))] });
      const pieces: { poly: Vec2[]; holes?: Vec2[][]; label: string; pose: (o: Vec2) => number[] }[] = [];
      for (let i = 0; i < n; i++) {
        const u = Math.abs(((i + 0.5) / n) * 2 - 1);
        const z = (i + 1) * t;
        const at = (o: Vec2) => pose(STAND, o, [0, 0, z]);
        const L = `Lapis ${i + 1}`;
        if (u >= 0.6) {
          pieces.push({ poly: cowl, label: `${L} · bodi samping`, pose: at }, { poly: floor, label: `${L} · dek kaki`, pose: at }, { poly: grip, label: `${L} · handel`, pose: at });
        } else {
          pieces.push({ poly: body, label: `${L} · bodi`, pose: at });
          if (u < 0.2) pieces.push({ ...wheel(60), label: `${L} · roda belakang`, pose: at }, { ...wheel(250), label: `${L} · roda depan`, pose: at });
        }
      }
      const panels: Panel[] = [];
      addPieces(panels, pieces);
      return { panels, closed: false, stacked: true };
    },
  ),
  tpl(
    { id: "kotak-pancing", title: "Kotak Perkakas Pancing", category: "hobibapak", description: "Kotak bertutup selip dengan sekat silang untuk kail, umpan, dan timah, plus pegangan di tutup.", difficulty: "sedang", minutes: 30, age: 10, tags: ["mancing", "perkakas", "sekat"] },
    [
      mm("W", "Panjang", 300, 160, 500),
      mm("D", "Lebar", 180, 100, 320),
      mm("H", "Tinggi", 70, 40, 160),
      { key: "cols", label: "Kolom sekat", kind: "count", min: 1, max: 6, step: 1, default: 3 },
      { key: "rows", label: "Baris sekat", kind: "count", min: 1, max: 4, step: 1, default: 2 },
      tabP(14),
    ],
    (p, c) => {
      const W = num(p, "W"),
        D = num(p, "D"),
        H = num(p, "H"),
        cols = num(p, "cols"),
        rows = num(p, "rows"),
        tab = num(p, "tab");
      const slot = Math.max(1, c.t);
      const h = H * 0.8;
      const net = buildBox({ W, D, H, tab, lid: "tuck", t: c.t, compensate: c.compensate, labels: { lid: "Tutup selip" } }).build(false);
      const colX = Array.from({ length: cols - 1 }, (_, j) => (W * (j + 1)) / cols);
      const rowZ = Array.from({ length: rows - 1 }, (_, i) => (D * (i + 1)) / rows);
      addPieces(net.panels, [
        ...rowZ.map((z, i) => ({ poly: comb(W - 2, h, colX.map((x) => x - 1), slot, "top"), label: `Sekat memanjang ${i + 1}`, pose: (o: Vec2) => pose(STAND, o, [1, h, z]) })),
        ...colX.map((x, j) => ({ poly: comb(D - 2, h, rowZ.map((z) => z - 1), slot, "bottom"), label: `Sekat melintang ${j + 1}`, pose: (o: Vec2) => pose(STAND_Z, o, [x, h, 1]) })),
      ]);
      const handle = new NetBuilder();
      handle.add({ id: "grip", label: "Pegangan", kind: "face", points: rectPoints(0, 0, 120, 45), holes: [stadiumPoints([60, 18], 80, 20)] });
      handle.attachEdge("grip", 2, (L) => rectPoints(0, 0, L, 18), { id: "foot", label: "Kaki tempel", kind: "flap", angle: 90 });
      assemble(net.panels, [{ net: handle, prefix: "gagang-", label: "Pegangan", pose: (_, o) => pose(STAND, o, [W / 2 - 60, H + 45 + c.t, D / 2]) }]);
      return net;
    },
  ),
  tpl(
    { id: "papan-catur", title: "Papan Catur & Bidak", category: "hobibapak", description: "Kotak bertutup selip yang jadi papan catur, plus 32 bidak silang tanpa lem: pion, benteng, kuda, gajah, ratu, raja.", difficulty: "sulit", minutes: 60, age: 9, tags: ["catur", "permainan", "tanpa lem"] },
    [mm("s", "Ukuran kotak", 34, 24, 50), tabP(12)],
    (p, c) => {
      const s = num(p, "s");
      const k = s / 34;
      const t = Math.max(0.6, c.t);
      const B = 8 * s + 24;
      const H = 36;
      const net = buildBox({ W: B, D: B, H, tab: num(p, "tab"), lid: "tuck", t: c.t, compensate: c.compensate, labels: { lid: "Tutup (alas papan)" } }).build(false);
      const holes: Vec2[][] = [];
      for (let r = 0; r < 8; r++) for (let q = 0; q < 8; q++) if ((r + q) % 2) holes.push(rectPoints(q * s + 1.5, r * s + 1.5, s - 3, s - 3));
      const top = H + 2 * t + 0.5;
      const pieces: { poly: Vec2[]; label: string; pose: (o: Vec2) => number[]; holes?: Vec2[][] }[] = [{ poly: rectPoints(0, 0, 8 * s, 8 * s), holes, label: "Lapisan papan (32 lubang)", pose: (o) => pose(FLAT, o, [12, H + t + 0.5, 12]) }];
      const backRank = ["R", "N", "B", "Q", "K", "B", "N", "R"];
      for (const [side, rows] of [
        ["putih", [0, 1]],
        ["hitam", [7, 6]],
      ] as const) {
        rows.forEach((row, ri) => {
          for (let q = 0; q < 8; q++) {
            const kind = ri === 0 ? backRank[q] : "P";
            const [A, Bp] = crossPair(scaleP(CHESS[kind].half, k), t);
            const X = 12 + (q + 0.5) * s;
            const Z = 12 + (row + 0.5) * s;
            const name = `${CHESS[kind].name} ${side}`;
            pieces.push({ poly: flipY(A), label: `${name} · A`, pose: (o) => pose(STAND, o, [X, top, Z]) }, { poly: flipY(Bp), label: `${name} · B`, pose: (o) => pose(STAND_Z, o, [X, top, Z]) });
          }
        });
      }
      addPieces(net.panels, pieces);
      return net;
    },
  ),
  tpl(
    { id: "set-gaple", title: "Set Gaple & Remi", category: "hobibapak", description: "Rak pegangan kartu bertingkat dua, kotak kartu remi, kotak gaple, dan baki kacang untuk ronda.", difficulty: "mudah", minutes: 30, age: 10, tags: ["kartu", "gaple", "domino", "permainan"] },
    [mm("L", "Panjang rak", 200, 120, 400), tabP(10)],
    (p, c) => {
      const tab = num(p, "tab");
      const net = buildProfile({ profile: RACK, depth: num(p, "L"), tab, root: "strip", labels: { A: "Ujung kiri", B: "Ujung kanan", strip: (i) => ["Alas", "Punggung", "Tingkat belakang", "Alur belakang", "Bibir alur", "Tingkat tengah", "Alur depan", "Bibir alur", "Tingkat depan", "Muka depan"][i] } }).build(true);
      const box = (W: number, D: number, H: number, lid: "tuck" | "open") => buildBox({ W, D, H, tab, lid, t: c.t, compensate: c.compensate });
      assemble(net.panels, [
        { net: box(66, 24, 94, "tuck"), prefix: "remi-", label: "Kotak remi", pose: flatAt([0, 0], [120, 0, 10]) },
        { net: box(72, 40, 40, "tuck"), prefix: "gaple-", label: "Kotak gaple", pose: flatAt([0, 0], [120, 0, 60]) },
        { net: box(110, 110, 22, "open"), prefix: "baki-", label: "Baki kacang", pose: flatAt([0, 0], [210, 0, 0]) },
      ]);
      return net;
    },
  ),
  extrude(
    { id: "stand-stik-game", title: "Stand Stik Game & Headset", category: "hobibapak", description: "Dudukan dua stik di kiri-kanan, gantungan headset di puncak, dan lubang kabel cas di belakang.", difficulty: "sedang", minutes: 30, age: 10, tags: ["game", "konsol", "headset", "meja"] },
    {
      pts: STICK,
      sizeLabel: "Lebar",
      depth: 80,
      depthLabel: "Tebal",
      tab: 12,
      holesA: () => [],
      holesB: (k) => [circ(120 * k, 60 * k, 12 * k, 20)],
      labels: { A: "Muka depan", B: "Muka belakang (lubang kabel)", strip: (i) => (i === 0 ? "Alas" : `Sisi ${i + 1}`) },
    },
  ),
  tpl(
    { id: "stasiun-ngopi", title: "Stasiun Ngopi", category: "hobibapak", description: "Baki berisi dispenser sachet (ambil dari bawah, isi ulang dari atas), tempat sendok, dan tatakan gelas.", difficulty: "sedang", minutes: 35, age: 10, tags: ["kopi", "dapur", "sachet"] },
    [mm("W", "Lebar baki", 300, 240, 480), tabP(12)],
    (p, c) => {
      const W = num(p, "W"),
        tab = num(p, "tab");
      const t = Math.max(0.6, c.t);
      const net = buildBox({ W, D: 130, H: 25, tab, lid: "open", t: c.t, compensate: c.compensate, labels: { base: "Alas baki" } }).build(false);
      const disp = buildBox({
        W: 110,
        D: 80,
        H: 260,
        tab,
        lid: "tuck",
        t: c.t,
        compensate: c.compensate,
        holes: { front: [rectPoints(12, 4, 86, 38), stadiumPoints([55, 150], 18, 150)] },
        labels: { front: "Depan (ambil sachet & jendela stok)", lid: "Tutup isi ulang" },
      });
      const cup = buildProfile({ profile: regularPolygon(8, 26), depth: 110, tab, root: "sideA", sideB: false, labels: { A: "Alas", strip: (i) => `Dinding ${i + 1}` } });
      assemble(net.panels, [
        { net: disp, prefix: "dispenser-", label: "Dispenser sachet", pose: flatAt([0, 0], [15, t + 0.5, 20]) },
        { net: cup, prefix: "sendok-", label: "Tempat sendok", pose: (orig, o) => pose(FLAT, [cent(orig)[0] + o[0], cent(orig)[1] + o[1]], [W - 55, t + 0.5, 65]) },
      ]);
      addPieces(net.panels, [{ poly: circ(0, 0, 42, 32), label: "Tatakan gelas", pose: (o) => pose(FLAT, o, [175, t + 0.5, 65]) }]);
      return net;
    },
  ),
  extrude(
    { id: "organizer-garasi", title: "Organizer Obeng & Mata Bor", category: "hobibapak", description: "Dudukan tiga undak: lubang obeng besar, obeng kecil & kunci L, dan lubang mata bor berurutan ukuran.", difficulty: "mudah", minutes: 20, age: 10, tags: ["perkakas", "garasi", "obeng", "bor"] },
    {
      pts: STEPS,
      sizeLabel: "Kedalaman × tinggi",
      depth: 320,
      depthLabel: "Panjang",
      tab: 14,
      stripHoles: (k, depth) => {
        const row = (gap: number, r: (i: number, n: number) => number) => {
          const n = Math.max(2, Math.floor(depth / gap));
          return Array.from({ length: n }, (_, i) => circ(25 * k, (depth * (i + 0.5)) / n, r(i, n), 16));
        };
        return { 2: row(34, () => 6.5), 4: row(28, () => 4.5), 6: row(24, (i, n) => 1.5 + (3.5 * i) / Math.max(1, n - 1)) };
      },
      labels: { A: "Sisi kiri", B: "Sisi kanan", strip: (i) => ["Alas", "Punggung", "Undak atas (obeng besar)", "Muka atas", "Undak tengah (obeng kecil)", "Muka tengah", "Undak bawah (mata bor)", "Muka depan"][i] },
    },
  ),
];

export const HOBI: Template[] = [...MAINPERAN, ...HOBIBAPAK];
