import { addWheels, buildBox, buildProfile, NetBuilder } from "./geometry/builder";
import { circlePoints, rectPoints, regularPolygon, stadiumPoints } from "./geometry/polygon";
import type { NetBase, Vec2 } from "./geometry/types";
import type { BuildCtx, Category, Difficulty, ParamDef, Params, Template } from "./templates";

/*
 * Koleksi "Jagoan": senjata mainan, kostum ksatria, kendaraan tempur & petualangan.
 * Sebagian besar dibangun dari siluet (mm, sumbu y ke atas) yang diekstrusi,
 * dengan sisi pertama selalu alas horizontal agar panel tidak saling tumpuk.
 */

const num = (p: Params, k: string) => Number(p[k]);
const tabP = (d: number): ParamDef => ({ key: "tab", label: "Lebar tab lem", kind: "mm", min: 0, max: 25, step: 1, default: d, advanced: true });

/* Rotasi akhir (Matrix4 column-major) untuk memajang model. */
const LAY_FLAT = [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1];
const FACE_FRONT = [-1, 0, 0, 0, 0, 0, -1, 0, 0, -1, 0, 0, 0, 0, 0, 1];
const STAND_UP = [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1];

interface ProfileDef {
  id: string;
  title: string;
  category: Category;
  description: string;
  difficulty: Difficulty;
  minutes: number;
  age: number;
  tags: string[];
  /** Siluet nominal (mm, y ke atas, CCW). Titik 0→1 = alas horizontal di y = 0. */
  pts: Vec2[];
  sizeLabel: string;
  depth: number;
  depthLabel: string;
  tab: number;
  labels?: { A?: string; B?: string; strip?: (i: number) => string };
  holes?: (k: number) => Vec2[][];
  stripHoles?: (k: number, depth: number) => Record<number, Vec2[][]>;
  wheels?: { xs: number[]; r: number };
  rootPose?: number[];
  featured?: boolean;
}

function extent(pts: Vec2[]) {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
}

function profileTemplate(d: ProfileDef): Template {
  const nominal = Math.round(extent(d.pts));
  return {
    id: d.id,
    title: d.title,
    category: d.category,
    description: d.description,
    difficulty: d.difficulty,
    minutes: d.minutes,
    age: d.age,
    tags: ["jagoan", ...d.tags],
    featured: d.featured,
    params: [
      { key: "size", label: d.sizeLabel, kind: "mm", min: Math.round(nominal * 0.4), max: Math.round(nominal * 2.5), step: 1, default: nominal },
      { key: "depth", label: d.depthLabel, kind: "mm", min: 8, max: Math.max(60, d.depth * 3), step: 1, default: d.depth },
      tabP(d.tab),
    ],
    build: (p: Params, c: BuildCtx): NetBase => {
      const k = num(p, "size") / nominal;
      const [ox, oy] = d.pts[0];
      const tr = (q: Vec2): Vec2 => [(q[0] - ox) * k, (q[1] - oy) * k];
      const profile = d.pts.map(tr);
      const depth = num(p, "depth");
      const holes = d.holes?.(k).map((h) => h.map(([x, y]) => [x - ox * k, y - oy * k] as Vec2));
      const nb = buildProfile({
        profile,
        depth,
        tab: num(p, "tab"),
        root: "strip",
        sideHoles: holes ? { A: holes, B: holes } : undefined,
        stripHoles: d.stripHoles?.(k, depth),
        labels: { A: "Sisi kiri", B: "Sisi kanan", ...d.labels },
      });
      if (d.wheels) addWheels(nb, 0, 0, depth, c.t, d.wheels.xs.map((x) => (x - ox) * k), d.wheels.r * k);
      const net = nb.build(!d.wheels);
      if (d.rootPose) net.panels[0].rootPose = d.rootPose;
      return net;
    },
  };
}

const circ = (x: number, y: number, r: number) => circlePoints([x, y], r, 24);

/* ------------------------------------------------------------------ */
/* Senjata mainan                                                      */
/* ------------------------------------------------------------------ */

const SWORD: Vec2[] = [
  [-20, 0],
  [20, 0],
  [20, 24],
  [13, 32],
  [13, 120],
  [70, 120],
  [70, 142],
  [25, 142],
  [25, 520],
  [0, 590],
  [-25, 520],
  [-25, 142],
  [-70, 142],
  [-70, 120],
  [-13, 120],
  [-13, 32],
  [-20, 24],
];

