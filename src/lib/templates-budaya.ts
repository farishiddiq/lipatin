import { beam, block, cyl, ellipsoid, hull, lathe, loft, move, type P3, type Part, prism, pyramid, ring, rotate, slab, tube } from "./solid";
import { solid3d } from "./templates-3d";
import type { Template } from "./templates";

/*
 * Aset 3D bertema budaya: 20 khas Nusantara dan 20 Mesir kuno.
 * Semua dirakit dari solid low-poly lalu dibongkar otomatis jadi pola kardus.
 */

const both = (f: (s: 1 | -1) => Part[]): Part[] => [...f(1), ...f(-1)];
const X: P3 = [1, 0, 0];
const Y: P3 = [0, 1, 0];

/** Layar/sirip tipis dari garis luar 2D (x, y) setebal t di sekitar z. */
const sheet = (pts: [number, number][], z = 0, t = 3): Part => hull(pts.flatMap(([x, y]) => [[x, y, z - t / 2] as P3, [x, y, z + t / 2] as P3]));

/** Busur titik di bidang XY (derajat). */
const arcXY = (cx: number, cy: number, r: number, a0: number, a1: number, n = 8, z = 0): P3[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r, z] as P3;
  });

/** Kuda menghadap +X; o = titik tengah di antara kuku. */
function horse(o: P3, k = 1): Part[] {
  const p = (x: number, y: number, z: number): P3 => [o[0] + x * k, o[1] + y * k, o[2] + z * k];
  return [
    ellipsoid(p(0, 122, 0), 74 * k, 34 * k, 28 * k, 4, 8),
    tube([p(52, 134, 0), p(78, 168, 0), p(92, 196, 0)], [20 * k, 16 * k, 13 * k], [26 * k, 21 * k, 17 * k]),
    tube([p(88, 202, 0), p(116, 192, 0), p(138, 172, 0)], [13 * k, 11 * k, 8 * k], [16 * k, 13 * k, 10 * k]),
    ...both((s) => [hull([p(84, 210, s * 4), p(84, 210, s * 12), p(92, 210, s * 8), p(86, 230, s * 9)])]),
    ...[45, -45].flatMap((x) =>
      both((s) => [tube([p(x, 108, s * 14), p(x + 4, 60, s * 15), p(x, 10, s * 15)], [10 * k, 7 * k, 6 * k], [10 * k, 7 * k, 6 * k], 6), cyl(p(x, 0, s * 15), p(x, 10, s * 15), 8 * k, 6)]),
    ),
    tube([p(-70, 128, 0), p(-88, 98, 0), p(-92, 56, 0)], [6 * k, 8 * k, 5 * k]),
    tube([p(60, 160, 0), p(76, 190, 0), p(86, 206, 0)], [3 * k, 3 * k, 3 * k], [10 * k, 10 * k, 8 * k], 6),
  ];
}

/** Badan hewan berbaring (singa sphinx, anjing Anubis) menghadap +X. */
function lyingBody(o: P3, k = 1): Part[] {
  const p = (x: number, y: number, z: number): P3 => [o[0] + x * k, o[1] + y * k, o[2] + z * k];
  return [
    tube([p(0, 46, 0), p(60, 56, 0), p(130, 62, 0), p(185, 66, 0)], [38 * k, 44 * k, 42 * k, 38 * k], [36 * k, 46 * k, 50 * k, 48 * k], 10),
    ...both((s) => [
      ellipsoid(p(30, 40, s * 30), 44 * k, 36 * k, 20 * k, 4, 8),
      block(p(62, 8, s * 40), 60 * k, 16 * k, 18 * k, 4 * k),
      tube([p(176, 58, s * 24), p(196, 16, s * 24)], [14 * k, 12 * k], [16 * k, 13 * k]),
      block(p(245, 9, s * 24), 110 * k, 18 * k, 26 * k, 5 * k),
    ]),
    tube([p(-6, 30, 20), p(30, 12, 46), p(110, 8, 52), p(150, 8, 50)], 5 * k, 5 * k, 6),
  ];
}

/* ================================================================== */
/* NUSANTARA                                                           */
/* ================================================================== */

function rumahGadang(): Part[] {
  const sec = (x: number, ridge: number, eave: number, hw: number): P3[] => [
    [x, eave, -hw],
    [x, ridge, 0],
    [x, eave, hw],
  ];
  const cross = (z: number, ridge: number, eave: number, hw: number): P3[] => [
    [180 - hw, eave, z],
    [180, ridge, z],
    [180 + hw, eave, z],
  ];
  return [
    ...[40, 140, 220, 320].flatMap((x) => [-50, 50].map((z) => cyl([x, 0, z], [x, 52, z], 6))),
    slab([180, 50, 0], 320, 110, 340, 130, 70),
    loft([sec(-30, 300, 262, 6), sec(20, 232, 150, 52), sec(90, 192, 124, 76), sec(180, 178, 120, 80), sec(270, 192, 124, 76), sec(340, 232, 150, 52), sec(390, 300, 262, 6)]),
    loft([cross(0, 176, 128, 45), cross(70, 202, 152, 36), cross(122, 262, 234, 6)]),
    loft([cross(0, 176, 128, 45), cross(-70, 202, 152, 36), cross(-122, 262, 234, 6)]),
    hull([
      [160, 0, 112],
      [200, 0, 112],
      [160, 0, 66],
      [200, 0, 66],
      [160, 50, 66],
      [200, 50, 66],
    ]),
  ];
}

function joglo(): Part[] {
  const rect = (y: number, x0: number, x1: number, hz: number): P3[] => [x0, x1].flatMap((x) => [-hz, hz].map((z) => [x, y, z] as P3));
  return [
    block([150, 10, 0], 300, 20, 240, 2),
    block([150, 70, 0], 210, 100, 150),
    ...[30, 270].flatMap((x) => [-100, 100].map((z) => cyl([x, 20, z], [x, 122, z], 6))),
    hull([...rect(120, 0, 300, 125), ...rect(158, 75, 225, 60)]),
    hull([...rect(156, 95, 205, 50), ...rect(245, 130, 170, 3)]),
    block([150, 249, 0], 56, 8, 10, 2),
    ...[-1, 1].map((s) => pyramid([150 + s * 30, 251, 0], 10, 10, 16)),
  ];
}

function honai(): Part[] {
  return [
    cyl([0, 0, 0], [0, 72, 0], 90, 14),
    lathe(
      [
        [104, 60],
        [100, 88],
        [82, 124],
        [52, 154],
        [22, 172],
        [0, 178],
      ],
      14,
    ),
    lathe(
      [
        [8, 174],
        [6, 190],
        [0, 198],
      ],
      6,
    ),
    block([0, 30, 92], 32, 56, 10),
  ];
}

function tongkonan(): Part[] {
  const sec = (x: number, ridge: number, eave: number, hw: number): P3[] => {
    const mid = eave + (ridge - eave) * 0.65;
    return [
      [x, eave, -hw],
      [x, mid, -hw * 0.6],
      [x, ridge, 0],
      [x, mid, hw * 0.6],
      [x, eave, hw],
    ];
  };
  return [
    ...[80, 150, 230, 300].flatMap((x) => [-45, 45].map((z) => cyl([x, 0, z], [x, 62, z], 7))),
    slab([190, 60, 0], 230, 100, 250, 116, 80),
    loft([sec(-40, 350, 322, 14), sec(10, 262, 212, 56), sec(90, 214, 160, 82), sec(190, 206, 152, 86), sec(290, 214, 160, 82), sec(370, 262, 212, 56), sec(420, 350, 322, 14)]),
    cyl([20, 0, 0], [20, 240, 0], 7),
    cyl([360, 0, 0], [360, 240, 0], 7),
    ...[130, 160, 190].flatMap((h) => both((s) => [beam([20, h, 0], [34, h + 14, s * 30], 5, 5)])),
  ];
}

