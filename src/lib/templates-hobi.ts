import { rectPoints, stadiumPoints } from "./geometry/polygon";
import type { Vec2 } from "./geometry/types";
import { comb, DOWN_Z, FLAT, frame, kitTemplate, STAND, STAND_Z, type Kit } from "./kit";
import { beam, block, cyl, ellipsoid, hull, lathe, loft, type P3, type Part, prism, rotate, tube } from "./solid";
import type { Meta } from "./templates-3d";
import type { Category, Template } from "./templates";

/*
 * Kategori Hobi: gaming, musik, konten kreator, fashion & kecantikan, rumah boneka,
 * olahraga meja, berkebun, koleksi & display, cosplay (masing-masing 6 template).
 */

const both = (f: (s: 1 | -1) => Part[]): Part[] => [...f(1), ...f(-1)];
const circ = (x: number, y: number, r: number, n = 20): Vec2[] => Array.from({ length: n }, (_, i) => [x + Math.cos((i / n) * Math.PI * 2) * r, y + Math.sin((i / n) * Math.PI * 2) * r] as Vec2);
const ringXY = (c: P3, r: number, n = 16, ry = r): P3[] => Array.from({ length: n }, (_, i) => [c[0] + Math.cos((i / n) * Math.PI * 2) * r, c[1] + Math.sin((i / n) * Math.PI * 2) * ry, c[2]] as P3);
const ringXZ = (c: P3, r: number, n = 16, rz = r): P3[] => Array.from({ length: n }, (_, i) => [c[0] + Math.cos((i / n) * Math.PI * 2) * r, c[1], c[2] + Math.sin((i / n) * Math.PI * 2) * rz] as P3);
const wheel = (x: number, y: number, z0: number, z1: number, r: number, n = 12) => cyl([x, y, z0], [x, y, z1], r, n);
const flipY = (p: [number, number][]): Vec2[] => p.map(([x, y]) => [x, -y] as Vec2);
const steps = (n: number, rise: number, run: number): Vec2[] => {
  const pts: Vec2[] = [
    [0, 0],
    [n * run, 0],
  ];
  for (let i = n; i >= 1; i--) pts.push([i * run, i * rise], [(i - 1) * run, i * rise]);
  pts.pop();
  pts.push([0, rise]);
  return pts;
};
/** Kisi lubang persegi untuk jaring (net) gawang/ping-pong. */
const grid = (w: number, h: number, cell: number, bar: number): Vec2[][] => {
  const out: Vec2[][] = [];
  for (let x = bar; x + cell <= w - bar + 0.01; x += cell + bar) for (let y = bar; y + cell <= h - bar + 0.01; y += cell + bar) out.push(rectPoints(x, y, cell, cell));
  return out;
};
/** Rak bersekat silang (sekat tinggal diselipkan) di dalam kotak berdiri terbuka. */
function crate(k: Kit, W: number, H: number, dep: number, cols: number, rows: number, label: string) {
  k.box({ W, D: H, H: dep, lid: "open", holes: { base: [circ(W * 0.2, 14, 4, 10), circ(W * 0.8, 14, 4, 10)] }, labels: { base: "Punggung", front: "Dasar", back: "Atap" } }, STAND, [0, H, 0], label);
  const slot = k.slot / k.k;
  const xs = Array.from({ length: cols - 1 }, (_, j) => (W * (j + 1)) / cols);
  const ys = Array.from({ length: rows - 1 }, (_, i) => (H * (i + 1)) / rows);
  ys.forEach((y, i) => k.sheet(comb(W - 2, dep - 2, xs.map((x) => x - 1), slot, "top"), FLAT, [1, y, 1], `Papan ${i + 1}`));
  xs.forEach((x, j) => k.sheet(comb(H - 2, dep - 2, ys.map((y) => H - 1 - y), slot, "bottom"), DOWN_Z, [x, H - 1, 1], `Sekat ${j + 1}`));
}

type M = Omit<Meta, "category">;
const T = (category: Category) => (m: M, def: number, label: string, design: (k: Kit) => void) => kitTemplate({ ...m, category }, def, label, design);

/* ================================================================== */
/* Gaming                                                              */
/* ================================================================== */

const gam = T("gaming");
const GAMING: Template[] = [
  gam({ id: "arcade-mini", title: "Arcade Cabinet Mini", description: "Mesin arcade meja untuk HP: layar berlubang, panel kendali dengan joystick dan tombol, celah koin, dan pintu belakang.", difficulty: "sedang", minutes: 70, age: 9, tags: ["game", "arcade", "hp"], featured: true }, 400, "Tinggi", (k) => {
    const n: P3 = [0.362, 0.932, 0];
    const at = (u: number, z: number): P3 => [240 - u * 0.931, 205 + u * 0.362, z];
    const up = (p: P3, d: number): P3 => [p[0] + n[0] * d, p[1] + n[1] * d, p[2]];
    k.profile(
      {
        profile: [
          [0, 0],
          [200, 0],
          [200, 190],
          [240, 205],
          [150, 240],
          [130, 350],
          [175, 365],
          [170, 395],
          [0, 395],
        ],
        depth: 180,
        root: "strip",
        stripHoles: {
          1: [stadiumPoints([120, 90], 8, 36)],
          3: [circ(48, 50, 6), circ(48, 105, 8), circ(48, 140, 8), circ(78, 120, 8)],
          4: [rectPoints(10, 20, 90, 140)],
          8: [rectPoints(40, 30, 140, 120)],
        },
        labels: { A: "Sisi kanan", B: "Sisi kiri", strip: (i) => ["Alas", "Muka bawah (celah koin)", "Bawah panel", "Panel kendali", "Layar", "Bawah papan nama", "Papan nama", "Atap", "Pintu belakang"][i] },
      },
      FLAT,
      [0, 0, 0],
      "Kabinet",
    ).add(cyl(at(48, 50), up(at(48, 50), 40), 4, 6), ellipsoid(up(at(48, 50), 44), 10, 10, 10, 3, 8), ...[105, 140].map((z) => cyl(at(48, z), up(at(48, z), 6), 7, 8)), cyl(at(78, 120), up(at(78, 120), 6), 7, 8));
  }),
  gam({ id: "setir-balap", title: "Setir & Pedal Balap", description: "Setir gaya Labo dengan jari-jari, paddle shift, tiang dan alas penjepit meja, plus papan pedal gas-rem.", difficulty: "sedang", minutes: 70, age: 9, tags: ["game", "balap", "labo"] }, 440, "Panjang", (k) => {
    const c: P3 = [0, 260, 60];
    const tilt = (p: Part) => rotate(p, "x", -15, c);
    k.add(
      ...[
        tube(ringXY(c, 120, 18), 14, 12, 8, true),
        cyl([0, 260, 52], [0, 260, 72], 28, 12),
        ...[0, 180, 270].map((a) => beam(c, [Math.cos((a * Math.PI) / 180) * 112, 260 + Math.sin((a * Math.PI) / 180) * 112, 60], 14, 8)),
        ...both((s) => [block([s * 62, 270, 44], 30, 50, 6, 2)]),
      ].map(tilt),
      beam([0, 260, 50], [0, 210, -40], 34, 30),
      block([0, 100, -60], 240, 200, 180, 8),
      block([0, 6, 300], 260, 12, 160, 4),
      ...[-60, 60].map((x) => hull([-1, 1].flatMap((sx) => [[x + sx * 25, 12, 270], [x + sx * 25, 18, 270], [x + sx * 25, 70, 330], [x + sx * 25, 76, 326]] as P3[]))),
    );
  }),
  gam({ id: "kacamata-vr", title: "Kacamata VR Kardus", description: "Kacamata realitas virtual untuk HP: dua lubang lensa, celah HP di atas, dan celah tali kepala di samping.", difficulty: "mudah", minutes: 30, age: 10, tags: ["game", "vr", "hp"] }, 150, "Lebar", (k) =>
    k.box(
      {
        W: 150,
        D: 90,
        H: 80,
        lid: "glued",
        holes: { back: [circ(42, 40, 13), circ(108, 40, 13)], lid: [stadiumPoints([75, 78], 124, 7)], left: [stadiumPoints([45, 40], 6, 30)], right: [stadiumPoints([45, 40], 6, 30)] },
        labels: { back: "Muka mata (lensa)", lid: "Atas (celah HP)" },
      },
      FLAT,
      [0, 0, 0],
      "Kacamata",
    ),
  ),
  gam({ id: "rak-game", title: "Rak Kaset & Game", description: "Rak dinding bersekat silang untuk kaset, kotak game, dan stik. Sekat tinggal diselipkan tanpa lem.", difficulty: "sedang", minutes: 50, age: 10, tags: ["game", "rak", "tanpa lem"] }, 330, "Lebar", (k) => crate(k, 320, 260, 150, 3, 3, "Rak game")),
  gam({ id: "stand-headset", title: "Stand Headset", description: "Gantungan headset: alas berat, tiang, lengkung bantalan di puncak, dan kait kabel.", difficulty: "mudah", minutes: 30, age: 9, tags: ["game", "meja", "headset"] }, 300, "Tinggi", (k) =>
    k.add(
      block([0, 8, 0], 140, 16, 120, 6),
      cyl([0, 16, 0], [0, 262, 0], 12, 10),
      tube([[-62, 248, 0], [-44, 282, 0], [0, 294, 0], [44, 282, 0], [62, 248, 0]], 16, 8, 8),
      tube([[0, 150, 10], [0, 150, 34], [0, 166, 40]], 5),
    ),
  ),
  gam({ id: "fight-stick", title: "Fight Stick Arcade", description: "Stik arcade untuk game laga: tuas berbola, delapan tombol dalam dua baris, dan tombol start.", difficulty: "mudah", minutes: 45, age: 9, tags: ["game", "arcade"] }, 360, "Lebar", (k) => {
    const yTop = (z: number) => 60 - z * 0.0909;
    const btn = (x: number, z: number) => cyl([x, yTop(z), z], [x, yTop(z) + 6, z], 12, 10);
    k.add(
      hull([...[-180, 180].flatMap((x) => [-110, 110].map((z) => [x, 0, z] as P3)), ...[-180, 180].flatMap((x) => [[x, 70, -110] as P3, [x, 50, 110] as P3])]),
      cyl([-90, yTop(0), 0], [-90, yTop(0) + 4, 0], 18, 12),
      cyl([-90, yTop(0), 0], [-90, yTop(0) + 50, 0], 4, 6),
      ellipsoid([-90, yTop(0) + 58, 0], 16, 16, 16, 4, 10),
      ...[[20, -30], [60, -40], [100, -40], [140, -30], [20, 20], [60, 10], [100, 10], [140, 20]].map(([x, z]) => btn(x, z)),
      ...[-20, 20].map((x) => cyl([x, yTop(-90), -90], [x, yTop(-90) + 4, -90], 6, 8)),
    );
  }),
];