const AXE: Vec2[] = [
  [-12, 0],
  [12, 0],
  [12, 300],
  [55, 290],
  [100, 262],
  [112, 330],
  [100, 398],
  [55, 370],
  [12, 360],
  [12, 420],
  [-12, 420],
  [-12, 366],
  [-42, 352],
  [-42, 322],
  [-12, 312],
];

const HAMMER: Vec2[] = [
  [-15, 0],
  [15, 0],
  [15, 250],
  [80, 250],
  [80, 360],
  [-80, 360],
  [-80, 250],
  [-15, 250],
];

const SPEAR: Vec2[] = [
  [-9, 0],
  [9, 0],
  [9, 600],
  [24, 622],
  [0, 710],
  [-24, 622],
  [-9, 600],
];

const BLASTER: Vec2[] = [
  [0, 0],
  [42, 0],
  [60, 78],
  [172, 78],
  [172, 94],
  [212, 94],
  [212, 126],
  [150, 142],
  [22, 142],
  [0, 120],
  [14, 78],
];

/* ------------------------------------------------------------------ */
/* Kendaraan                                                           */
/* ------------------------------------------------------------------ */

const TANK: Vec2[] = [
  [20, 0],
  [260, 0],
  [285, 25],
  [285, 50],
  [250, 62],
  [230, 90],
  [190, 90],
  [185, 108],
  [320, 108],
  [320, 122],
  [185, 122],
  [170, 142],
  [100, 142],
  [85, 90],
  [30, 90],
  [10, 62],
  [0, 50],
  [0, 25],
];

const JET: Vec2[] = [
  [-70, 0],
  [70, 0],
  [25, 40],
  [25, 90],
  [150, 150],
  [150, 176],
  [25, 170],
  [15, 330],
  [0, 380],
  [-15, 330],
  [-25, 170],
  [-150, 176],
  [-150, 150],
  [-25, 90],
  [-25, 40],
];

const SHIP: Vec2[] = [
  [60, 0],
  [240, 0],
  [305, 85],
  [162, 85],
  [162, 112],
  [236, 112],
  [162, 242],
  [162, 264],
  [150, 264],
  [150, 85],
  [0, 96],
];

const TRAIN: Vec2[] = [
  [0, 0],
  [250, 0],
  [274, 28],
  [250, 42],
  [250, 112],
  [220, 112],
  [226, 152],
  [186, 152],
  [192, 112],
  [96, 112],
  [96, 172],
  [0, 172],
];

const BUS: Vec2[] = [
  [0, 0],
  [400, 0],
  [400, 146],
  [376, 172],
  [12, 172],
  [0, 160],
];

const HELI: Vec2[] = [
  [60, 0],
  [180, 0],
  [226, 45],
  [206, 96],
  [152, 104],
  [152, 120],
  [300, 120],
  [300, 132],
  [20, 132],
  [20, 120],
  [128, 120],
  [128, 104],
  [62, 96],
  [-110, 82],
  [-124, 118],
  [-142, 118],
  [-132, 62],
  [40, 42],
];

/* ------------------------------------------------------------------ */
/* Figur & bangunan                                                    */
/* ------------------------------------------------------------------ */

const TREX: Vec2[] = [
  [0, 0],
  [250, 0],
  [250, 12],
  [178, 12],
  [172, 34],
  [152, 62],
  [162, 96],
  [204, 118],
  [216, 108],
  [226, 118],
  [204, 136],
  [216, 160],
  [266, 164],
  [272, 190],
  [226, 206],
  [194, 196],
  [150, 172],
  [92, 142],
  [0, 112],
  [86, 104],
  [112, 80],
  [106, 40],
  [96, 12],
  [0, 12],
];

const ROBOT: Vec2[] = [
  [0, 0],
  [160, 0],
  [160, 10],
  [115, 10],
  [115, 95],
  [145, 95],
  [145, 170],
  [205, 170],
  [205, 200],
  [145, 200],
  [145, 210],
  [110, 210],
  [110, 225],
  [130, 225],
  [130, 282],
  [30, 282],
  [30, 225],
  [50, 225],
  [50, 210],
  [15, 210],
  [15, 200],
  [-45, 200],
  [-45, 170],
  [15, 170],
  [15, 95],
  [45, 95],
  [45, 10],
  [0, 10],
];