function borobudur(): Part[] {
  const parts: Part[] = [];
  let y = 0;
  for (const s of [360, 316, 272, 228, 184]) {
    parts.push(block([0, y + 11, 0], s, 22, s, 2));
    y += 22;
  }
  const stupa = (x: number, yy: number, z: number) =>
    lathe(
      [
        [9, 0],
        [9, 8],
        [5, 20],
        [0, 30],
      ],
      6,
      [x, yy, z],
    );
  const rings: [number, number, number][] = [
    [86, 8, 78],
    [70, 6, 62],
    [54, 0, 0],
  ];
  for (const [r, count, rad] of rings) {
    parts.push(cyl([0, y, 0], [0, y + 12, 0], r, 16));
    y += 12;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      parts.push(stupa(Math.cos(a) * rad, y, Math.sin(a) * rad));
    }
  }
  parts.push(
    lathe(
      [
        [42, 0],
        [44, 12],
        [40, 40],
        [28, 60],
        [14, 70],
        [10, 74],
        [10, 86],
        [6, 92],
        [0, 104],
      ],
      12,
      [0, y, 0],
    ),
  );
  return parts;
}

function prambanan(): Part[] {
  const ratna = (x: number, y: number, z: number, k = 1) =>
    lathe(
      [
        [7 * k, 0],
        [8 * k, 6 * k],
        [5 * k, 14 * k],
        [2 * k, 22 * k],
        [0, 26 * k],
      ],
      6,
      [x, y, z],
    );
  const parts: Part[] = [block([0, 15, 0], 230, 30, 230, 2), block([0, 42, 0], 176, 24, 176, 2), block([0, 100, 0], 112, 92, 112, 2)];
  let y = 146;
  [124, 104, 86, 68, 52].forEach((s, i) => {
    parts.push(block([0, y + 12, 0], s, 24, s, 2));
    if (i < 4) for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(ratna((sx * s) / 2.3, y + 24, (sz * s) / 2.3));
    y += 24;
  });
  parts.push(
    lathe(
      [
        [22, 0],
        [24, 10],
        [18, 28],
        [10, 44],
        [5, 58],
        [0, 74],
      ],
      10,
      [0, y, 0],
    ),
    hull([
      [-20, 0, 150],
      [20, 0, 150],
      [-20, 0, 110],
      [20, 0, 110],
      [-20, 54, 110],
      [20, 54, 110],
    ]),
  );
  return parts;
}

function monas(): Part[] {
  return [
    block([0, 6, 0], 260, 12, 260, 2),
    block([0, 22, 0], 196, 20, 196, 2),
    lathe(
      [
        [44, 32],
        [58, 44],
        [104, 62],
        [104, 72],
        [0, 72],
      ],
      16,
    ),
    slab([0, 72, 0], 46, 46, 28, 28, 290),
    lathe(
      [
        [14, 362],
        [19, 372],
        [12, 378],
        [0, 378],
      ],
      10,
    ),
    lathe(
      [
        [12, 376],
        [14, 392],
        [9, 410],
        [12, 418],
        [5, 432],
        [0, 448],
      ],
      8,
    ),
  ];
}

function lumbung(): Part[] {
  return [
    ...[-40, 40].flatMap((x) => [-30, 30].flatMap((z) => [cyl([x, 0, z], [x, 80, z], 6), cyl([x, 80, z], [x, 86, z], 16, 10)])),
    block([0, 92, 0], 120, 10, 90, 2),
    block([0, 110, 0], 70, 30, 56),
    lathe(
      [
        [50, 100],
        [78, 118],
        [92, 150],
        [86, 190],
        [62, 226],
        [30, 250],
        [0, 262],
      ],
      12,
      [0, 0, 0],
      1.25,
      1,
    ),
  ];
}

function bajaj(): Part[] {
  return [
    hull([
      [20, 25, -55],
      [20, 25, 55],
      [225, 25, -40],
      [225, 25, 40],
      [60, 150, -50],
      [60, 150, 50],
      [200, 150, -46],
      [200, 150, 46],
      [250, 45, -30],
      [250, 45, 30],
      [245, 118, -34],
      [245, 118, 34],
    ]),
    block([135, 156, 0], 180, 8, 118, 3),
    block([22, 64, 0], 30, 54, 100, 6),
    cyl([238, 24, -9], [238, 24, 9], 24, 10),
    ...both((s) => [cyl([45, 24, s * 56], [45, 24, s * 74], 24, 10)]),
    cyl([250, 92, 0], [258, 92, 0], 9, 8),
  ];
}

function becak(): Part[] {
  const outer = arcXY(200, 110, 62, 20, 125, 8);
  const inner = arcXY(200, 110, 56, 125, 20, 8);
  return [
    ...both((s) => [cyl([240, 32, s * 52], [240, 32, s * 60], 32, 12)]),
    cyl([40, 32, -4], [40, 32, 4], 32, 12),
    hull([
      [200, 40, -46],
      [200, 40, 46],
      [290, 40, -46],
      [290, 40, 46],
      [290, 62, -46],
      [290, 62, 46],
      [175, 62, -46],
      [175, 62, 46],
      [172, 140, -46],
      [172, 140, 46],
      [190, 140, -46],
      [190, 140, 46],
    ]),
    prism(
      [...outer, ...inner].map((q) => [q[0], q[1]] as [number, number]),
      "xy",
      -48,
      48,
    ),
    beam([175, 60, 0], [40, 32, 0], 8, 8),
    beam([60, 32, 0], [70, 110, 0], 6, 6),
    block([70, 114, 0], 36, 8, 30, 2),
    beam([160, 128, 0], [172, 100, 0], 5, 5),
    beam([158, 132, -32], [158, 132, 32], 5, 5),
  ];
}

function pinisi(): Part[] {
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
  return [
    loft([sec(0, 46, 112, 40), sec(30, 58, 104, 22), sec(150, 64, 92, 10), sec(280, 56, 94, 14), sec(350, 30, 104, 30), sec(390, 6, 114, 72)]),
    block([45, 124, 0], 70, 26, 90, 3),
    cyl([370, 108, 0], [470, 128, 0], 5),
    cyl([150, 92, 0], [150, 330, 0], 5),
    cyl([280, 92, 0], [280, 300, 0], 5),
    sheet([
      [145, 140],
      [70, 140],
      [80, 280],
      [145, 310],
    ]),
    sheet([
      [275, 118],
      [195, 118],
      [205, 255],
      [275, 285],
    ]),
    sheet(
      [
        [150, 318],
        [150, 336],
        [196, 300],
      ],
      0,
    ),
    sheet(
      [
        [285, 292],
        [460, 128],
        [400, 122],
      ],
      4,
    ),
    sheet(
      [
        [285, 240],
        [420, 124],
        [360, 120],
      ],
      -4,
    ),
    sheet(
      [
        [285, 196],
        [380, 118],
        [330, 116],
      ],
      8,
    ),
  ];
}