/* ================================================================== */
/* Musik                                                               */
/* ================================================================== */

const mus = T("musik");
function guitarOutline(): [number, number][] {
  const right: [number, number][] = [];
  for (const a of [-80, -50, -20, 10, 35]) right.push([120 * Math.cos((a * Math.PI) / 180), 120 + 120 * Math.sin((a * Math.PI) / 180)]);
  right.push([70, 236]);
  for (const a of [-40, -10, 20, 50, 75]) right.push([92 * Math.cos((a * Math.PI) / 180), 330 + 92 * Math.sin((a * Math.PI) / 180)]);
  right.push([18, 422]);
  const left = right.map(([x, y]) => [-x, y] as [number, number]).reverse();
  const x0 = left[left.length - 1][0],
    y0 = left[left.length - 1][1];
  return [left[left.length - 1], ...right, ...left.slice(0, -1)].map(([x, y]) => [x - x0, y - y0] as [number, number]);
}
const MUSIK: Template[] = [
  mus({ id: "cajon", title: "Cajon Kardus", description: "Kotak drum yang sungguh bisa ditabuh: lubang suara di belakang, tutup atas jadi tempat duduk. Pakai kardus double wall.", difficulty: "mudah", minutes: 40, age: 9, tags: ["musik", "drum", "perkusi"], featured: true }, 470, "Tinggi", (k) =>
    k.box({ W: 300, D: 300, H: 470, lid: "glued", holes: { back: [circ(150, 300, 55, 28)] }, labels: { front: "Muka tabuh (tapa)", back: "Belakang (lubang suara)", lid: "Dudukan" } }, FLAT, [0, 6, 0], "Badan cajon").add(...[[20, 20], [280, 20], [20, 280], [280, 280]].map(([x, z]) => block([x, 3, z], 24, 6, 24, 2))),
  ),
  mus({ id: "gitar-karet", title: "Gitar Karet", description: "Badan gitar berongga dengan lubang suara di muka, leher, kepala dengan pasak, dan jembatan. Pasang karet sebagai senar.", difficulty: "sedang", minutes: 70, age: 8, tags: ["musik", "gitar", "eksperimen bunyi"] }, 780, "Tinggi", (k) => {
    // titik awal profil = sudut kiri bawah badan; geser balik supaya badan berpusat di x = 0
    const x0 = 120 * Math.cos((-80 * Math.PI) / 180),
      y0 = 120 + 120 * Math.sin((-80 * Math.PI) / 180);
    k.profile({ profile: guitarOutline(), depth: 80, root: "strip", sideHoles: { B: [circ(x0, 270 - y0, 40, 24)] }, labels: { A: "Punggung", B: "Muka (lubang suara)", strip: (i) => `Sisi ${i + 1}` } }, FLAT, [-x0, y0, -40], "Badan gitar");
    k.add(
      beam([0, 418, 28], [0, 700, 28], 46, 20),
      block([0, 750, 24], 70, 100, 16, 6),
      ...both((s) => [0, 1, 2].map((i) => cyl([s * 35, 720 + i * 26, 24], [s * 48, 720 + i * 26, 24], 5, 6))),
      block([0, 150, 42], 90, 10, 8, 2),
      block([0, -14, 0], 220, 28, 160, 6),
      beam([0, 0, -80], [0, 560, 8], 14, 14),
    );
  }),
  mus({ id: "drum-set", title: "Drum Set Mini", description: "Set drum lengkap: bass drum, snare, dua tom, floor tom, simbal, hi-hat, kursi, dan stik.", difficulty: "sulit", minutes: 110, age: 8, tags: ["musik", "drum"] }, 620, "Lebar", (k) => {
    const legs = (c: P3, r: number, h: number): Part[] => [0, 120, 240].map((a) => beam([c[0] + Math.cos((a * Math.PI) / 180) * r, 0, c[2] + Math.sin((a * Math.PI) / 180) * r], [c[0], h, c[2]], 5, 5));
    const cymbal = (x: number, z: number, y: number): Part[] => [cyl([x, 0, z], [x, y, z], 4, 6), ...legs([x, 0, z], 60, 40), lathe([[90, 0], [90, 2], [14, 10], [8, 14], [0, 14]], 16, [x, y, z])];
    k.add(
      cyl([0, 110, -40], [0, 110, 40], 110, 16),
      cyl([-55, 230, -10], [-50, 280, 0], 48, 12),
      cyl([55, 230, -10], [50, 280, 0], 48, 12),
      cyl([-200, 150, 60], [-200, 190, 60], 62, 14),
      ...legs([-200, 0, 60], 50, 150),
      cyl([200, 40, 60], [200, 170, 60], 68, 14),
      ...legs([200, 0, 60], 70, 44),
      ...cymbal(-260, -60, 330),
      ...cymbal(240, -80, 360),
      cyl([-330, 0, 80], [-330, 270, 80], 4, 6),
      ...legs([-330, 0, 80], 50, 40),
      lathe([[70, 0], [70, 2], [0, 8]], 14, [-330, 250, 80]),
      lathe([[70, 0], [70, 2], [0, 8]], 14, [-330, 262, 80]),
      cyl([0, 0, 200], [0, 120, 200], 8, 6),
      ...legs([0, 0, 200], 40, 40),
      cyl([0, 120, 200], [0, 140, 200], 44, 14),
      beam([-230, 194, 50], [-170, 200, 80], 4, 4),
      beam([-230, 194, 70], [-160, 198, 40], 4, 4),
    );
  }),
  mus({ id: "grand-piano", title: "Grand Piano", description: "Piano besar dengan tutup terbuka bertopang, keyboard putih-hitam, tempat partitur, tiga kaki, pedal, dan bangku.", difficulty: "sulit", minutes: 110, age: 9, tags: ["musik", "piano"] }, 420, "Panjang", (k) => {
    const outline: [number, number][] = [
      [0, 0],
      [300, 0],
      [300, 40],
      [270, 110],
      [220, 190],
      [150, 280],
      [80, 350],
      [20, 370],
      [0, 370],
    ];
    const blacks = [1, 2, 4, 5, 6, 8, 9, 11, 12, 13, 15, 16, 18, 19, 20].map((i) => block([5 + i * 14.6, 252, -42], 8, 8, 34, 1));
    k.add(
      prism(outline, "xz", 200, 290),
      rotate(prism(outline, "xz", 290, 294), "z", 38, [0, 292, 0]),
      beam([180, 290, 150], [180, 430, 150], 4, 4),
      block([150, 240, -30], 300, 14, 60, 1),
      ...blacks,
      ...both((s) => [block([150 + s * 156, 250, -30], 12, 34, 60, 2)]),
      ...[[20, 20], [280, 20], [60, 320]].map(([x, z]) => lathe([[12, 0], [16, 40], [12, 200], [0, 200]], 8, [x, 0, z])),
      hull([[100, 290, 6], [200, 290, 6], [100, 290, 12], [200, 290, 12], [100, 350, 26], [200, 350, 26], [100, 350, 32], [200, 350, 32]]),
      ...[130, 150, 170].map((x) => block([x, 6, -6], 8, 4, 20, 1)),
      block([150, 110, -170], 160, 14, 70, 4),
      ...[-70, 70].flatMap((dx) => [-28, 28].map((dz) => block([150 + dx, 52, -170 + dz], 8, 104, 8, 1))),
    );
  }),
  mus({ id: "stand-gitar", title: "Stand Gitar", description: "Dudukan gitar rangka A dengan bantalan bawah berbibir dan garpu penyangga leher di puncak.", difficulty: "mudah", minutes: 35, age: 9, tags: ["musik", "gitar", "dudukan"] }, 470, "Tinggi", (k) =>
    k.add(
      ...both((s) => [beam([s * 80, 10, -60], [s * 80, 10, 80], 14, 14), beam([s * 20, 10, -60], [0, 420, -20], 14, 14), beam([s * 30, 420, -20], [s * 30, 455, 0], 10, 10), beam([s * 70, 40, 70], [s * 70, 70, 74], 10, 10)]),
      beam([-80, 40, 70], [80, 40, 70], 14, 14),
      beam([-40, 420, -20], [40, 420, -20], 12, 12),
      beam([-80, 10, -60], [80, 10, -60], 14, 14),
    ),
  ),
  mus({ id: "speaker-hp", title: "Speaker Pasif HP", description: "Kotak resonansi pengeras suara tanpa listrik: celah HP di atas dan dua lubang corong di depan berbingkai.", difficulty: "mudah", minutes: 30, age: 8, tags: ["musik", "hp", "eksperimen bunyi"] }, 220, "Lebar", (k) =>
    k
      .box({ W: 220, D: 120, H: 140, lid: "glued", holes: { front: [circ(55, 70, 40, 24), circ(165, 70, 40, 24)], lid: [stadiumPoints([110, 60], 100, 12)] }, labels: { lid: "Atas (celah HP)", front: "Muka speaker" } }, FLAT, [0, 6, 0], "Kotak speaker")
      .add(...[55, 165].map((x) => tube(ringXY([x, 76, 122], 46, 18), 3, 4, 4, true)), ...[[20, 20], [200, 20], [20, 100], [200, 100]].map(([x, z]) => block([x, 3, z], 20, 6, 20, 2)), cyl([200, 30, 122], [200, 30, 130], 8, 8)),
  ),
];