function crenellated(W: number, H: number, m: number, d: number): Vec2[] {
  const pts: Vec2[] = [
    [0, 0],
    [W, 0],
    [W, H],
  ];
  let x = W;
  let up = true;
  while (x - m > 0.5) {
    x -= m;
    if (up) pts.push([x, H], [x, H - d]);
    else pts.push([x, H - d], [x, H]);
    up = !up;
  }
  pts.push([0, H]);
  // buang titik kembar
  return pts.filter((p, i) => i === 0 || p[0] !== pts[i - 1][0] || p[1] !== pts[i - 1][1]);
}

const CASTLE = crenellated(300, 160, 30, 24);

/* ------------------------------------------------------------------ */
/* Template berbasis siluet                                            */
/* ------------------------------------------------------------------ */

const PROFILE_TEMPLATES: Template[] = [
  profileTemplate({
    id: "pedang-ksatria",
    title: "Pedang Ksatria",
    category: "mainan",
    description: "Pedang kardus dengan pelindung tangan dan gagang. Tebalnya pas digenggam anak.",
    difficulty: "mudah",
    minutes: 15,
    age: 6,
    tags: ["pedang", "ksatria", "senjata mainan", "kostum"],
    pts: SWORD,
    sizeLabel: "Panjang pedang",
    depth: 14,
    depthLabel: "Tebal bilah",
    tab: 8,
    labels: { A: "Muka depan", B: "Muka belakang", strip: (i) => (i === 0 ? "Pangkal gagang" : `Tepi ${i + 1}`) },
    featured: true,
  }),
  profileTemplate({
    id: "kapak-viking",
    title: "Kapak Viking",
    category: "mainan",
    description: "Kapak bermata lebar dengan paku di belakang. Senjata andalan pelaut utara.",
    difficulty: "sedang",
    minutes: 18,
    age: 7,
    tags: ["kapak", "viking", "senjata mainan"],
    pts: AXE,
    sizeLabel: "Panjang gagang",
    depth: 16,
    depthLabel: "Tebal",
    tab: 8,
    labels: { A: "Muka depan", B: "Muka belakang" },
  }),
  profileTemplate({
    id: "palu-petir",
    title: "Palu Petir",
    category: "mainan",
    description: "Palu kotak bergagang pendek. Tambahkan logo petir di tab Desain.",
    difficulty: "mudah",
    minutes: 15,
    age: 6,
    tags: ["palu", "superhero", "senjata mainan"],
    pts: HAMMER,
    sizeLabel: "Tinggi palu",
    depth: 60,
    depthLabel: "Tebal kepala palu",
    tab: 10,
    labels: { A: "Muka depan", B: "Muka belakang" },
  }),
  profileTemplate({
    id: "tombak-spartan",
    title: "Tombak Spartan",
    category: "mainan",
    description: "Tombak panjang bermata daun. Ringan karena gagangnya ramping.",
    difficulty: "mudah",
    minutes: 12,
    age: 7,
    tags: ["tombak", "spartan", "senjata mainan"],
    pts: SPEAR,
    sizeLabel: "Panjang tombak",
    depth: 16,
    depthLabel: "Tebal",
    tab: 8,
  }),
  profileTemplate({
    id: "blaster-antariksa",
    title: "Blaster Antariksa",
    category: "mainan",
    description: "Senjata laser mainan ala film luar angkasa, lengkap dengan lubang bidik.",
    difficulty: "sedang",
    minutes: 20,
    age: 7,
    tags: ["luar angkasa", "laser", "senjata mainan"],
    pts: BLASTER,
    sizeLabel: "Panjang",
    depth: 34,
    depthLabel: "Tebal",
    tab: 10,
    holes: (k) => [circ(110 * k, 112 * k, 9 * k)],
  }),
  profileTemplate({
    id: "tank-baja",
    title: "Tank Baja",
    category: "mainan",
    description: "Tank dengan turret dan meriam panjang. Roda rantainya dilubangi agar terlihat nyata.",
    difficulty: "sedang",
    minutes: 30,
    age: 8,
    tags: ["tank", "militer", "kendaraan"],
    pts: TANK,
    sizeLabel: "Panjang",
    depth: 130,
    depthLabel: "Lebar badan",
    tab: 12,
    holes: (k) => [60, 105, 150, 195, 240].map((x) => circ(x * k, 28 * k, 13 * k)),
    labels: { A: "Sisi kiri", B: "Sisi kanan", strip: (i) => (i === 0 ? "Dasar rantai" : `Lambung ${i + 1}`) },
    featured: true,
  }),
  profileTemplate({
    id: "jet-tempur",
    title: "Jet Tempur",
    category: "mainan",
    description: "Pesawat jet bersayap delta yang dipajang mendatar. Cocok untuk digantung di kamar.",
    difficulty: "sedang",
    minutes: 20,
    age: 8,
    tags: ["pesawat", "jet", "kendaraan"],
    pts: JET,
    sizeLabel: "Panjang",
    depth: 18,
    depthLabel: "Tebal badan",
    tab: 8,
    labels: { A: "Atas", B: "Bawah", strip: (i) => (i === 0 ? "Ekor" : `Tepi ${i + 1}`) },
    rootPose: LAY_FLAT,
  }),
  profileTemplate({
    id: "kapal-bajak-laut",
    title: "Kapal Bajak Laut",
    category: "mainan",
    description: "Kapal dengan tiang dan layar segitiga. Ahoy, siap berlayar di bak mandi kering!",
    difficulty: "sedang",
    minutes: 25,
    age: 7,
    tags: ["bajak laut", "kapal", "petualangan"],
    pts: SHIP,
    sizeLabel: "Panjang",
    depth: 80,
    depthLabel: "Lebar lambung",
    tab: 10,
    holes: (k) => [60, 110, 160, 210].map((x) => circ(x * k, 50 * k, 9 * k)),
    labels: { A: "Lambung kiri", B: "Lambung kanan", strip: (i) => (i === 0 ? "Lunas" : `Sisi ${i + 1}`) },
  }),
  profileTemplate({
    id: "kereta-uap",
    title: "Kereta Api Uap",
    category: "mainan",
    description: "Lokomotif dengan cerobong, kabin masinis, dan enam roda yang terpasang otomatis.",
    difficulty: "sedang",
    minutes: 30,
    age: 7,
    tags: ["kereta", "lokomotif", "kendaraan"],
    pts: TRAIN,
    sizeLabel: "Panjang",
    depth: 90,
    depthLabel: "Lebar",
    tab: 10,
    holes: (k) => [rectPoints(22 * k, 120 * k, 50 * k, 36 * k)],
    wheels: { xs: [52, 132, 210], r: 26 },
  }),
  profileTemplate({
    id: "bus-sekolah",
    title: "Bus Sekolah",
    category: "mainan",
    description: "Bus panjang dengan deretan jendela dan pintu. Roda ikut terlipat ke tempatnya.",
    difficulty: "sedang",
    minutes: 28,
    age: 6,
    tags: ["bus", "kendaraan", "sekolah"],
    pts: BUS,
    sizeLabel: "Panjang",
    depth: 110,
    depthLabel: "Lebar",
    tab: 10,
    holes: (k) => [...[40, 105, 170, 235, 300].map((x) => rectPoints(x * k, 92 * k, 48 * k, 50 * k)), rectPoints(350 * k, 24 * k, 34 * k, 118 * k)],
    wheels: { xs: [80, 320], r: 30 },
  }),
  profileTemplate({
    id: "helikopter",
    title: "Helikopter Penyelamat",
    category: "mainan",
    description: "Helikopter dengan baling-baling, ekor, dan kokpit berjendela.",
    difficulty: "sulit",
    minutes: 30,
    age: 9,
    tags: ["helikopter", "penyelamat", "kendaraan"],
    pts: HELI,
    sizeLabel: "Panjang",
    depth: 70,
    depthLabel: "Lebar badan",
    tab: 8,
    holes: (k) => [circ(178 * k, 52 * k, 22 * k)],
  }),
  profileTemplate({
    id: "dino-trex",
    title: "Dinosaurus T-Rex",
    category: "mainan",
    description: "T-Rex berdiri di atas papan, lengkap dengan lengan kecil dan ekor panjang.",
    difficulty: "sulit",
    minutes: 35,
    age: 8,
    tags: ["dinosaurus", "hewan", "figur"],
    pts: TREX,
    sizeLabel: "Panjang",
    depth: 60,
    depthLabel: "Tebal badan",
    tab: 8,
    holes: (k) => [circ(232 * k, 186 * k, 6 * k)],
    featured: true,
  }),
  profileTemplate({
    id: "robot-pahlawan",
    title: "Robot Pahlawan",
    category: "mainan",
    description: "Figur robot berdiri dengan mata dan lampu dada yang dilubangi. Pasang logo di dadanya.",
    difficulty: "sedang",
    minutes: 25,
    age: 7,
    tags: ["robot", "figur", "superhero"],
    pts: ROBOT,
    sizeLabel: "Tinggi",
    depth: 50,
    depthLabel: "Tebal badan",
    tab: 8,
    labels: { A: "Depan", B: "Belakang" },
    holes: (k) => [circ(62 * k, 255 * k, 9 * k), circ(98 * k, 255 * k, 9 * k), rectPoints(60 * k, 140 * k, 40 * k, 24 * k)],
  }),
  profileTemplate({
    id: "benteng-kastil",
    title: "Benteng Kastil",
    category: "rumah",
    description: "Tembok benteng bergerigi dengan gerbang melengkung. Susun beberapa jadi kastil besar.",
    difficulty: "mudah",
    minutes: 18,
    age: 6,
    tags: ["kastil", "benteng", "ksatria"],
    pts: CASTLE,
    sizeLabel: "Lebar tembok",
    depth: 80,
    depthLabel: "Tebal tembok",
    tab: 10,
    labels: { A: "Muka depan", B: "Muka belakang", strip: (i) => (i === 0 ? "Alas" : `Tembok ${i + 1}`) },
    holes: (k) => [stadiumPoints([150 * k, 58 * k], 60 * k, 100 * k), rectPoints(50 * k, 95 * k, 20 * k, 34 * k), rectPoints(230 * k, 95 * k, 20 * k, 34 * k)],
  }),
];