function bedug(): Part[] {
  const drum = move(
    rotate(
      lathe(
        [
          [64, 0],
          [78, 30],
          [80, 90],
          [78, 150],
          [64, 180],
        ],
        14,
      ),
      "z",
      90,
    ),
    [90, 130, 0],
  );
  return [
    drum,
    ...both((s) => [beam([s * 60, 0, -62], [s * 60, 74, -12], 10, 10), beam([s * 60, 0, 62], [s * 60, 74, 12], 10, 10), beam([s * 60, 40, -46], [s * 60, 40, 46], 8, 8)]),
    beam([-80, 5, -62], [80, 5, -62], 10, 10),
    beam([-80, 5, 62], [80, 5, 62], 10, 10),
    cyl([100, 6, 100], [20, 6, 100], 4, 6),
    ellipsoid([14, 8, 100], 9, 8, 9, 3, 6),
  ];
}

function gong(): Part[] {
  const g = move(
    rotate(
      lathe(
        [
          [95, 0],
          [95, 24],
          [34, 28],
          [24, 36],
          [0, 40],
        ],
        16,
      ),
      "x",
      90,
    ),
    [0, 150, -10],
  );
  return [
    g,
    ...both((s) => [
      block([s * 125, 130, 0], 22, 260, 26, 3),
      block([s * 125, 8, 0], 70, 16, 50, 3),
      slab([s * 160, 262, 0], 22, 30, 8, 22, 40, s * 14, 0),
      beam([s * 40, 262, 0], [s * 32, 236, 8], 4, 4),
    ]),
    block([0, 270, 0], 300, 20, 30, 4),
    cyl([150, 14, 60], [100, 120, 60], 4, 6),
    ellipsoid([98, 128, 60], 12, 12, 12, 3, 8),
  ];
}

function angklung(): Part[] {
  return [
    cyl([-90, 14, 0], [90, 14, 0], 9, 8),
    ...both((s) => [cyl([s * 85, 0, 0], [s * 85, 230, 0], 7, 8)]),
    cyl([-92, 228, 0], [92, 228, 0], 6, 8),
    cyl([-92, 160, 0], [92, 160, 0], 5, 8),
    cyl([-30, 22, 0], [-30, 190, 0], 15, 10),
    block([-30, 214, -9], 22, 50, 6, 1),
    cyl([35, 22, 0], [35, 120, 0], 12, 10),
    block([35, 140, -7], 18, 40, 5, 1),
  ];
}

function keris(): Part[] {
  const secs: P3[][] = [];
  for (let i = 0; i <= 12; i++) {
    const y = 40 + i * 25;
    const w = 38 - (24 * i) / 12;
    const t = 7 - (3 * i) / 12;
    const x = 8 * Math.sin((i * Math.PI * 5) / 12) * (1 - i / 16);
    secs.push([
      [x - w / 2, y, 0],
      [x, y, -t / 2],
      [x + w / 2, y, 0],
      [x, y, t / 2],
    ]);
  }
  secs.push([[2, 376, 0]]);
  return [
    loft(secs),
    hull([
      [-30, 28, -6],
      [-30, 28, 6],
      [38, 28, -5],
      [38, 28, 5],
      [-26, 40, -6],
      [-26, 40, 6],
      [30, 40, -5],
      [30, 40, 5],
      [46, 34, 0],
    ]),
    cyl([0, 22, 0], [0, 30, 0], 13, 10),
    tube(
      [
        [0, 24, 0],
        [2, 0, 0],
        [10, -30, 0],
        [18, -55, 0],
        [10, -72, 0],
      ],
      [11, 12, 12, 13, 9],
    ),
    cyl([10, -90, 0], [10, -72, 0], 6),
    block([70, -96, 0], 260, 12, 70, 3),
    slab([140, -90, 0], 20, 12, 34, 12, 400),
    hull([
      [86, 310, -10],
      [86, 310, 10],
      [196, 316, -10],
      [196, 316, 10],
      [96, 334, -14],
      [96, 334, 14],
      [186, 344, -12],
      [186, 344, 12],
      [140, 352, 0],
      [76, 326, 0],
      [212, 334, 0],
    ]),
  ];
}

function ondel(): Part[] {
  return [
    lathe(
      [
        [86, 0],
        [88, 14],
        [72, 110],
        [58, 190],
        [64, 214],
        [68, 232],
        [40, 250],
        [0, 252],
      ],
      12,
    ),
    cyl([0, 248, 0], [0, 272, 0], 18, 10),
    ellipsoid([0, 312, 0], 46, 54, 46, 5, 12),
    hull([
      [0, 318, 40],
      [-8, 300, 44],
      [8, 300, 44],
      [0, 302, 58],
    ]),
    ...both((s) => [ellipsoid([s * 17, 326, 40], 9, 7, 7, 3, 8), tube([[s * 66, 232, 0], [s * 80, 180, 10], [s * 78, 120, 20]], [11, 10, 9]), ellipsoid([s * 78, 112, 22], 11, 12, 11, 3, 8)]),
    block([0, 287, 44], 24, 5, 6, 1),
    cyl([0, 352, 0], [0, 366, 0], 42, 12),
    ...Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2;
      return beam([Math.cos(a) * 28, 366, Math.sin(a) * 28], [Math.cos(a) * 66, 430, Math.sin(a) * 66], 5, 5);
    }),
  ];
}

function tumpeng(): Part[] {
  const sides: Part[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const x = Math.cos(a) * 118,
      z = Math.sin(a) * 118;
    if (i % 4 === 0) sides.push(ellipsoid([x, 25, z], 16, 13, 12, 3, 8));
    else if (i % 4 === 1) sides.push(ellipsoid([x, 24, z], 24, 12, 16, 3, 8), cyl([x + 20, 22, z], [x + 36, 22, z], 4, 6));
    else if (i % 4 === 2) sides.push(block([x, 19, z], 34, 12, 22, 1));
    else sides.push(cyl([x, 12, z], [x, 25, z], 14, 8));
  }
  return [
    lathe(
      [
        [160, 0],
        [168, 6],
        [168, 12],
        [0, 12],
      ],
      18,
    ),
    lathe(
      [
        [72, 12],
        [62, 60],
        [42, 128],
        [18, 178],
        [0, 192],
      ],
      14,
    ),
    lathe(
      [
        [9, 182],
        [7, 200],
        [0, 216],
      ],
      6,
    ),
    ...sides,
  ];
}

function delman(): Part[] {
  const outer = arcXY(0, 150, 80, 15, 165, 10).map((q) => [q[0], q[1]] as [number, number]);
  const inner = arcXY(0, 150, 74, 165, 15, 10).map((q) => [q[0], q[1]] as [number, number]);
  return [
    ...horse([330, 0, 0]),
    ...both((s) => [cyl([110, 62, s * 70], [110, 62, s * 78], 62, 12), cyl([110, 62, s * 78], [110, 62, s * 86], 12, 6), beam([200, 95, s * 40], [300, 118, s * 26], 6, 6)]),
    cyl([110, 62, -70], [110, 62, 70], 5),
    block([120, 105, 0], 170, 40, 128, 3),
    block([45, 145, 0], 10, 50, 128, 2),
    prism([...outer, ...inner], "zy", 40, 200),
    ...[50, 190].flatMap((x) => both((s) => [beam([x, 125, s * 60], [x, 180, s * 62], 5, 5)])),
    block([215, 70, 0], 30, 6, 60),
  ];
}