/* ================================================================== */
/* Konten kreator                                                      */
/* ================================================================== */

const kre = T("kreator");
const KREATOR: Template[] = [
  kre({ id: "lightbox-foto", title: "Light Box Foto Produk", description: "Studio foto mini: jendela kiri, kanan, dan atas untuk kertas kalkir, bukaan depan, dan latar lengkung tanpa sudut.", difficulty: "mudah", minutes: 45, age: 10, tags: ["foto", "konten", "usaha"], featured: true }, 360, "Sisi", (k) =>
    k
      .box(
        {
          W: 360,
          D: 360,
          H: 360,
          lid: "glued",
          holes: { front: [rectPoints(20, 20, 320, 320)], left: [rectPoints(40, 40, 280, 280)], right: [rectPoints(40, 40, 280, 280)], lid: [rectPoints(40, 40, 280, 280)] },
          labels: { front: "Bukaan depan", lid: "Jendela atas" },
        },
        FLAT,
        [0, 0, 0],
        "Kotak cahaya",
      )
      .profile(
        {
          profile: [
            [0, 0],
            [200, 0],
            [250, 15],
            [290, 50],
            [315, 100],
            [325, 330],
          ],
          depth: 336,
          root: "strip",
          closed: false,
          sideA: false,
          sideB: false,
          labels: { strip: (i) => `Latar lengkung ${i + 1}` },
        },
        frame([0, 0, -1], [1, 0, 0]),
        [12, 4, 352],
        "Latar",
      ),
  ),
  kre({ id: "holder-ringlight", title: "Holder Ring Light", description: "Dudukan meja dengan cincin lampu (lilitkan LED strip), penjepit HP di tengah, dan tiang beralas bulat.", difficulty: "mudah", minutes: 40, age: 10, tags: ["konten", "lampu", "hp"] }, 520, "Tinggi", (k) =>
    k.add(
      lathe([[70, 0], [70, 8], [16, 14], [0, 14]], 16),
      cyl([0, 14, 0], [0, 292, 0], 7, 8),
      tube(ringXY([0, 400, 0], 110, 20), 12, 10, 8, true),
      block([0, 400, 8], 70, 130, 10, 4),
      ...both((s) => [beam([s * 110, 400, 0], [s * 35, 400, 4], 8, 8), block([s * 38, 400, 16], 8, 140, 10, 2)]),
    ),
  ),
  kre({ id: "teleprompter-hp", title: "Teleprompter HP", description: "Kotak teleprompter: HP di dasar, celah miring 45° untuk kaca akrilik, jendela baca di depan, dan lubang kamera di belakang.", difficulty: "sedang", minutes: 50, age: 12, tags: ["konten", "video", "hp"] }, 220, "Sisi", (k) => {
    const slotDiag: Vec2[] = [
      [20, 26],
      [26, 20],
      [200, 174],
      [194, 180],
    ];
    k.box(
      {
        W: 220,
        D: 220,
        H: 200,
        lid: "glued",
        holes: { back: [circ(110, 110, 26)], front: [rectPoints(20, 20, 180, 160)], left: [slotDiag], right: [slotDiag, stadiumPoints([110, 12], 180, 8)] },
        labels: { back: "Belakang (lubang kamera)", front: "Jendela baca", right: "Kanan (celah HP & kaca)", left: "Kiri (celah kaca)" },
      },
      FLAT,
      [0, 0, 0],
      "Kotak teleprompter",
    );
  }),
  kre({ id: "tripod-meja", title: "Tripod Meja", description: "Tripod kecil berkepala bola dengan penjepit HP berjepit dua dan kenop pengunci.", difficulty: "mudah", minutes: 30, age: 9, tags: ["konten", "hp", "kamera"] }, 240, "Tinggi", (k) =>
    k.add(
      ...[90, 210, 330].map((a) => beam([Math.cos((a * Math.PI) / 180) * 90, 0, Math.sin((a * Math.PI) / 180) * 90], [0, 140, 0], 10, 10)),
      block([0, 150, 0], 30, 20, 30, 4),
      ellipsoid([0, 172, 0], 14, 14, 14, 4, 8),
      block([0, 214, 0], 90, 40, 14, 4),
      ...both((s) => [block([s * 50, 218, 6], 10, 60, 24, 2)]),
      cyl([0, 172, 14], [0, 172, 28], 8, 8),
    ),
  ),
  kre({ id: "kamera-retro", title: "Kamera Retro", description: "Replika kamera film klasik: badan berbingkai, jendela bidik, kenop putar, tombol rana, lensa bertingkat, dan cantelan tali.", difficulty: "sedang", minutes: 50, age: 9, tags: ["kamera", "replika", "foto"] }, 200, "Lebar", (k) =>
    k.add(
      block([0, 60, 0], 180, 100, 56, 10),
      block([-50, 118, 0], 50, 18, 40, 4),
      cyl([40, 110, 0], [40, 122, 0], 14, 12),
      cyl([62, 110, 0], [62, 120, 0], 6, 8),
      block([0, 114, 0], 24, 6, 20, 1),
      cyl([0, 60, 28], [0, 60, 58], 34, 16),
      cyl([0, 60, 58], [0, 60, 78], 28, 16),
      cyl([0, 60, 78], [0, 60, 84], 24, 16),
      ...both((s) => [cyl([s * 90, 90, 0], [s * 98, 90, 0], 5, 6)]),
    ),
  ),
  kre({ id: "clapperboard", title: "Papan Sutradara", description: "Clapperboard dengan papan tulis, batang tepuk berengsel yang terangkat, dan garis-garis timbul.", difficulty: "mudah", minutes: 25, age: 8, tags: ["video", "film", "konten"] }, 270, "Lebar", (k) => {
    const lift = (p: Part) => rotate(p, "z", 18, [-130, 206, 0]);
    k.add(block([0, 100, 0], 260, 200, 8, 2), cyl([-130, 206, -6], [-130, 206, 6], 6, 8), lift(block([0, 216, 0], 260, 24, 8, 1)), ...[-100, -50, 0, 50, 100].map((x) => lift(block([x, 216, 5], 26, 24, 2))));
  }),
];

/* ================================================================== */
/* Fashion & kecantikan                                                */
/* ================================================================== */