/* ------------------------------------------------------------------ */
/* Kostum                                                              */
/* ------------------------------------------------------------------ */

function mirrorHalf(half: Vec2[], cx: number): Vec2[] {
  const left = [...half].reverse().map(([x, y]) => [2 * cx - x, y] as Vec2);
  return [...half, ...left.slice(1, -1)];
}

const COSTUMES: Template[] = [
  {
    id: "topeng-pahlawan",
    title: "Topeng Pahlawan",
    category: "kostum",
    description: "Topeng mata bertelinga runcing ala superhero, dengan sayap samping yang mengikuti kepala.",
    difficulty: "mudah",
    minutes: 8,
    age: 5,
    tags: ["jagoan", "topeng", "superhero", "kostum"],
    featured: true,
    params: [
      { key: "W", label: "Lebar topeng", kind: "mm", min: 140, max: 260, step: 1, default: 190 },
      { key: "wing", label: "Lebar sayap", kind: "mm", min: 20, max: 100, step: 1, default: 50 },
    ],
    build: (p) => {
      const W = num(p, "W");
      const k = W / 300;
      const half: Vec2[] = [
        [150, 30],
        [200, 16],
        [262, 0],
        [300, 52],
        [282, 96],
        [212, 104],
        [166, 86],
        [150, 98],
      ].map(([x, y]) => [x * k, y * k]);
      const pts = mirrorHalf(half, 150 * k);
      const nb = new NetBuilder();
      nb.add({
        id: "face",
        label: "Topeng",
        kind: "face",
        points: pts,
        holes: [stadiumPoints([92 * k, 58 * k], 66 * k, 32 * k), stadiumPoints([208 * k, 58 * k], 66 * k, 32 * k)],
      });
      const wing = num(p, "wing");
      const L = (a: number) => (len: number): Vec2[] => [
        [0, 0],
        [len, 0],
        [len * 0.75, a],
        [len * 0.25, a],
      ];
      nb.attachEdge("face", 3, L(wing), { id: "wingR", label: "Sayap kanan", angle: 40 });
      nb.attachEdge("face", pts.length - 4, L(wing), { id: "wingL", label: "Sayap kiri", angle: 40 });
      const net = nb.build(false);
      net.panels[0].rootPose = [-1, 0, 0, 0, 0, 0, -1, 0, 0, -1, 0, 0, W, 120, 0, 1];
      return net;
    },
  },
  {
    id: "helm-ksatria",
    title: "Helm Ksatria",
    category: "kostum",
    description: "Helm kotak dengan visor berbentuk T dan lubang napas. Bagian bawah terbuka untuk kepala.",
    difficulty: "sedang",
    minutes: 30,
    age: 7,
    tags: ["jagoan", "helm", "ksatria", "kostum"],
    featured: true,
    params: [
      { key: "W", label: "Lebar", kind: "mm", min: 160, max: 320, step: 1, default: 220 },
      { key: "H", label: "Tinggi", kind: "mm", min: 180, max: 360, step: 1, default: 260 },
      tabP(18),
    ],
    build: (p, c) => {
      const W = num(p, "W"),
        H = num(p, "H");
      const cx = W / 2;
      const sw = W * 0.6,
        sh = H * 0.07,
        vw = W * 0.1;
      const top = H * 0.42;
      const visor: Vec2[] = [
        [cx - sw / 2, top],
        [cx + sw / 2, top],
        [cx + sw / 2, top + sh],
        [cx + vw / 2, top + sh],
        [cx + vw / 2, top + H * 0.3],
        [cx - vw / 2, top + H * 0.3],
        [cx - vw / 2, top + sh],
        [cx - sw / 2, top + sh],
      ];
      const breath = (len: number) => {
        const out: Vec2[][] = [];
        for (let r = 0; r < 3; r++) for (let q = 0; q < 3; q++) out.push(circ(len * (0.36 + q * 0.14), H * (0.52 + r * 0.1), Math.min(len, H) * 0.025));
        return out;
      };
      const net = buildBox({
        W,
        D: W,
        H,
        tab: num(p, "tab"),
        lid: "open",
        t: c.t,
        compensate: c.compensate,
        holes: { front: [visor], left: breath(W), right: breath(W) },
        labels: { base: "Puncak helm", front: "Muka", back: "Belakang", left: "Pipi kiri", right: "Pipi kanan" },
      }).build(false);
      net.panels[0].rootPose = [-1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1, 0, W, H + c.t, 0, 1];
      return net;
    },
  },
  {
    id: "baju-zirah",
    title: "Baju Zirah",
    category: "kostum",
    description: "Pelindung dada dan punggung yang tersambung di bahu, dipakai seperti rompi.",
    difficulty: "sedang",
    minutes: 25,
    age: 6,
    tags: ["jagoan", "zirah", "armor", "ksatria", "kostum"],
    featured: true,
    params: [
      { key: "W", label: "Lebar badan", kind: "mm", min: 220, max: 420, step: 1, default: 300 },
      { key: "H", label: "Panjang badan", kind: "mm", min: 260, max: 520, step: 1, default: 380 },
      { key: "D", label: "Tebal badan", kind: "mm", min: 100, max: 260, step: 1, default: 170 },
      tabP(20),
    ],
    build: (p) => {
      const W = num(p, "W"),
        H = num(p, "H"),
        D = num(p, "D");
      const sh = W * 0.3;
      const neck = W * 0.07;
      const nb = new NetBuilder();
      const plate = (depthNeck: number): Vec2[] => [
        [0, 0],
        [sh, 0],
        [sh + neck, depthNeck],
        [W - sh - neck, depthNeck],
        [W - sh, 0],
        [W, 0],
        [W, H * 0.7],
        [W * 0.86, H],
        [W * 0.14, H],
        [0, H * 0.7],
      ];
      const front = plate(W * 0.16);
      nb.add({ id: "front", label: "Pelindung dada", kind: "face", points: front, holes: [circ(W / 2, H * 0.42, W * 0.08)] });
      const strap = (len: number): Vec2[] => [
        [0, 0],
        [len, 0],
        [len, D],
        [0, D],
      ];
      nb.attachEdge("front", 0, strap, { id: "strapL", label: "Tali bahu kiri" });
      nb.attachEdge("front", 4, strap, { id: "strapR", label: "Tali bahu kanan" });
      const L = nb.get("strapL").points;
      nb.attach("strapL", L[3], L[2], plate(W * 0.06), { id: "back", label: "Pelindung punggung" });
      nb.tryTab([["strapR", 2]], num(p, "tab"));
      const net = nb.build(false);
      net.panels[0].rootPose = FACE_FRONT;
      return net;
    },
  },
  {
    id: "mahkota-raja",
    title: "Mahkota Raja",
    category: "kostum",
    description: "Mahkota bergerigi dengan lubang permata di setiap sisi. Ukur lingkar kepala dulu.",
    difficulty: "mudah",
    minutes: 10,
    age: 5,
    tags: ["jagoan", "mahkota", "raja", "kostum"],
    params: [
      { key: "C", label: "Lingkar kepala", kind: "mm", min: 380, max: 620, step: 1, default: 520 },
      { key: "n", label: "Jumlah gerigi", kind: "count", min: 5, max: 12, step: 1, default: 8 },
      { key: "h", label: "Tinggi pita", kind: "mm", min: 30, max: 120, step: 1, default: 60 },
      { key: "pk", label: "Tinggi gerigi", kind: "mm", min: 20, max: 120, step: 1, default: 60 },
      tabP(15),
    ],
    build: (p) => {
      const n = num(p, "n"),
        h = num(p, "h"),
        pk = num(p, "pk");
      const s = num(p, "C") / n;
      const nb = new NetBuilder();
      for (let i = 0; i < n; i++) {
        const x = i * s;
        nb.add({
          id: `crown${i}`,
          label: `Gerigi ${i + 1}`,
          kind: "face",
          points: [
            [x, h],
            [x + s, h],
            [x + s, 0],
            [x + s / 2, -pk],
            [x, 0],
          ],
          holes: [circ(x + s / 2, h / 2, Math.min(s, h) * 0.18)],
          parent: i ? `crown${i - 1}` : undefined,
          hinge: i
            ? [
                [x, 0],
                [x, h],
              ]
            : undefined,
          angle: 360 / n,
        });
      }
      nb.tryTab([[`crown${n - 1}`, 1]], num(p, "tab"));
      const net = nb.build(false);
      net.panels[0].rootPose = STAND_UP;
      return net;
    },
  },
  {
    id: "pelindung-lengan",
    title: "Pelindung Lengan",
    category: "kostum",
    description: "Tabung segi delapan untuk lengan bawah, dengan celah ventilasi ala robot tempur.",
    difficulty: "mudah",
    minutes: 12,
    age: 6,
    tags: ["jagoan", "lengan", "gauntlet", "robot", "kostum"],
    params: [
      { key: "C", label: "Lingkar lengan", kind: "mm", min: 160, max: 360, step: 1, default: 240 },
      { key: "L", label: "Panjang", kind: "mm", min: 100, max: 320, step: 1, default: 200 },
      tabP(12),
    ],
    build: (p) => {
      const s = num(p, "C") / 8;
      const L = num(p, "L");
      const holes: Record<number, Vec2[][]> = {};
      for (let i = 1; i < 8; i += 2) holes[i] = [0.3, 0.5, 0.7].map((f) => stadiumPoints([s / 2, L * f], s * 0.5, Math.max(6, L * 0.05)));
      return buildProfile({ profile: regularPolygon(8, s), depth: L, tab: num(p, "tab"), root: "strip", sideA: false, sideB: false, stripHoles: holes, labels: { strip: (i) => `Sisi ${i + 1}` } }).build(false);
    },
  },
  {
    id: "perisai-ksatria",
    title: "Perisai Ksatria",
    category: "kostum",
    description: "Perisai berbentuk segitiga melengkung dengan bingkai tebal. Pasang logo keluarga di depannya.",
    difficulty: "mudah",
    minutes: 15,
    age: 6,
    tags: ["jagoan", "perisai", "ksatria", "kostum"],
    featured: true,
    params: [
      { key: "W", label: "Lebar", kind: "mm", min: 160, max: 420, step: 1, default: 260 },
      { key: "rim", label: "Tebal bingkai", kind: "mm", min: 12, max: 60, step: 1, default: 28 },
      tabP(10),
    ],
    build: (p) => {
      const W = num(p, "W");
      const k = W / 240;
      const shape: Vec2[] = (
        [
          [0, 0],
          [240, 0],
          [240, 120],
          [212, 200],
          [162, 256],
          [120, 284],
          [78, 256],
          [28, 200],
          [0, 120],
        ] as Vec2[]
      ).map(([x, y]) => [x * k, y * k]);
      const net = buildProfile({ profile: shape, depth: num(p, "rim"), tab: num(p, "tab"), root: "sideA", sideB: false, labels: { A: "Muka perisai", strip: (i) => `Bingkai ${i + 1}` } }).build(false);
      net.panels.find((q) => q.id === "sideA")!.rootPose = [1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1];
      return net;
    },
  },
];

export const JAGOAN: Template[] = [...PROFILE_TEMPLATES, ...COSTUMES];