function komodo(): Part[] {
  return [
    tube(
      [
        [-210, 14, 38],
        [-160, 16, 30],
        [-100, 20, 12],
        [-40, 26, 0],
        [20, 30, 0],
        [80, 30, -4],
        [130, 28, -8],
        [165, 28, -12],
      ],
      [2, 7, 13, 22, 28, 26, 18, 14],
      [2, 6, 11, 18, 24, 22, 15, 12],
    ),
    hull(
      [
        [158, 18, 15],
        [158, 40, 15],
        [200, 20, 12],
        [200, 34, 12],
        [238, 20, 8],
        [238, 28, 7],
      ].flatMap(([x, y, z]) => [[x, y, z - 12] as P3, [x, y, -z - 12] as P3]),
    ),
    beam([236, 22, -12], [258, 22, -12], 3, 2),
    ...both((s) => [
      beam([110, 26, s * 18 - 6], [120, 22, s * 52 - 6], 12, 12),
      beam([120, 22, s * 52 - 6], [124, 4, s * 56 - 6], 10, 10),
      block([132, 3, s * 58 - 6], 26, 6, 20, 2),
      beam([-40, 24, s * 20], [-52, 20, s * 56], 13, 13),
      beam([-52, 20, s * 56], [-48, 4, s * 60], 10, 10),
      block([-40, 3, s * 62], 28, 6, 22, 2),
    ]),
  ];
}

function garuda(): Part[] {
  return [
    block([0, 10, 0], 220, 20, 90, 3),
    prism(
      [
        [-110, 70],
        [-60, 48],
        [0, 40],
        [60, 48],
        [110, 70],
        [110, 54],
        [60, 32],
        [0, 24],
        [-60, 32],
        [-110, 54],
      ],
      "xy",
      -6,
      6,
    ),
    ...both((s) => [
      beam([s * 14, 112, 0], [s * 22, 64, 4], 9, 9),
      block([s * 24, 58, 8], 18, 8, 16, 2),
      sheet([
        [s * 30, 232],
        [s * 30, 150],
        [s * 120, 300],
        [s * 205, 332],
        [s * 212, 292],
        [s * 150, 215],
      ], 0, 8),
      beam([s * 168, 250, 0], [s * 236, 262, 0], 12, 5),
      beam([s * 184, 276, 0], [s * 246, 300, 0], 12, 5),
      beam([s * 196, 302, 0], [s * 242, 340, 0], 12, 5),
      beam([s * 158, 230, 0], [s * 222, 226, 0], 12, 5),
    ]),
    ellipsoid([0, 165, 0], 40, 66, 34, 5, 10),
    hull(
      [
        [-34, 200],
        [34, 200],
        [34, 160],
        [0, 120],
        [-34, 160],
      ].flatMap(([x, y]) => [[x, y, 30] as P3, [x, y, 42] as P3]),
    ),
    cyl([0, 220, 0], [0, 245, 4], 16, 8, 13),
    ellipsoid([4, 260, 6], 24, 22, 22, 4, 8),
    hull([
      [22, 264, 6],
      [22, 250, 6],
      [18, 257, -4],
      [18, 257, 16],
      [48, 248, 6],
    ]),
    beam([-14, 272, 4], [-36, 296, 4], 6, 4),
    beam([-20, 262, 4], [-46, 280, 4], 6, 4),
    beam([-6, 280, 4], [-20, 306, 4], 6, 4),
    sheet(
      [
        [0, 120],
        [-52, 72],
        [-20, 60],
        [0, 56],
        [20, 60],
        [52, 72],
      ],
      0,
      8,
    ),
  ];
}

/* ================================================================== */
/* MESIR KUNO                                                          */
/* ================================================================== */

function giza(): Part[] {
  return [
    block([0, 4, 0], 520, 8, 360, 2),
    pyramid([-130, 8, 20], 230, 230, 146),
    pyramid([-130, 138, 20], 24, 24, 18),
    pyramid([80, 8, -50], 180, 180, 114),
    pyramid([205, 8, 100], 100, 100, 64),
  ];
}

function djoser(): Part[] {
  const parts: Part[] = [block([0, 4, 0], 340, 8, 280, 2)];
  let y = 8;
  for (let i = 0; i < 6; i++) {
    const w = 280 - i * 30,
      d = 220 - i * 26;
    parts.push(slab([0, y, 0], w, d, w - 14, d - 14, 32));
    y += 32;
  }
  return parts;
}

function sphinx(): Part[] {
  return [
    block([110, -6, 0], 330, 12, 140, 2),
    ...lyingBody([0, 0, 0]),
    tube(
      [
        [180, 90, 0],
        [205, 130, 0],
      ],
      22,
      24,
    ),
    ellipsoid([214, 150, 0], 30, 34, 28, 4, 10),
    hull(
      [
        [200, 186, 20],
        [220, 186, 16],
        [195, 150, 42],
        [210, 150, 42],
        [228, 100, 34],
        [236, 100, 26],
        [170, 130, 30],
        [170, 170, 20],
      ].flatMap(([x, y, z]) => [[x, y, z] as P3, [x, y, -z] as P3]),
    ),
    cyl([236, 118, 0], [238, 94, 0], 5, 6),
  ];
}

function obelisk(): Part[] {
  return [block([0, 10, 0], 110, 20, 110, 2), block([0, 32, 0], 80, 24, 80, 2), slab([0, 44, 0], 44, 44, 30, 30, 360), pyramid([0, 404, 0], 30, 30, 30)];
}

function karnak(): Part[] {
  const col = (x: number, z: number): Part[] => [
    lathe(
      [
        [28, 12],
        [28, 22],
        [20, 24],
        [20, 212],
        [34, 246],
        [0, 250],
      ],
      8,
      [x, 0, z],
    ),
    block([x, 258, z], 48, 16, 48),
  ];
  return [
    block([0, 6, 0], 360, 12, 200, 2),
    ...[-120, 0, 120].flatMap((x) => [-55, 55].flatMap((z) => col(x, z))),
    block([0, 276, -55], 300, 20, 52),
    block([0, 276, 55], 300, 20, 52),
    block([0, 292, 0], 320, 12, 180, 2),
  ];
}

function sarkofagus(): Part[] {
  const S = [
    [0, 36, 28],
    [40, 32, 26],
    [150, 48, 34],
    [230, 56, 40],
    [320, 62, 44],
    [345, 44, 38],
    [392, 46, 44],
    [420, 30, 36],
  ];
  return [
    block([210, 7, 0], 460, 14, 150, 2),
    loft(S.map(([x, w, h]) => ring([x, 14 + h, 0], X, w, h, 10))),
    ...both((s) => [
      hull([
        [348, 92, s * 30],
        [350, 40, s * 52],
        [405, 40, s * 50],
        [400, 100, s * 36],
        [380, 60, s * 58],
      ]),
      beam([288, 102, s * 42], [332, 106, -s * 22], 10, 8),
      beam([320, 110, s * 18], [262, 110, s * 46], 4, 4),
    ]),
    ellipsoid([395, 100, 0], 28, 10, 26, 3, 8),
    tube(
      [
        [372, 96, 0],
        [352, 99, 0],
      ],
      5,
    ),
  ];
}