const fas = T("fashion");
const FASHION: Template[] = [
  fas({ id: "organizer-makeup", title: "Organizer Makeup Bertingkat", description: "Rak tiga undak: lubang lipstik di atas, lubang pensil alis di tengah, dan celah kuas di bawah.", difficulty: "mudah", minutes: 35, age: 10, tags: ["makeup", "rapi", "meja rias"], featured: true }, 240, "Panjang", (k) =>
    k.profile(
      {
        profile: [
          [0, 0],
          [180, 0],
          [180, 120],
          [120, 120],
          [120, 80],
          [60, 80],
          [60, 40],
          [0, 40],
        ],
        depth: 240,
        root: "strip",
        stripHoles: {
          2: [30, 75, 120, 165, 210].map((v) => circ(30, v, 12)),
          4: [25, 63, 101, 139, 177, 215].map((v) => circ(30, v, 8)),
          6: [40, 120, 200].map((v) => stadiumPoints([30, v], 30, 12)),
        },
        labels: { A: "Sisi kiri", B: "Sisi kanan", strip: (i) => ["Alas", "Punggung", "Undak atas (lipstik)", "Muka atas", "Undak tengah (pensil)", "Muka tengah", "Undak bawah (kuas)", "Muka depan"][i] },
      },
      FLAT,
      [0, 0, 0],
      "Organizer",
    ),
  ),
  fas({ id: "meja-rias-mini", title: "Meja Rias Mini", description: "Meja rias berlaci kiri-kanan dengan cermin oval bertiang dan kursi bundar.", difficulty: "sedang", minutes: 60, age: 7, tags: ["meja rias", "kamar", "boneka"] }, 330, "Lebar", (k) =>
    k.add(
      block([0, 160, 0], 300, 14, 140, 4),
      ...both((s) => [block([s * 100, 80, 0], 90, 146, 130, 3), ...[45, 110].flatMap((y) => [block([s * 100, y, 66], 80, 54, 4, 1), cyl([s * 100, y, 68], [s * 100, y, 76], 6, 6)])]),
      tube(ringXY([0, 330, -50], 90, 20, 120), 8, 6, 6, true),
      hull(ringXY([0, 330, -52], 84, 18, 114).flatMap(([x, y]) => [[x, y, -53] as P3, [x, y, -50] as P3])),
      ...both((s) => [beam([s * 70, 167, -50], [s * 86, 290, -50], 8, 8)]),
      cyl([0, 80, 150], [0, 92, 150], 50, 14),
      ...[0, 120, 240].map((a) => beam([Math.cos((a * Math.PI) / 180) * 30, 80, 150 + Math.sin((a * Math.PI) / 180) * 30], [Math.cos((a * Math.PI) / 180) * 40, 0, 150 + Math.sin((a * Math.PI) / 180) * 40], 6, 6)),
    ),
  ),
  fas({ id: "kotak-perhiasan", title: "Kotak Perhiasan Berlaci", description: "Lemari kecil dengan dua laci yang bisa ditarik keluar (kotak terpisah) dan kenop bulat.", difficulty: "sedang", minutes: 50, age: 9, tags: ["perhiasan", "laci", "rapi"] }, 220, "Lebar", (k) =>
    k
      .box({ W: 220, D: 160, H: 180, lid: "glued", holes: { front: [rectPoints(10, 10, 200, 76), rectPoints(10, 96, 200, 76)] }, labels: { front: "Muka (bukaan laci)" } }, FLAT, [0, 6, 0], "Lemari")
      .box({ W: 196, D: 150, H: 70, lid: "open" }, FLAT, [12, 18, 3], "Laci bawah")
      .box({ W: 196, D: 150, H: 70, lid: "open" }, FLAT, [12, 104, 3], "Laci atas")
      .add(cyl([110, 53, 154], [110, 53, 176], 8, 8), cyl([110, 139, 154], [110, 139, 176], 8, 8), ...[[14, 14], [206, 14], [14, 146], [206, 146]].map(([x, z]) => ellipsoid([x, 3, z], 8, 4, 8, 3, 6))),
  ),
  fas({ id: "rak-sepatu-hak", title: "Rak Sepatu Hak Tinggi", description: "Rak tiga undak berbibir penahan hak, lengkap dengan contoh sepatu hak tinggi di undak bawah.", difficulty: "sedang", minutes: 50, age: 10, tags: ["sepatu", "rak", "rapi"] }, 340, "Panjang", (k) =>
    k
      .profile(
        {
          profile: [
            [0, 0],
            [330, 0],
            [330, 240],
            [220, 240],
            [220, 160],
            [110, 160],
            [110, 80],
            [0, 80],
          ],
          depth: 300,
          root: "strip",
          labels: { A: "Sisi kiri", B: "Sisi kanan" },
        },
        FLAT,
        [0, 0, 0],
        "Rak",
      )
      .add(
        ...[
          [4, 88],
          [114, 168],
          [224, 248],
        ].map(([x, y]) => block([x, y, 150], 8, 16, 296)),
        hull([[95, 80, 60], [95, 80, 96], [60, 84, 62], [60, 84, 94], [30, 110, 66], [30, 110, 90], [22, 112, 70], [22, 112, 86], [90, 92, 78]]),
        beam([24, 80, 78], [26, 108, 78], 6, 6),
      ),
  ),
  fas({ id: "manekin-hijab", title: "Manekin Kepala Hijab", description: "Manekin kepala dan bahu untuk memajang hijab atau topi, dengan leher, tiang, dan alas bulat.", difficulty: "sedang", minutes: 50, age: 10, tags: ["hijab", "fashion", "display"] }, 440, "Tinggi", (k) =>
    k.add(
      lathe([[70, 0], [72, 10], [20, 20], [16, 30]], 16),
      cyl([0, 30, 0], [0, 190, 0], 14, 10),
      lathe([[40, 176], [96, 190], [110, 208], [96, 226], [52, 240], [0, 244]], 14, [0, 0, 0], 1, 0.55),
      lathe([[34, 236], [30, 270], [34, 290]], 12),
      ellipsoid([0, 350, 0], 62, 85, 70, 5, 12),
      hull([[0, 360, 66], [-8, 330, 70], [8, 330, 70], [0, 332, 80]]),
    ),
  ),
  fas({ id: "stand-topi-bando", title: "Stand Topi & Bando", description: "Tiang pajangan berkepala kubah untuk topi dengan tiga tingkat lengan berujung bulat untuk bando dan kalung.", difficulty: "mudah", minutes: 40, age: 9, tags: ["topi", "bando", "display"] }, 400, "Tinggi", (k) =>
    k.add(
      lathe([[80, 0], [80, 10], [14, 18], [0, 18]], 16),
      cyl([0, 18, 0], [0, 336, 0], 8, 8),
      lathe([[60, 330], [58, 360], [40, 385], [0, 392]], 14),
      ...[160, 230, 290].flatMap((y, i) => {
        const a = i * 0.6;
        const r = 110 - i * 20;
        const e1: P3 = [Math.cos(a) * r, y, Math.sin(a) * r],
          e2: P3 = [-Math.cos(a) * r, y, -Math.sin(a) * r];
        return [beam(e1, e2, 8, 8), ellipsoid(e1, 10, 10, 10, 3, 8), ellipsoid(e2, 10, 10, 10, 3, 8)];
      }),
    ),
  ),
];

/* ================================================================== */
/* Rumah boneka                                                        */
/* ================================================================== */