function topengTut(): Part[] {
  const nemes: P3[] = [
    [0, 242, -14],
    [0, 195, -62],
    [0, 125, -58],
    ...(
      [
        [30, 235, -10],
        [58, 205, -4],
        [64, 170, 4],
        [52, 205, -48],
        [40, 125, -50],
        [74, 150, 12],
        [70, 70, 18],
        [46, 70, 24],
        [50, 150, 20],
      ] as P3[]
    ).flatMap(([x, y, z]) => [[x, y, z] as P3, [-x, y, z] as P3]),
  ];
  return [
    lathe(
      [
        [1, 0],
        [0.92, 55],
        [0.55, 75],
        [0, 78],
      ],
      12,
      [0, 0, 0],
      120,
      62,
    ),
    cyl([0, 70, 0], [0, 112, 0], 30, 10),
    hull(nemes),
    ellipsoid([0, 165, 22], 42, 56, 40, 5, 10),
    tube(
      [
        [0, 112, 52],
        [0, 88, 58],
        [0, 70, 60],
      ],
      [8, 8, 7],
      [8, 8, 7],
      6,
    ),
    beam([0, 212, 50], [0, 230, 44], 6, 6),
  ];
}

function bastet(): Part[] {
  return [
    block([0, 10, 0], 150, 20, 190, 3),
    ellipsoid([0, 70, -25], 52, 52, 60, 4, 10),
    ellipsoid([0, 145, 12], 34, 70, 34, 4, 10),
    ...both((s) => [
      cyl([s * 16, 20, 40], [s * 14, 120, 26], 9, 8, 10),
      ellipsoid([s * 16, 24, 46], 11, 6, 14, 3, 6),
      hull([
        [s * 8, 250, 18],
        [s * 26, 250, 10],
        [s * 20, 250, 30],
        [s * 22, 286, 18],
      ]),
    ]),
    cyl([0, 198, 18], [0, 206, 18], 26, 10),
    ellipsoid([0, 232, 22], 30, 28, 30, 4, 10),
    ellipsoid([0, 224, 48], 14, 10, 10, 3, 8),
    tube(
      [
        [0, 30, -80],
        [40, 24, -60],
        [56, 24, -10],
        [50, 24, 40],
      ],
      6,
      6,
      6,
    ),
  ];
}

function anubis(): Part[] {
  const k = 0.85;
  const o: P3 = [-10, 122, 0];
  const p = (x: number, y: number, z: number): P3 => [o[0] + x * k, o[1] + y * k, o[2] + z * k];
  return [
    block([100, 55, 0], 300, 110, 120, 3),
    slab([100, 110, 0], 300, 120, 316, 136, 12),
    ...lyingBody(o, k),
    tube([p(180, 90, 0), p(200, 135, 0)], 18 * k, 20 * k),
    ellipsoid(p(205, 148, 0), 24 * k, 22 * k, 20 * k, 4, 8),
    hull([p(220, 152, 10), p(220, 152, -10), p(220, 136, 10), p(220, 136, -10), p(264, 142, 5), p(264, 142, -5), p(264, 134, 5), p(264, 134, -5)]),
    ...both((s) => [hull([p(198, 162, s * 6), p(198, 162, s * 18), p(212, 162, s * 12), p(200, 206, s * 13)])]),
    cyl(p(186, 104, 0), p(192, 116, 0), 24 * k, 10),
  ];
}

function kapalNil(): Part[] {
  const path: P3[] = [
    [0, 150, 0],
    [20, 110, 0],
    [60, 62, 0],
    [130, 40, 0],
    [220, 38, 0],
    [300, 52, 0],
    [360, 90, 0],
    [392, 140, 0],
    [400, 165, 0],
  ];
  return [
    tube(path, [4, 12, 26, 40, 42, 38, 24, 10, 4], [4, 10, 18, 22, 22, 20, 16, 8, 4], 10),
    lathe(
      [
        [2, 0],
        [12, 14],
        [0, 18],
      ],
      8,
      [0, 150, 0],
    ),
    lathe(
      [
        [2, 0],
        [12, 14],
        [0, 18],
      ],
      8,
      [400, 165, 0],
    ),
    block([210, 64, 0], 220, 6, 60),
    block([180, 94, 0], 80, 56, 46, 2),
    slab([180, 122, 0], 80, 46, 92, 56, 6),
    ...both((s) => [beam([40, 120, s * 24], [10, 40, s * 44], 5, 5), block([12, 46, s * 46], 10, 40, 4, 1)]),
    cyl([262, 66, 0], [262, 262, 0], 4, 6),
    hull([-70, 70].flatMap((z) => [130, 250].flatMap((y) => [[260.5, y, z] as P3, [263.5, y, z] as P3]))),
    beam([262, 253, -76], [262, 253, 76], 5, 5),
    beam([262, 127, -76], [262, 127, 76], 5, 5),
  ];
}

function keretaPerang(): Part[] {
  const front = arcXY(100, 0, 64, -90, 90, 10).map(([x, y]) => [x, 97, y] as P3);
  return [
    ...horse([330, 0, 0]),
    hull([...[70, 76].flatMap((y) => [[100, y, -46] as P3, [100, y, 46] as P3, ...arcXY(100, 0, 66, -90, 90, 8).map(([x, z]) => [x, y, z] as P3)])]),
    tube(front, 2, 22, 6),
    cyl([100, 55, -70], [100, 55, 70], 5),
    ...both((s) => [cyl([100, 55, s * 66], [100, 55, s * 74], 55, 12), cyl([100, 55, s * 74], [100, 55, s * 82], 10, 8)]),
    beam([160, 72, 0], [372, 150, 0], 7, 7),
    beam([372, 156, -34], [372, 156, 34], 6, 6),
  ];
}

function unta(): Part[] {
  return [
    ellipsoid([0, 190, 0], 85, 40, 34, 4, 10),
    lathe(
      [
        [50, 0],
        [42, 26],
        [22, 46],
        [0, 52],
      ],
      10,
      [0, 214, 0],
      1.1,
      0.8,
    ),
    ...[60, -60].flatMap((x) =>
      both((s) => [
        tube(
          [
            [x, 178, s * 20],
            [x + 4, 110, s * 22],
            [x, 60, s * 22],
            [x + 2, 10, s * 22],
          ],
          [11, 9, 8, 7],
        ),
        ellipsoid([x + 4, 5, s * 22], 12, 5, 10, 3, 6),
      ]),
    ),
    tube(
      [
        [72, 200, 0],
        [110, 186, 0],
        [140, 200, 0],
        [155, 250, 0],
        [165, 285, 0],
      ],
      [18, 16, 14, 13, 12],
      [22, 18, 16, 14, 13],
    ),
    tube(
      [
        [160, 290, 0],
        [186, 292, 0],
        [212, 284, 0],
      ],
      [13, 11, 8],
      [15, 12, 9],
    ),
    ...both((s) => [hull([[156, 302, s * 6], [162, 302, s * 14], [152, 302, s * 12], [156, 314, s * 12]])]),
    tube(
      [
        [-84, 195, 0],
        [-96, 160, 0],
        [-98, 130, 0],
      ],
      [5, 4, 4],
    ),
  ];
}

function ankh(): Part[] {
  const loop: P3[] = Array.from({ length: 16 }, (_, i) => {
    const a = -Math.PI / 2 + (i / 16) * Math.PI * 2;
    return [Math.cos(a) * 52, 250 + Math.sin(a) * 70, 0] as P3;
  });
  return [
    block([0, 10, 0], 110, 20, 70, 3),
    slab([0, 20, 0], 52, 26, 30, 26, 140),
    block([0, 172, 0], 160, 30, 26, 4),
    ...both((s) =>
      [
        hull(
          [
            [s * 76, 157],
            [s * 76, 187],
            [s * 100, 148],
            [s * 100, 196],
          ].flatMap(([x, y]) => [[x, y, -13] as P3, [x, y, 13] as P3]),
        ),
      ],
    ),
    tube(loop, 13, 12, 8, true),
  ];
}