const rb = T("rumahboneka");
const floor = (w: number, d: number) => block([0, -3, 0], w, 6, d, 2);
const ROOM = 260;
const RUMAHBONEKA: Template[] = [
  rb({ id: "rumah-boneka-3-lantai", title: "Rumah Boneka 3 Lantai", description: "Rumah boneka terbuka di depan: tiga lantai, jendela di dinding belakang dan samping, tangga, atap pelana, dan cerobong.", difficulty: "sulit", minutes: 120, age: 6, tags: ["boneka", "rumah", "main peran"], featured: true }, 600, "Tinggi", (k) =>
    k
      .box(
        {
          W: 400,
          D: 480,
          H: 200,
          lid: "open",
          holes: {
            base: [40, 200, 360].flatMap((v) => [rectPoints(50, v, 80, 70), rectPoints(270, v, 80, 70)]),
            left: [60, 220, 380].map((u) => rectPoints(u, 60, 60, 80)),
            right: [60, 220, 380].map((u) => rectPoints(u, 60, 60, 80)),
          },
          labels: { base: "Dinding belakang", front: "Lantai dasar", back: "Plafon atas", left: "Dinding kiri", right: "Dinding kanan" },
        },
        STAND,
        [0, 480, 0],
        "Rumah",
      )
      .board(396, 196, FLAT, [2, 160, 2], "Lantai 2")
      .board(396, 196, FLAT, [2, 320, 2], "Lantai 3")
      .add(
        hull([...[-15, 415].flatMap((x) => [[x, 478, -15] as P3, [x, 478, 215] as P3]), [-15, 600, 100], [415, 600, 100]]),
        block([320, 590, 60], 40, 70, 40),
        ...[0, 1, 2, 3, 4, 5].map((i) => block([330, (i + 1) * 13, 30 + i * 22], 70, (i + 1) * 26, 22)),
      ),
  ),
  rb({ id: "set-kamar-boneka", title: "Set Kamar Tidur Boneka", description: "Kasur berbantal dan bersandaran, lemari dua pintu, nakas dengan lampu tidur, kursi, dan karpet.", difficulty: "sedang", minutes: 70, age: 5, tags: ["boneka", "furnitur", "kamar"] }, ROOM, "Lebar", (k) =>
    k.add(
      floor(ROOM, 200),
      block([-50, 20, 20], 110, 30, 150, 4),
      block([-50, 40, 20], 104, 12, 144, 5),
      ellipsoid([-50, 52, -40], 40, 8, 18, 3, 8),
      block([-50, 60, -58], 110, 90, 8, 3),
      block([80, 75, -70], 80, 150, 50, 3),
      ...both((s) => [cyl([80 + s * 8, 80, -44], [80 + s * 8, 80, -40], 4, 6)]),
      block([30, 25, -70], 30, 50, 34, 2),
      lathe([[10, 50], [10, 56], [3, 58], [3, 72], [14, 74], [8, 92], [0, 92]], 8, [30, 0, -70]),
      block([90, 25, 60], 44, 6, 44, 2),
      block([90, 50, 40], 44, 50, 6, 2),
      ...[-18, 18].flatMap((dx) => [-18, 18].map((dz) => block([90 + dx, 12, 60 + dz], 5, 24, 5, 1))),
      block([20, 1, 40], 160, 2, 90, 1),
    ),
  ),
  rb({ id: "set-ruang-tamu-boneka", title: "Set Ruang Tamu Boneka", description: "Sofa berbantal, kursi santai, meja tamu, bufet dengan TV, pot tanaman, dan karpet.", difficulty: "sedang", minutes: 70, age: 5, tags: ["boneka", "furnitur", "ruang tamu"] }, ROOM, "Lebar", (k) =>
    k.add(
      floor(ROOM, 200),
      block([-40, 15, -60], 150, 30, 60, 4),
      block([-40, 45, -84], 150, 40, 14, 4),
      ...both((s) => [block([-40 + s * 70, 32, -60], 14, 34, 60, 4)]),
      ...[-75, -40, -5].map((x) => block([x, 34, -56], 32, 8, 46, 3)),
      block([90, 15, -40], 60, 30, 56, 4),
      block([90, 45, -64], 60, 40, 12, 4),
      block([-40, 20, 20], 90, 6, 50, 2),
      ...[-36, 36].flatMap((dx) => [-18, 18].map((dz) => block([-40 + dx, 9, 20 + dz], 5, 18, 5, 1))),
      block([60, 20, 80], 110, 40, 30, 3),
      block([60, 70, 80], 90, 56, 6, 2),
      lathe([[14, 0], [16, 24], [0, 24]], 8, [110, 0, -80]),
      ...[0, 1, 2].map((i) => ellipsoid([110 + (i - 1) * 8, 40 + i * 6, -80], 8, 16, 6, 3, 6)),
      block([-20, 1, 10], 140, 2, 100, 1),
    ),
  ),
  rb({ id: "set-dapur-boneka", title: "Set Dapur Boneka", description: "Meja dapur dengan kompor dan oven, kulkas, wastafel berkeran, meja makan, dan dua kursi.", difficulty: "sedang", minutes: 70, age: 5, tags: ["boneka", "furnitur", "dapur"] }, ROOM, "Lebar", (k) =>
    k.add(
      floor(ROOM, 200),
      block([-60, 35, -75], 130, 70, 46, 3),
      ...[-90, -55].map((x) => tube(ringXZ([x, 71, -75], 12, 12), 2, 2, 4, true)),
      block([-60, 30, -51], 60, 30, 3, 1),
      block([90, 70, -75], 60, 140, 50, 4),
      ...[50, 100].map((y) => beam([66, y + 16, -48], [66, y - 16, -48], 4, 4)),
      block([20, 35, -75], 50, 70, 46, 3),
      tube([[20, 70, -92], [20, 92, -92], [20, 96, -80]], 3),
      block([-10, 50, 50], 100, 6, 60, 2),
      ...[-44, 44].flatMap((dx) => [-24, 24].map((dz) => block([-10 + dx, 24, 50 + dz], 5, 48, 5, 1))),
      ...both((s) => [block([-10 + s * 70, 26, 50], 30, 4, 30, 1), block([-10 + s * 84, 45, 50], 4, 40, 30, 1), ...[-12, 12].flatMap((dz) => [block([-10 + s * 70 - 12, 12, 50 + dz], 4, 24, 4, 1), block([-10 + s * 70 + 12, 12, 50 + dz], 4, 24, 4, 1)])]),
    ),
  ),
  rb({ id: "set-kamar-mandi-boneka", title: "Set Kamar Mandi Boneka", description: "Bak mandi berkeran, kloset duduk bertangki, wastafel berkaki, cermin di dinding, gantungan handuk, dan keset.", difficulty: "sedang", minutes: 60, age: 5, tags: ["boneka", "furnitur", "kamar mandi"] }, ROOM, "Lebar", (k) =>
    k
      .board(ROOM, 160, STAND, [-ROOM / 2, 160, -100], "Dinding")
      .add(
        floor(ROOM, 200),
        block([-60, 25, -55], 120, 50, 70, 12),
        tube([[-110, 50, -88], [-110, 70, -88], [-104, 76, -76]], 3),
        lathe([[18, 0], [22, 20], [26, 36], [0, 38]], 10, [60, 0, -60], 1, 1.3),
        block([60, 55, -88], 50, 40, 16, 3),
        lathe([[8, 0], [8, 60], [24, 64], [24, 72], [0, 72]], 10, [110, 0, -76]),
        block([110, 110, -96], 50, 56, 4, 2),
        beam([-30, 100, -96], [30, 100, -96], 4, 4),
        block([0, 1, 30], 80, 2, 50, 1),
      ),
  ),
  rb({ id: "mobil-boneka", title: "Mobil Boneka Atap Terbuka", description: "Mobil convertible untuk boneka: badan lonjong, dua kursi bersandaran, kaca depan, setir, lampu, dan empat roda.", difficulty: "sedang", minutes: 70, age: 5, tags: ["boneka", "mobil", "kendaraan"] }, 320, "Panjang", (k) => {
    const sec = (x: number, w: number, yb: number, yt: number, c = 10): P3[] => [
      [x, yb, -w / 2],
      [x, yb, w / 2],
      [x, yt - c, w / 2],
      [x, yt, w / 2 - c],
      [x, yt, -w / 2 + c],
      [x, yt - c, -w / 2],
    ];
    k.add(
      loft([sec(0, 130, 22, 70), sec(30, 136, 18, 74), sec(160, 140, 18, 70), sec(260, 132, 20, 60), sec(310, 116, 24, 48, 8)]),
      ...[90, 160].flatMap((x) => [block([x, 82, 0], 40, 14, 100, 4), block([x - 18, 108, 0], 8, 46, 100, 3)]),
      hull([[210, 72, -56], [210, 72, 56], [190, 120, -50], [190, 120, 50], [214, 72, -56], [214, 72, 56], [194, 120, -50], [194, 120, 50]]),
      tube(ringXY([182, 100, 30], 18, 12), 3, 3, 4, true),
      beam([182, 100, 30], [200, 78, 30], 4, 4),
      ...both((s) => [wheel(60, 32, s * 58, s * 80, 32), wheel(250, 32, s * 58, s * 80, 32), block([308, 46, s * 40], 8, 10, 22, 2)]),
    );
  }),
];

/* ================================================================== */
/* Olahraga meja                                                       */
/* ================================================================== */