function kanopik(): Part[] {
  const jar = (x: number, z: number) =>
    lathe(
      [
        [24, 20],
        [34, 34],
        [40, 70],
        [38, 120],
        [28, 150],
        [26, 158],
      ],
      8,
      [x, 0, z],
    );
  const heads: Part[][] = [
    // manusia (Imsety)
    [ellipsoid([-65, 180, -65], 26, 26, 26, 4, 8), slab([-65, 160, -80], 50, 16, 40, 12, 30)],
    // babun (Hapy)
    [ellipsoid([65, 178, -65], 26, 24, 26, 4, 8), ellipsoid([65, 172, -41], 12, 10, 10, 3, 6)],
    // serigala (Duamutef)
    [
      ellipsoid([-65, 178, 65], 24, 22, 24, 4, 8),
      hull([
        [-73, 180, 83],
        [-57, 180, 83],
        [-73, 168, 83],
        [-57, 168, 83],
        [-65, 172, 115],
      ]),
      ...both((s) => [hull([[-65 + s * 8, 196, 65], [-65 + s * 18, 196, 65], [-65 + s * 13, 196, 71], [-65 + s * 13, 224, 65]])]),
    ],
    // elang (Qebehsenuef)
    [
      ellipsoid([65, 180, 65], 24, 26, 24, 4, 8),
      hull([
        [59, 184, 85],
        [71, 184, 85],
        [65, 172, 85],
        [65, 174, 101],
      ]),
    ],
  ];
  return [block([0, 10, 0], 260, 20, 260, 3), ...[-65, 65].flatMap((x) => [-65, 65].map((z) => jar(x, z))), ...heads.flat()];
}

function pschent(): Part[] {
  return [
    cyl([0, 0, 0], [0, 80, 0], 96, 12),
    lathe(
      [
        [66, 70],
        [70, 110],
        [58, 170],
        [38, 215],
        [22, 240],
        [16, 250],
        [0, 262],
      ],
      12,
    ),
    block([0, 150, -86], 120, 160, 16, 3),
    tube(
      [
        [0, 92, 92],
        [0, 120, 104],
        [0, 146, 96],
        [0, 152, 78],
        [0, 138, 70],
      ],
      4,
      4,
      6,
    ),
    tube(
      [
        [0, 56, 96],
        [0, 80, 104],
        [0, 94, 100],
      ],
      [6, 5, 4],
      [6, 5, 4],
      6,
    ),
    slab([0, 62, 100], 18, 4, 12, 4, 20),
  ];
}

function tongkatCambuk(): Part[] {
  const crook: P3[] = [
    [0, 0, 0],
    [0, 250, 0],
    [4, 286, 0],
    [22, 308, 0],
    [46, 304, 0],
    [58, 284, 0],
  ];
  const beads = [-1, 0, 1].flatMap((s) => [0, 1, 2, 3].map((i) => ellipsoid([110 + s * (8 + i * 5), 226 - i * 20, s * (6 + i * 4)], 6, 9, 6, 3, 6)));
  return [
    block([55, -8, 0], 180, 16, 60, 3),
    tube(crook, 7, 7, 8),
    ...[60, 120, 180, 240].map((y) => cyl([0, y, 0], [0, y + 10, 0], 9, 8)),
    tube(
      [
        [110, 0, 0],
        [110, 236, 0],
      ],
      6,
      6,
      8,
    ),
    cyl([110, 236, 0], [110, 246, 0], 10, 8),
    ...beads,
  ];
}

function abuSimbel(): Part[] {
  const colossus = (x: number): Part[] => [
    block([x, 60, 24], 70, 120, 40),
    block([x, 40, 60], 50, 80, 26),
    block([x, 88, 48], 52, 18, 50),
    slab([x, 96, 30], 52, 34, 60, 30, 70),
    ellipsoid([x, 186, 34], 16, 18, 16, 4, 8),
    hull([-1, 1].flatMap((s) => [[x + s * 22, 176, 28], [x + s * 20, 150, 34], [x + s * 14, 150, 38], [x + s * 18, 196, 26]] as P3[]).concat([[x, 200, 18]])),
    lathe(
      [
        [14, 0],
        [12, 20],
        [6, 34],
        [0, 40],
      ],
      8,
      [x, 198, 30],
    ),
  ];
  return [
    hull([
      [-190, 0, -40],
      [190, 0, -40],
      [-190, 0, 12],
      [190, 0, 12],
      [-170, 240, -40],
      [170, 240, -40],
      [-170, 240, -8],
      [170, 240, -8],
    ]),
    block([0, 60, 15], 60, 120, 8, 2),
    block([0, 246, -24], 350, 14, 36, 2),
    ...[-135, -55, 55, 135].flatMap(colossus),
  ];
}

function scarab(): Part[] {
  return [
    block([20, -6, 0], 300, 12, 220, 3),
    ellipsoid([0, 40, 0], 72, 38, 58, 4, 10),
    ellipsoid([78, 38, 0], 32, 30, 48, 4, 8),
    hull([
      [100, 28, -30],
      [100, 28, 30],
      [100, 44, -26],
      [100, 44, 26],
      [132, 26, -32],
      [132, 26, 32],
      [132, 36, -28],
      [132, 36, 28],
      [142, 28, -22],
      [142, 28, 22],
      [146, 28, -8],
      [146, 28, 8],
    ]),
    ...[20, -35].flatMap((x) => both((s) => [beam([x, 24, s * 40], [x + 6, 30, s * 80], 8, 6), beam([x + 6, 30, s * 80], [x + 18, 2, s * 100], 6, 5)])),
    ...both((s) => [beam([100, 30, s * 30], [130, 80, s * 22], 7, 6), beam([130, 80, s * 22], [146, 92, s * 10], 6, 5)]),
    cyl([152, 120, -6], [152, 120, 6], 46, 14),
  ];
}

function pharos(): Part[] {
  return [
    block([0, 10, 0], 280, 20, 280, 3),
    slab([0, 20, 0], 160, 160, 136, 136, 200),
    block([0, 226, 0], 156, 12, 156, 2),
    lathe(
      [
        [60, 232],
        [52, 330],
      ],
      8,
    ),
    cyl([0, 330, 0], [0, 338, 0], 64, 8),
    lathe(
      [
        [36, 338],
        [32, 398],
      ],
      12,
    ),
    cyl([0, 398, 0], [0, 404, 0], 40, 12),
    cyl([0, 404, 0], [0, 440, 0], 10, 8, 8),
    ellipsoid([0, 448, 0], 8, 9, 8, 3, 6),
    beam([0, 430, 0], [16, 456, 0], 4, 4),
  ];
}

function tahta(): Part[] {
  return [
    block([0, 100, 0], 160, 22, 140, 3),
    ...both((s) =>
      [-56, 56].flatMap((z) => [
        tube(
          [
            [s * 64, 90, z],
            [s * 66, 50, z],
            [s * 64, 16, z],
          ],
          [10, 8, 9],
        ),
        ellipsoid([s * 66, 8, z + 6], 12, 8, 14, 3, 6),
      ]),
    ),
    slab([0, 111, -62], 150, 16, 140, 14, 180),
    block([0, 296, -62], 156, 12, 22, 2),
    ...both((s) => [block([s * 76, 140, 0], 12, 56, 124, 2), ellipsoid([s * 62, 126, 74], 16, 16, 14, 4, 8)]),
    block([0, 12, 120], 120, 24, 60, 3),
  ];
}

/* ================================================================== */