const ola = T("olahraga");
const tableLegs = (w: number, d: number, h: number): Part[] => [8, w - 8].flatMap((x) => [8, d - 8].map((z) => block([x, h / 2, z], 22, h, 22, 3)));
const OLAHRAGA: Template[] = [
  ola({ id: "meja-foosball", title: "Meja Foosball", description: "Sepak bola meja: lapangan berdinding, enam batang pemain tembus dinding, gawang di kedua ujung, kaki meja, dan bola.", difficulty: "sulit", minutes: 120, age: 8, tags: ["olahraga", "permainan", "sepak bola"], featured: true }, 640, "Panjang", (k) => {
    const rods = [70, 150, 230, 290, 370, 450];
    const players = [1, 2, 3, 3, 2, 1];
    k.box(
      {
        W: 520,
        D: 300,
        H: 90,
        lid: "open",
        holes: { front: rods.map((x) => circ(x, 55, 7, 12)), back: rods.map((x) => circ(x, 55, 7, 12)), left: [rectPoints(110, 15, 80, 45)], right: [rectPoints(110, 15, 80, 45)] },
        labels: { base: "Lapangan" },
      },
      FLAT,
      [0, 200, 0],
      "Lapangan",
    ).add(
      ...tableLegs(520, 300, 200),
      ...rods.flatMap((x, i) => {
        const handleZ = i % 2 ? 370 : -70;
        const out: Part[] = [cyl([x, 255, -70], [x, 255, 370], 5, 6), cyl([x, 255, handleZ], [x, 255, handleZ + (i % 2 ? 50 : -50)], 12, 8)];
        const n = players[i];
        for (let p = 0; p < n; p++) out.push(block([x, 240, ((p + 1) * 300) / (n + 1)], 14, 40, 22, 3));
        return out;
      }),
      ellipsoid([260, 208, 150], 10, 10, 10, 3, 8),
    );
  }),
  ola({ id: "meja-air-hockey", title: "Meja Air Hockey", description: "Meja hoki: lapangan berdinding dengan celah gawang di kedua ujung, lingkaran tengah, dua pemukul, dan keping.", difficulty: "sedang", minutes: 80, age: 8, tags: ["olahraga", "permainan"] }, 520, "Panjang", (k) =>
    k
      .box({ W: 480, D: 260, H: 40, lid: "open", holes: { left: [rectPoints(80, 6, 100, 24)], right: [rectPoints(80, 6, 100, 24)] }, labels: { base: "Lapangan" } }, FLAT, [0, 180, 0], "Lapangan")
      .add(
        ...tableLegs(480, 260, 180),
        tube(ringXZ([240, 183, 130], 40, 18), 3, 1.5, 4, true),
        block([240, 182, 130], 4, 2, 250, 0),
        ...[90, 390].map((x) => lathe([[24, 0], [24, 10], [10, 14], [8, 30], [12, 40], [0, 44]], 12, [x, 182, 130])),
        cyl([200, 182, 100], [200, 187, 100], 14, 12),
      ),
  ),
  ola({ id: "meja-pinball", title: "Meja Pinball", description: "Pinball meja: dua flipper, tiga bumper, jalur peluncur berdinding, tuas pegas, dan kotak papan skor di belakang.", difficulty: "sulit", minutes: 110, age: 9, tags: ["permainan", "arcade"] }, 540, "Panjang", (k) =>
    k
      .box({ W: 280, D: 520, H: 70, lid: "open", holes: { front: [circ(30, 35, 7, 12)] }, labels: { base: "Papan main" } }, FLAT, [0, 120, 0], "Meja pinball")
      .board(415, 60, STAND_Z, [225, 186, 100], "Dinding jalur peluncur")
      .add(
        ...tableLegs(280, 520, 120),
        hull([[80, 122, 440], [80, 136, 440], [86, 122, 432], [86, 136, 432], [130, 122, 470], [130, 136, 470]]),
        hull([[200, 122, 440], [200, 136, 440], [194, 122, 432], [194, 136, 432], [150, 122, 470], [150, 136, 470]]),
        ...[[100, 200], [180, 200], [140, 280]].map(([x, z]) => cyl([x, 122, z], [x, 152, z], 18, 12)),
        cyl([250, 150, 520], [250, 150, 560], 6, 6),
        cyl([250, 150, 560], [250, 150, 572], 14, 10),
        block([140, 260, 10], 270, 160, 40, 6),
      ),
  ),
  ola({ id: "papan-dart", title: "Papan Dart & Easel", description: "Papan sasaran dengan cincin timbul, jari-jari, bullseye, papan latar, kaki penyangga, dan tiga anak panah.", difficulty: "sedang", minutes: 60, age: 10, tags: ["olahraga", "dart", "permainan"] }, 470, "Tinggi", (k) =>
    k.add(
      block([0, 250, -20], 400, 400, 12, 4),
      cyl([0, 250, -14], [0, 250, 10], 170, 24),
      ...[110, 65].map((r) => tube(ringXY([0, 250, 11], r, 24), 2, 3, 4, true)),
      cyl([0, 250, 10], [0, 250, 16], 14, 12),
      ...Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return beam([Math.cos(a) * 16, 250 + Math.sin(a) * 16, 12], [Math.cos(a) * 168, 250 + Math.sin(a) * 168, 12], 2, 2);
      }),
      ...both((s) => [beam([s * 150, 0, 40], [s * 60, 420, -26], 12, 12)]),
      beam([0, 0, -200], [0, 420, -30], 12, 12),
      ...[[30, 280], [-50, 230], [70, 190]].flatMap(([x, y]) => [tube([[x, y, 12], [x, y, 70]], 3, 3, 6), block([x, y, 66], 2, 16, 12), block([x, y, 66], 16, 2, 12)]),
    ),
  ),
  ola({ id: "gawang-mini", title: "Gawang Futsal Mini", description: "Gawang mini berangka tabung dengan jaring berlubang kisi di belakang dan samping, plus bola.", difficulty: "sedang", minutes: 60, age: 7, tags: ["olahraga", "sepak bola"] }, 420, "Lebar", (k) => {
    const back = frame([1, 0, 0], [0, -156 / Math.hypot(156, 120), -120 / Math.hypot(156, 120)]);
    const backLen = Math.hypot(156, 120);
    const side: Vec2[] = [
      [0, 0],
      [120, 156],
      [0, 156],
    ];
    k.sheet(rectPoints(0, 0, 400, backLen), back, [-200, 160, 0], "Jaring belakang", grid(400, backLen, 16, 5))
      .sheet(side, STAND_Z, [-200, 160, 0], "Jaring kiri", [rectPoints(8, 60, 30, 80), rectPoints(46, 100, 30, 40)])
      .sheet(side, STAND_Z, [200, 160, 0], "Jaring kanan", [rectPoints(8, 60, 30, 80), rectPoints(46, 100, 30, 40)])
      .add(
        tube([[-200, 0, 0], [-200, 160, 0], [200, 160, 0], [200, 0, 0]], 8, 8, 8),
        tube([[-200, 4, -120], [200, 4, -120]], 6),
        ...both((s) => [tube([[s * 200, 4, 0], [s * 200, 4, -120]], 6), tube([[s * 200, 160, 0], [s * 200, 4, -120]], 6)]),
        ellipsoid([60, 30, 80], 30, 30, 30, 5, 12),
      );
  }),
  ola({ id: "meja-pingpong-mini", title: "Meja Ping-pong Mini", description: "Meja tenis meja mini berkaki, jaring berlubang kisi di tiang, dua bet, dan bola.", difficulty: "mudah", minutes: 50, age: 7, tags: ["olahraga", "tenis meja"] }, 520, "Panjang", (k) =>
    k.board(280, 30, STAND_Z, [0, 156, -140], "Jaring", grid(280, 30, 8, 3)).add(
      block([0, 120, 0], 500, 12, 280, 3),
      ...[-230, 230].flatMap((x) => [-120, 120].map((z) => block([x, 57, z], 16, 114, 16, 2))),
      ...both((s) => [cyl([0, 126, s * 146], [0, 158, s * 146], 4, 6), cyl([s * 140, 126, s * 60], [s * 140, 130, s * 60], 36, 14), beam([s * 140, 128, s * 96], [s * 140, 128, s * 140], 12, 6)]),
      ellipsoid([60, 134, 30], 8, 8, 8, 3, 8),
    ),
  ),
];

/* ================================================================== */
/* Berkebun                                                            */
/* ================================================================== */

const keb = T("kebun");
const tuft = (x: number, y: number, z: number): Part[] => [-1, 1].map((i) => ellipsoid([x + i * 7, y + 18, z], 7, 20, 5, 3, 6));
const KEBUN: Template[] = [
  keb({ id: "pot-vertikal", title: "Rak Pot Vertikal", description: "Rak tanam bertingkat untuk lahan sempit: dua tiang miring dan tiga bak tanam terbuka dengan tanaman.", difficulty: "sedang", minutes: 60, age: 9, tags: ["kebun", "tanaman", "hemat tempat"], featured: true }, 440, "Tinggi", (k) => {
    [
      [30, 30],
      [170, 0],
      [310, -30],
    ].forEach(([y, z], i) => k.box({ W: 300, D: 120, H: 90, lid: "open", holes: { base: [circ(80, 60, 5, 10), circ(220, 60, 5, 10)] } }, FLAT, [-150, y, z - 60], `Bak ${i + 1}`));
    k.add(...both((s) => [beam([s * 170, 0, 70], [s * 170, 430, -60], 18, 18)]), ...[30, 170, 310].flatMap((y, i) => [-80, 0, 80].flatMap((x) => tuft(x, y + 90, -30 * i + 0))));
  }),
  keb({ id: "rumah-kaca-mini", title: "Rumah Kaca Mini", description: "Rumah kaca beratap pelana dengan jendela lebar di dinding dan atap (tempel plastik bening), pintu, dan pot di dalam.", difficulty: "sedang", minutes: 60, age: 9, tags: ["kebun", "tanaman", "sains"] }, 340, "Panjang", (k) =>
    k
      .profile(
        {
          profile: [
            [0, 0],
            [260, 0],
            [260, 150],
            [130, 230],
            [0, 150],
          ],
          depth: 340,
          root: "strip",
          stripHoles: {
            1: [rectPoints(20, 20, 110, 140), rectPoints(20, 180, 110, 140)],
            4: [rectPoints(20, 20, 110, 140), rectPoints(20, 180, 110, 140)],
            2: [rectPoints(16, 20, 120, 140), rectPoints(16, 180, 120, 140)],
            3: [rectPoints(16, 20, 120, 140), rectPoints(16, 180, 120, 140)],
          },
          sideHoles: { A: [rectPoints(90, 40, 80, 80)], B: [rectPoints(100, 6, 60, 120)] },
          labels: { A: "Belakang", B: "Depan (pintu)", strip: (i) => ["Alas", "Dinding kanan", "Atap kanan", "Atap kiri", "Dinding kiri"][i] },
        },
        FLAT,
        [0, 0, 0],
        "Rumah kaca",
      )
      .add(...[60, 130, 200].flatMap((x) => [lathe([[14, 0], [18, 30], [0, 30]], 8, [x, 2, 170]), ...tuft(x, 22, 170)])),
  ),
  keb({ id: "kotak-semai", title: "Kotak Semai Bibit", description: "Baki semai dua belas petak dengan sekat silang tanpa lem dan lubang resapan air di setiap petak.", difficulty: "mudah", minutes: 35, age: 7, tags: ["kebun", "bibit", "tanpa lem"] }, 300, "Panjang", (k) => {
    const W = 300,
      D = 200,
      H = 70,
      h = 60;
    const slot = k.slot / k.k;
    const xs = [75, 150, 225],
      zs = [D / 3, (2 * D) / 3];
    const drain = [37.5, 112.5, 187.5, 262.5].flatMap((x) => [33, 100, 167].map((z) => circ(x, z, 4, 10)));
    k.box({ W, D, H, lid: "open", holes: { base: drain } }, FLAT, [0, 0, 0], "Baki");
    zs.forEach((z, i) => k.sheet(comb(W - 2, h, xs.map((x) => x - 1), slot, "top"), STAND, [1, h, z], `Sekat memanjang ${i + 1}`));
    xs.forEach((x, j) => k.sheet(comb(D - 2, h, zs.map((z) => z - 1), slot, "bottom"), STAND_Z, [x, h, 1], `Sekat melintang ${j + 1}`));
    k.add(...[37, 112].flatMap((x) => tuft(x, 0, 33)));
  }),
  keb({ id: "rak-tangga-tanaman", title: "Rak Tangga Tanaman", description: "Rak kaki A bertangga tiga dengan pot dan tanaman, cocok untuk teras atau sudut jendela.", difficulty: "mudah", minutes: 45, age: 9, tags: ["kebun", "rak", "tanaman"] }, 430, "Tinggi", (k) =>
    k.add(
      ...both((s) => [beam([s * 160, 0, 120], [s * 160, 420, 0], 14, 14), beam([s * 160, 0, -120], [s * 160, 420, 0], 14, 14)]),
      beam([-170, 420, 0], [170, 420, 0], 12, 12),
      ...[
        [110, 80, 70],
        [220, 60, 52],
        [330, 40, 32],
      ].map(([y, d, z]) => block([0, y, z], 320, 10, d, 2)),
      ...[
        [-90, 115, 70],
        [60, 115, 70],
        [0, 225, 52],
        [-60, 335, 32],
      ].flatMap(([x, y, z]) => [lathe([[14, 0], [18, 30], [0, 30]], 8, [x, y, z]), ...tuft(x, y + 26, z)]),
    ),
  ),
  keb({ id: "gembor", title: "Gembor (Penyiram Tanaman)", description: "Replika gembor siram: badan bulat, corong panjang berkepala pancuran, dan gagang melengkung.", difficulty: "mudah", minutes: 40, age: 7, tags: ["kebun", "replika"] }, 320, "Panjang", (k) =>
    k.add(
      lathe([[70, 0], [72, 10], [66, 180], [50, 200], [0, 205]], 16),
      tube([[60, 40, 0], [120, 120, 0], [170, 200, 0]], [14, 10, 8]),
      cyl([170, 200, 0], [186, 216, 0], 8, 10, 22),
      tube([[-60, 170, 0], [-92, 230, 0], [-40, 274, 0], [24, 228, 0]], 8),
    ),
  ),
  keb({ id: "pagar-label-taman", title: "Pagar & Label Taman", description: "Dua ruas pagar kayu runcing dengan palang, plus tiga papan label tancap untuk menandai tanaman.", difficulty: "mudah", minutes: 30, age: 6, tags: ["kebun", "dekorasi", "label"] }, 560, "Lebar", (k) => {
    const picket = flipY([
      [0, 0],
      [30, 0],
      [30, 120],
      [15, 140],
      [0, 120],
    ]);
    const label = flipY([
      [10, 0],
      [16, 60],
      [40, 60],
      [40, 100],
      [-20, 100],
      [-20, 60],
      [4, 60],
    ]);
    for (let i = 0; i < 8; i++) k.sheet(picket, STAND, [i * 42, 0, 0], `Pancang ${i + 1}`);
    [30, 95].forEach((y, i) => k.board(330, 14, STAND, [-2, y + 14, -3], `Palang ${i + 1}`));
    for (let i = 0; i < 4; i++) k.sheet(picket, STAND_Z, [-10, 0, 20 + i * 42], `Pancang samping ${i + 1}`);
    [420, 480, 540].forEach((x, i) => k.sheet(label, STAND, [x, 0, 60], `Label ${i + 1}`));
  }),
];

/* ================================================================== */
/* Koleksi & display                                                   */
/* ================================================================== */

const kol = T("koleksi");
const KOLEKSI: Template[] = [
  kol({ id: "tangga-display-figur", title: "Tangga Display Figur", description: "Rak pajang empat undak untuk action figure, figurine, atau parfum.", difficulty: "mudah", minutes: 30, age: 9, tags: ["koleksi", "figur", "display"] }, 360, "Panjang", (k) =>
    k
      .profile({ profile: steps(4, 50, 60).map(([x, y]) => [x, y] as Vec2), depth: 360, root: "strip", labels: { A: "Sisi kiri", B: "Sisi kanan" } }, FLAT, [0, 0, 0], "Tangga display")
      .add(...[[30, 50], [90, 100], [150, 150], [210, 200]].flatMap(([x, y]) => [block([x, y + 22, 180], 16, 44, 12, 3), ellipsoid([x, y + 52, 180], 9, 9, 9, 3, 8)])),
  ),
  kol({ id: "display-hotwheels", title: "Display Hot Wheels Dinding", description: "Rak dinding 25 petak bersekat silang untuk mobil diecast 1:64. Sekat tinggal diselipkan.", difficulty: "sedang", minutes: 50, age: 9, tags: ["koleksi", "diecast", "tanpa lem"], featured: true }, 400, "Lebar", (k) => crate(k, 380, 300, 60, 5, 5, "Rak diecast")),
  kol({ id: "rak-manga", title: "Rak Manga & Komik", description: "Rak buku terbuka dua tingkat berisi deretan komik, bisa diletakkan di meja atau dinding.", difficulty: "mudah", minutes: 40, age: 9, tags: ["komik", "buku", "rak"] }, 340, "Lebar", (k) =>
    k
      .box({ W: 330, D: 260, H: 170, lid: "open", labels: { base: "Punggung", front: "Dasar", back: "Atap" } }, STAND, [0, 260, 0], "Rak")
      .board(326, 166, FLAT, [2, 130, 2], "Papan tengah")
      .add(...[0, 1, 2, 3, 4, 5, 6].map((i) => block([16 + i * 24, 64, 80], 20, 120, 110, 1)), ...[0, 1, 2, 3, 4].map((i) => block([16 + i * 24, 192, 80], 20, 120, 110, 1))),
  ),
  kol({ id: "deck-box-tcg", title: "Deck Box Kartu TCG", description: "Kotak kartu bertutup selip untuk 60 kartu bersleeve dengan jendela intip, plus baki dadu dan dua dadu.", difficulty: "mudah", minutes: 25, age: 9, tags: ["kartu", "tcg", "pokemon"] }, 180, "Lebar", (k) =>
    k
      .box({ W: 72, D: 44, H: 100, lid: "tuck", holes: { front: [rectPoints(12, 30, 48, 50)] }, labels: { front: "Muka (jendela)" } }, FLAT, [0, 0, 0], "Deck box")
      .box({ W: 72, D: 44, H: 22, lid: "open" }, FLAT, [100, 0, 0], "Baki dadu")
      .add(block([124, 32, 22], 18, 18, 18, 4), block([150, 32, 22], 18, 18, 18, 4)),
  ),
  kol({ id: "tribun-figur", title: "Tribun Minifigure", description: "Tribun lima undak untuk memajang minifigure atau figur kecil, lengkap dengan tiga contoh figur.", difficulty: "mudah", minutes: 30, age: 8, tags: ["koleksi", "lego", "display"] }, 300, "Panjang", (k) =>
    k
      .profile({ profile: steps(5, 25, 30).map(([x, y]) => [x, y] as Vec2), depth: 300, root: "strip", labels: { A: "Sisi kiri", B: "Sisi kanan" } }, FLAT, [0, 0, 0], "Tribun")
      .add(...[[15, 25, 60], [75, 75, 150], [135, 125, 240]].flatMap(([x, y, z]) => [block([x, y + 14, z], 16, 28, 10, 2), cyl([x, y + 28, z], [x, y + 40, z], 6, 8)])),
  ),
  kol({ id: "kotak-pajangan-mika", title: "Kotak Pajangan Mika", description: "Lemari pajang berjendela di empat sisi (tempel mika), alas bertingkat, plakat nama, dan contoh piala.", difficulty: "mudah", minutes: 35, age: 9, tags: ["koleksi", "display", "piala"] }, 280, "Lebar", (k) =>
    k
      .box(
        {
          W: 260,
          D: 180,
          H: 220,
          lid: "glued",
          holes: { front: [rectPoints(15, 15, 230, 190)], left: [rectPoints(15, 15, 150, 190)], right: [rectPoints(15, 15, 150, 190)], lid: [rectPoints(15, 15, 230, 150)] },
        },
        FLAT,
        [0, 20, 0],
        "Kotak mika",
      )
      .add(block([130, 10, 90], 280, 20, 200, 3), hull([[90, 0, 192], [170, 0, 192], [90, 0, 200], [170, 0, 200], [90, 18, 192], [170, 18, 192]]), lathe([[24, 0], [24, 8], [8, 14], [8, 50], [30, 70], [26, 110], [0, 110]], 10, [130, 22, 90])),
  ),
];