const N = (m: Omit<Parameters<typeof solid3d>[0], "category">) => ({ ...m, category: "nusantara" as const });
const M = (m: Omit<Parameters<typeof solid3d>[0], "category">) => ({ ...m, category: "mesir" as const });

export const NUSANTARA3D: Template[] = [
  solid3d(N({ id: "rumah-gadang-3d", title: "Rumah Gadang 3D", description: "Rumah adat Minangkabau di atas tiang dengan atap bergonjong tajam di empat penjuru dan dinding yang melebar ke atas.", difficulty: "sulit", minutes: 120, age: 11, tags: ["minangkabau", "sumatra barat", "rumah adat"], featured: true }), 420, "Panjang", rumahGadang),
  solid3d(N({ id: "joglo-3d", title: "Rumah Joglo 3D", description: "Rumah Jawa dengan umpak, saka di empat sudut, atap landai bawah, dan brunjung tinggi berhias mustaka.", difficulty: "sedang", minutes: 80, age: 10, tags: ["jawa", "rumah adat"] }), 300, "Panjang", joglo),
  solid3d(N({ id: "honai-3d", title: "Rumah Honai 3D", description: "Rumah bundar Papua dengan atap kubah jerami yang menjorok dan pintu rendah.", difficulty: "mudah", minutes: 50, age: 8, tags: ["papua", "rumah adat"] }), 210, "Diameter", honai),
  solid3d(N({ id: "tongkonan-3d", title: "Tongkonan 3D", description: "Rumah Toraja di atas tiang dengan atap perahu yang melengkung tinggi di kedua ujung, tiang depan, dan susunan tanduk kerbau.", difficulty: "sulit", minutes: 110, age: 11, tags: ["toraja", "sulawesi", "rumah adat"] }), 460, "Panjang", tongkonan),
  solid3d(N({ id: "borobudur-3d", title: "Candi Borobudur 3D", description: "Lima teras persegi, tiga teras melingkar dengan stupa berlubang, dan stupa induk di puncak.", difficulty: "sulit", minutes: 110, age: 10, tags: ["candi", "jawa tengah", "warisan dunia"], featured: true }), 360, "Lebar dasar", borobudur),
  solid3d(N({ id: "prambanan-3d", title: "Candi Prambanan 3D", description: "Candi Siwa menjulang: batur, tubuh candi, atap bertingkat bertabur ratna, dan puncak runcing.", difficulty: "sulit", minutes: 100, age: 10, tags: ["candi", "yogyakarta", "warisan dunia"] }), 380, "Tinggi", prambanan),
  solid3d(N({ id: "monas-3d", title: "Monas 3D", description: "Tugu Monumen Nasional: pelataran bertingkat, cawan lebar, tugu meruncing, dan lidah api di puncak.", difficulty: "sedang", minutes: 60, age: 8, tags: ["jakarta", "monumen", "ikon"] }), 448, "Tinggi", monas),
  solid3d(N({ id: "lumbung-sasak-3d", title: "Lumbung Sasak 3D", description: "Lumbung padi Lombok di atas empat tiang dengan piringan penahan tikus dan atap melengkung seperti topi.", difficulty: "sedang", minutes: 60, age: 9, tags: ["lombok", "ntb", "lumbung"] }), 262, "Tinggi", lumbung),
  solid3d(N({ id: "bajaj-3d", title: "Bajaj 3D", description: "Bajaj roda tiga khas Jakarta dengan kabin membulat, atap, lampu depan, dan mesin di belakang.", difficulty: "sedang", minutes: 60, age: 8, tags: ["jakarta", "kendaraan", "transportasi"] }), 260, "Panjang", bajaj),
  solid3d(N({ id: "becak-3d", title: "Becak 3D", description: "Becak dengan kursi penumpang di depan, tenda lengkung, rangka, sadel pengayuh, dan tiga roda.", difficulty: "sedang", minutes: 70, age: 9, tags: ["kendaraan", "tradisional", "transportasi"] }), 300, "Panjang", becak),
  solid3d(N({ id: "pinisi-3d", title: "Kapal Pinisi 3D", description: "Kapal layar Bugis bertiang dua dengan tujuh layar: dua layar utama, puncak, dan tiga layar haluan di cucur panjang.", difficulty: "sulit", minutes: 120, age: 11, tags: ["bugis", "sulawesi", "kapal", "warisan dunia"], featured: true }), 470, "Panjang", pinisi),
  solid3d(N({ id: "bedug-3d", title: "Bedug 3D", description: "Bedug masjid berbadan tong di atas dudukan kaki silang, lengkap dengan pemukulnya.", difficulty: "sedang", minutes: 60, age: 8, tags: ["masjid", "musik", "ramadan"] }), 220, "Panjang", bedug),
  solid3d(N({ id: "gong-3d", title: "Gong Gamelan 3D", description: "Gong ageng dengan pencu di tengah, digantung tali pada gayor berujung melengkung, plus tabuhnya.", difficulty: "sedang", minutes: 70, age: 9, tags: ["gamelan", "musik", "jawa"] }), 360, "Lebar", gong),
  solid3d(N({ id: "angklung-3d", title: "Angklung 3D", description: "Angklung Sunda: rangka bambu dengan dua tabung bunyi berlidah yang berbeda tinggi.", difficulty: "mudah", minutes: 40, age: 8, tags: ["sunda", "musik", "bambu", "warisan dunia"] }), 230, "Tinggi", angklung),
  solid3d(N({ id: "keris-3d", title: "Keris & Warangka 3D", description: "Keris berluk lima dengan ganja, hulu melengkung, dan warangka berdiri di sampingnya di atas dudukan.", difficulty: "sedang", minutes: 60, age: 10, tags: ["keris", "senjata", "jawa", "warisan dunia"] }), 470, "Tinggi", keris),
  solid3d(N({ id: "ondel-ondel-3d", title: "Ondel-ondel 3D", description: "Boneka raksasa Betawi berbadan lebar, wajah bermata besar, lengan menjuntai, dan mahkota kembang kelapa.", difficulty: "sedang", minutes: 80, age: 9, tags: ["betawi", "jakarta", "boneka"] }), 430, "Tinggi", ondel),
  solid3d(N({ id: "tumpeng-3d", title: "Tumpeng 3D", description: "Nasi tumpeng kerucut di atas tampah dengan telur, ayam, tempe, dan perkedel di sekelilingnya.", difficulty: "mudah", minutes: 45, age: 7, tags: ["kuliner", "syukuran", "jawa"] }), 336, "Diameter", tumpeng),
  solid3d(N({ id: "delman-3d", title: "Delman 3D", description: "Kereta kuda dengan dua roda besar, tempat duduk beratap lengkung, gagang tarik, dan kudanya.", difficulty: "sulit", minutes: 110, age: 10, tags: ["kuda", "kendaraan", "tradisional"] }), 470, "Panjang", delman),
  solid3d(N({ id: "komodo-3d", title: "Komodo 3D", description: "Komodo merayap dengan ekor panjang meliuk, kaki terbuka ke samping, kepala pipih, dan lidah bercabang.", difficulty: "sedang", minutes: 70, age: 8, tags: ["komodo", "hewan", "ntt"] }), 470, "Panjang", komodo),
  solid3d(N({ id: "garuda-3d", title: "Garuda Pancasila 3D", description: "Garuda berdiri dengan sayap terbentang, perisai di dada, jambul, ekor kipas, dan pita di cakarnya.", difficulty: "sulit", minutes: 100, age: 10, tags: ["garuda", "pancasila", "lambang"] }), 490, "Lebar sayap", garuda),
];

export const MESIR3D: Template[] = [
  solid3d(M({ id: "piramida-giza-3d", title: "Piramida Giza 3D", description: "Kompleks Giza: piramida Khufu dengan puncak emas, piramida Khafre, dan Menkaure di atas papan gurun.", difficulty: "mudah", minutes: 40, age: 7, tags: ["piramida", "giza", "warisan dunia"], featured: true }), 520, "Lebar papan", giza),
  solid3d(M({ id: "piramida-djoser-3d", title: "Piramida Djoser 3D", description: "Piramida bertingkat enam pertama di dunia dengan dinding yang sedikit miring di tiap undakan.", difficulty: "mudah", minutes: 45, age: 7, tags: ["piramida", "saqqara"] }), 340, "Lebar", djoser),
  solid3d(M({ id: "sphinx-3d", title: "Sphinx Agung 3D", description: "Singa berkepala manusia berbaring dengan kaki depan terjulur, kain nemes, janggut, dan ekor melingkar.", difficulty: "sulit", minutes: 100, age: 10, tags: ["sphinx", "giza", "patung"], featured: true }), 360, "Panjang", sphinx),
  solid3d(M({ id: "obelisk-3d", title: "Obelisk 3D", description: "Tugu batu empat sisi yang meruncing dengan piramidion di puncak dan alas bertingkat.", difficulty: "mudah", minutes: 30, age: 7, tags: ["obelisk", "tugu"] }), 434, "Tinggi", obelisk),
  solid3d(M({ id: "kolom-karnak-3d", title: "Kolom Kuil Karnak 3D", description: "Enam tiang papirus bermahkota mekar dengan balok arsitraf dan atap, seperti aula Karnak.", difficulty: "sedang", minutes: 90, age: 10, tags: ["kuil", "karnak", "luxor"] }), 360, "Panjang", karnak),
  solid3d(M({ id: "sarkofagus-3d", title: "Sarkofagus Firaun 3D", description: "Peti mati berbentuk tubuh dengan nemes, wajah, janggut, lengan menyilang memegang tongkat dan cambuk.", difficulty: "sedang", minutes: 80, age: 9, tags: ["firaun", "mumi", "makam"] }), 460, "Panjang", sarkofagus),
  solid3d(M({ id: "topeng-tutankhamun-3d", title: "Topeng Tutankhamun 3D", description: "Patung dada dengan kalung lebar, kain nemes yang menjuntai, wajah, janggut, dan ular di dahi.", difficulty: "sulit", minutes: 90, age: 10, tags: ["tutankhamun", "firaun", "topeng"], featured: true }), 250, "Tinggi", topengTut),
  solid3d(M({ id: "kucing-bastet-3d", title: "Kucing Bastet 3D", description: "Patung kucing dewi Bastet duduk tegak dengan kalung, telinga runcing, dan ekor melingkar di kaki.", difficulty: "sedang", minutes: 60, age: 8, tags: ["kucing", "bastet", "patung"] }), 290, "Tinggi", bastet),
  solid3d(M({ id: "anubis-3d", title: "Anubis Berbaring 3D", description: "Anjing hitam Anubis berbaring waspada di atas peti suci bertepi emas, seperti di makam Tutankhamun.", difficulty: "sulit", minutes: 90, age: 10, tags: ["anubis", "dewa", "makam"] }), 330, "Panjang", anubis),
  solid3d(M({ id: "kapal-nil-3d", title: "Perahu Sungai Nil 3D", description: "Perahu papirus melengkung dengan ujung bunga, kabin dewa, dayung kemudi, tiang, dan layar persegi.", difficulty: "sedang", minutes: 80, age: 9, tags: ["perahu", "sungai nil"] }), 410, "Panjang", kapalNil),
  solid3d(M({ id: "kereta-perang-3d", title: "Kereta Perang Firaun 3D", description: "Kereta perang beroda dua dengan lantai setengah lingkaran, dinding depan melengkung, gagang tarik, dan kudanya.", difficulty: "sulit", minutes: 100, age: 10, tags: ["kereta", "kuda", "perang"] }), 470, "Panjang", keretaPerang),
  solid3d(M({ id: "unta-3d", title: "Unta Gurun 3D", description: "Unta berpunuk dengan leher melengkung, kaki panjang bersendi, kepala memanjang, dan ekor.", difficulty: "sedang", minutes: 70, age: 8, tags: ["unta", "hewan", "gurun"] }), 320, "Tinggi", unta),
  solid3d(M({ id: "ankh-3d", title: "Ankh 3D", description: "Simbol kehidupan Mesir yang tebal: lingkaran di atas, lengan melebar di ujung, batang, dan alas.", difficulty: "mudah", minutes: 35, age: 7, tags: ["ankh", "simbol"] }), 320, "Tinggi", ankh),
  solid3d(M({ id: "guci-kanopik-3d", title: "Guci Kanopik 3D", description: "Empat guci kanopik berkepala manusia, babun, serigala, dan elang di atas alas peti.", difficulty: "sedang", minutes: 80, age: 9, tags: ["guci", "makam", "dewa"] }), 260, "Lebar alas", kanopik),
  solid3d(M({ id: "mahkota-firaun-3d", title: "Mahkota Firaun 3D", description: "Mahkota ganda Pschent: mahkota merah dengan sandaran tinggi dan ikal, mahkota putih, serta ular kobra di depan.", difficulty: "sedang", minutes: 60, age: 9, tags: ["firaun", "mahkota", "kostum"] }), 260, "Tinggi", pschent),
  solid3d(M({ id: "tongkat-cambuk-3d", title: "Tongkat & Cambuk Firaun 3D", description: "Tongkat gembala bengkok bergaris dan cambuk bermanik tiga untai, berdiri di atas dudukan.", difficulty: "mudah", minutes: 45, age: 8, tags: ["firaun", "kostum", "simbol"] }), 320, "Tinggi", tongkatCambuk),
  solid3d(M({ id: "abu-simbel-3d", title: "Kuil Abu Simbel 3D", description: "Muka kuil tebing dengan empat patung Ramses duduk bermahkota, pintu masuk, dan lis atas.", difficulty: "sulit", minutes: 110, age: 11, tags: ["kuil", "ramses", "warisan dunia"] }), 380, "Lebar", abuSimbel),
  solid3d(M({ id: "scarab-3d", title: "Kumbang Scarab 3D", description: "Kumbang suci Khepri dengan sayap kubah, enam kaki, kepala bergerigi, mendorong cakram matahari.", difficulty: "sedang", minutes: 70, age: 8, tags: ["scarab", "khepri", "serangga"] }), 300, "Panjang", scarab),
  solid3d(M({ id: "mercusuar-alexandria-3d", title: "Mercusuar Alexandria 3D", description: "Pharos bertingkat tiga: menara persegi, segi delapan, silinder lentera, dan patung di puncak.", difficulty: "sedang", minutes: 70, age: 9, tags: ["mercusuar", "alexandria", "keajaiban dunia"] }), 456, "Tinggi", pharos),
  solid3d(M({ id: "tahta-firaun-3d", title: "Tahta Firaun 3D", description: "Kursi raja berkaki singa dengan sandaran tinggi, sandaran lengan, kepala singa di depan, dan bangku kaki.", difficulty: "sedang", minutes: 70, age: 9, tags: ["firaun", "tahta", "perabot"] }), 300, "Tinggi", tahta),
];