/* ================================================================== */
/* Cosplay                                                             */
/* ================================================================== */

const cos = T("cosplay");
function featherWing(s: 1 | -1): Part[] {
  // pangkal sayap di papan punggung, lalu bulu berbentuk daun mengembang ke samping
  const leaf = (root: P3, ang: number, L: number, w: number, z: number): Part => {
    const d: [number, number] = [Math.cos(ang) * s, Math.sin(ang)];
    const n: [number, number] = [-d[1], d[0]];
    const at = (t: number, off: number): P3 => [root[0] + d[0] * L * t + n[0] * off, root[1] + d[1] * L * t + n[1] * off, z];
    const pts = [at(0, -w * 0.35), at(0, w * 0.35), at(0.55, -w / 2), at(0.55, w / 2), at(1, 0)];
    return hull(pts.flatMap((p) => [p, [p[0], p[1], p[2] - 3] as P3]));
  };
  const out: Part[] = [block([s * 66, 220, -2], 30, 60, 10, 3)];
  // bulu utama (panjang) di ujung, bulu sekunder lebih pendek di dekat punggung
  for (let i = 0; i < 7; i++) {
    const f = i / 6;
    const root: P3 = [s * (90 + f * 250), 290 - f * 10 + Math.sin(f * Math.PI) * 30, -6];
    const ang = (-(100 - f * 60) * Math.PI) / 180;
    out.push(leaf(root, ang, 150 + f * 90, 52, -6), leaf([root[0] - s * 18, root[1] - 10, -10], ang - 0.08 * s, 110 + f * 60, 44, -10));
  }
  return out;
}

const COSPLAY: Template[] = [
  cos({ id: "helm-armor", title: "Helm Armor Pahlawan", description: "Helm zirah futuristik: tempurung, pelat wajah bersudut, celah mata timbul, piringan telinga, dan sirip atas.", difficulty: "sulit", minutes: 120, age: 11, tags: ["cosplay", "helm", "superhero"], featured: true }, 280, "Tinggi", (k) =>
    k.add(
      ellipsoid([0, 150, -10], 95, 105, 105, 5, 12),
      hull([
        ...[1, -1].flatMap((s) => [[s * 60, 200, 70], [s * 75, 120, 60], [s * 50, 70, 72], [s * 25, 58, 82], [s * 40, 150, 95]] as P3[]),
        [0, 215, 85],
        [0, 55, 86],
        [0, 160, 102],
      ]),
      ...both((s) => [rotate(block([s * 30, 166, 100], 34, 8, 6, 2), "z", s * -10, [s * 30, 166, 100]), cyl([s * 95, 140, -10], [s * 106, 140, -10], 30, 12)]),
      hull([-4, 4].flatMap((x) => [[x, 250, 60], [x, 262, 0], [x, 254, -60], [x, 238, -90]] as P3[])),
    ),
  ),
  cos({ id: "reaktor-dada", title: "Reaktor Dada", description: "Reaktor bercahaya berlapis: piringan dasar, cincin, sepuluh lilitan, inti, dan tali pengikat di belakang.", difficulty: "mudah", minutes: 40, age: 9, tags: ["cosplay", "superhero", "lampu"] }, 170, "Diameter", (k) =>
    k.add(
      cyl([0, 0, 0], [0, 0, 16], 80, 24),
      tube(ringXY([0, 0, 16], 62, 24), 3, 4, 4, true),
      cyl([0, 0, 16], [0, 0, 24], 44, 20),
      cyl([0, 0, 24], [0, 0, 34], 22, 16),
      ...Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        const c: P3 = [Math.cos(a) * 54, Math.sin(a) * 54, 20];
        return rotate(block(c, 14, 8, 8, 1), "z", (a * 180) / Math.PI, c);
      }),
      ...both((s) => [tube([[s * 70, 20, -2], [s * 80, 0, -16], [s * 70, -20, -2]], 4, 4, 6)]),
    ),
  ),
  cos({ id: "gauntlet-armor", title: "Sarung Tangan Armor", description: "Pelindung lengan bawah berongga (bisa dipakai), pelat punggung tangan, buku jari, cincin pergelangan, dan repulsor.", difficulty: "sedang", minutes: 70, age: 10, tags: ["cosplay", "superhero", "armor"] }, 380, "Panjang", (k) =>
    k.add(
      tube([[0, 60, 0], [130, 62, 0], [260, 66, 0]], [34, 40, 48], [28, 34, 42], 10, false, false),
      hull([[-10, 84, -30], [-10, 84, 30], [-90, 80, -32], [-90, 80, 32], [-10, 94, -26], [-10, 94, 26], [-90, 90, -28], [-90, 90, 28]]),
      ...[-24, -8, 8, 24].map((z) => block([-96, 90, z], 14, 16, 12, 3)),
      tube(Array.from({ length: 14 }, (_, i) => [6, 60 + Math.sin((i / 14) * Math.PI * 2) * 34, Math.cos((i / 14) * Math.PI * 2) * 40] as P3), 4, 4, 4, true),
      ...[80, 170].map((x) => block([x, 96, 0], 40, 8, 30, 3)),
      cyl([-50, 78, 0], [-50, 72, 0], 16, 12),
    ),
  ),
  cos({ id: "sayap-cosplay", title: "Sayap Cosplay", description: "Sepasang sayap berbulu tiga lapis yang mengembang dari papan punggung. Ikat dengan tali ransel.", difficulty: "sedang", minutes: 90, age: 9, tags: ["cosplay", "sayap", "kostum"] }, 760, "Lebar", (k) => k.add(block([0, 150, -10], 140, 180, 12, 6), ...featherWing(1), ...featherWing(-1))),
  cos({ id: "palu-petir-cosplay", title: "Palu Petir Cosplay", description: "Palu besar berkepala balok berpinggir, gagang bercincin pegangan, pangkal, dan tali gantung.", difficulty: "sedang", minutes: 60, age: 9, tags: ["cosplay", "palu", "superhero"] }, 400, "Tinggi", (k) =>
    k.add(
      block([0, 300, 0], 170, 100, 100, 10),
      ...both((s) => [block([s * 80, 300, 0], 14, 108, 108, 4)]),
      tube([[0, 0, 0], [0, 252, 0]], 16, 16, 10),
      ...[40, 80, 120, 160, 200].map((y) => cyl([0, y, 0], [0, y + 10, 0], 19, 10)),
      cyl([0, -10, 0], [0, 4, 0], 22, 10),
      tube(ringXY([0, -40, 0], 26, 14), 3, 3, 4, true),
    ),
  ),
  cos({ id: "perisai-bundar", title: "Perisai Bundar", description: "Perisai cembung bercincin timbul dengan bintang di tengah, pegangan lengan di belakang, dan dudukan pajang.", difficulty: "sedang", minutes: 60, age: 8, tags: ["cosplay", "perisai", "superhero"] }, 440, "Diameter", (k) => {
    const star: [number, number][] = Array.from({ length: 10 }, (_, i) => {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 ? 26 : 60;
      return [Math.cos(a) * r, 210 - Math.sin(a) * r];
    });
    k.add(
      rotate(lathe([[200, 0], [200, 8], [150, 18], [100, 26], [50, 30], [0, 31]], 24), "x", 90, [0, 0, 0]).map((t) => t.map(([x, y, z]) => [x, y + 210, z] as P3) as [P3, P3, P3]),
      ...[
        [172, 14],
        [122, 24],
      ].map(([r, z]) => tube(ringXY([0, 210, z], r, 28), 3, 4, 4, true)),
      prism(star, "xy", 29, 36),
      ...both((s) => [beam([s * 70, 260, -4], [s * 70, 160, -4], 10, 10)]),
      block([0, 6, 20], 200, 12, 100, 3),
      beam([0, 6, -60], [0, 120, -10], 12, 12),
    );
  }),
];

export const HOBI: Template[] = [...GAMING, ...MUSIK, ...KREATOR, ...FASHION, ...RUMAHBONEKA, ...OLAHRAGA, ...KEBUN, ...KOLEKSI, ...COSPLAY];

