import { rectPoints, stadiumPoints } from "./geometry/polygon";
import type { Vec2 } from "./geometry/types";
import { FLAT, kitTemplate, SIDE, STAND, type Kit } from "./kit";
import { beam, block, cyl, ellipsoid, hull, lathe, type P3, type Part, prism, pyramid, rotate, slab, tube } from "./solid";
import type { Meta } from "./templates-3d";
import type { Category, Template } from "./templates";

/*
 * Kategori Cita-cita: dokter, pilot & astronot, chef & barista, pemadam & polisi,
 * arsitek & insinyur, ilmuwan, dokter hewan (masing-masing 6 template).
 */

const both = (f: (s: 1 | -1) => Part[]): Part[] => [...f(1), ...f(-1)];
const circ = (x: number, y: number, r: number, n = 20): Vec2[] => Array.from({ length: n }, (_, i) => [x + Math.cos((i / n) * Math.PI * 2) * r, y + Math.sin((i / n) * Math.PI * 2) * r] as Vec2);
const ringPath = (c: P3, r: number, n = 16, plane: "xy" | "xz" = "xz", ry = r): P3[] =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return plane === "xz" ? ([c[0] + Math.cos(a) * r, c[1], c[2] + Math.sin(a) * ry] as P3) : ([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * ry, c[2]] as P3);
  });
const plus = (cx: number, cy: number, a: number, w: number): [number, number][] => [
  [cx - w, cy - a],
  [cx + w, cy - a],
  [cx + w, cy - w],
  [cx + a, cy - w],
  [cx + a, cy + w],
  [cx + w, cy + w],
  [cx + w, cy + a],
  [cx - w, cy + a],
  [cx - w, cy + w],
  [cx - a, cy + w],
  [cx - a, cy - w],
  [cx - w, cy - w],
];
const wheel = (x: number, y: number, z0: number, z1: number, r: number, n = 12) => cyl([x, y, z0], [x, y, z1], r, n);
/** Bintang acak tapi tetap (lubang planetarium). */
function stars(seed: number, w: number, h: number, count: number): Vec2[][] {
  let s = seed;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  return Array.from({ length: count }, () => circ(12 + rnd() * (w - 24), 12 + rnd() * (h - 24), 1.5 + rnd() * 2.2, 8));
}

type M = Omit<Meta, "category">;
const T = (category: Category) => (m: M, def: number, label: string, design: (k: Kit) => void) => kitTemplate({ ...m, category }, def, label, design);

/* ================================================================== */
/* Dokter & perawat                                                    */
/* ================================================================== */

const dok = T("dokter");
const DOKTER: Template[] = [
  dok({ id: "tas-dokter", title: "Tas Dokter", description: "Tas dokter bertutup selip yang bisa diisi peralatan mainan, lengkap dengan pegangan, gesper, dan tanda palang.", difficulty: "sedang", minutes: 45, age: 6, tags: ["dokter", "main peran", "tas"] }, 280, "Panjang", (k) =>
    k
      .box({ W: 280, D: 130, H: 170, lid: "tuck", labels: { lid: "Tutup tas" } }, FLAT, [0, 0, 0], "Badan tas")
      .add(tube([[110, 172, 65], [115, 210, 65], [165, 210, 65], [170, 172, 65]], 7), prism(plus(140, 90, 26, 8), "xy", 131, 135), block([140, 160, 133], 30, 14, 6, 1)),
  ),
  dok({ id: "stetoskop", title: "Stetoskop", description: "Stetoskop mainan 3D: dua anting telinga, selang bercabang, dan kepala stetoskop berdiafragma di atas alas.", difficulty: "mudah", minutes: 35, age: 5, tags: ["dokter", "main peran"] }, 340, "Tinggi", (k) =>
    k.add(
      block([0, -4, 0], 160, 8, 100, 2),
      cyl([0, 0, 0], [0, 12, 0], 28, 16),
      lathe([[22, 12], [20, 16], [0, 18]], 16),
      tube([[0, 12, 0], [0, 60, 0], [10, 120, 0], [0, 170, 0]], 6),
      ...both((s) => [tube([[0, 170, 0], [s * 30, 220, 0], [s * 45, 280, 0], [s * 40, 320, 0], [s * 28, 330, 0]], 5), ellipsoid([s * 24, 332, 0], 7, 6, 7, 3, 8)]),
    ),
  ),
  dok({ id: "ranjang-pasien", title: "Ranjang Pasien Boneka", description: "Ranjang rumah sakit untuk boneka: kasur, bantal, sandaran, pagar samping, roda, dan tiang infus.", difficulty: "sedang", minutes: 50, age: 6, tags: ["dokter", "boneka", "rumah sakit"] }, 330, "Panjang", (k) =>
    k.add(
      block([150, 60, 0], 300, 10, 140, 2),
      block([150, 74, 0], 290, 18, 132, 6),
      ellipsoid([40, 90, 0], 30, 9, 50, 3, 8),
      block([4, 92, 0], 8, 92, 140, 3),
      block([296, 80, 0], 8, 60, 140, 3),
      ...[10, 290].flatMap((x) => both((s) => [cyl([x, 14, s * 62], [x, 56, s * 62], 5, 6), wheel(x, 8, s * 58, s * 66, 8, 8)])),
      ...both((s) => [beam([60, 100, s * 66], [240, 100, s * 66], 5, 5), beam([70, 70, s * 66], [70, 100, s * 66], 5, 5), beam([230, 70, s * 66], [230, 100, s * 66], 5, 5)]),
      cyl([-20, 0, 60], [-20, 260, 60], 3, 6),
      cyl([-20, 0, 60], [-20, 4, 60], 24, 10),
      block([-20, 230, 60], 30, 40, 8, 4),
    ),
  ),
  dok({ id: "kursi-roda", title: "Kursi Roda Mini", description: "Kursi roda boneka dengan roda besar, roda kastor depan, sandaran, sandaran tangan, dan pijakan kaki.", difficulty: "sedang", minutes: 45, age: 6, tags: ["dokter", "boneka", "rumah sakit"] }, 230, "Tinggi", (k) =>
    k.add(
      block([0, 90, 0], 100, 10, 100, 2),
      block([-50, 150, 0], 8, 110, 100, 2),
      ...both((s) => [
        wheel(-10, 62, s * 58, s * 64, 62, 16),
        cyl([-10, 62, s * 50], [-10, 62, s * 58], 8, 8),
        wheel(60, 14, s * 40, s * 46, 14, 8),
        beam([60, 20, s * 43], [55, 86, s * 43], 5, 5),
        beam([-40, 130, s * 52], [40, 130, s * 52], 8, 8),
        beam([30, 95, s * 52], [30, 130, s * 52], 5, 5),
        beam([45, 90, s * 30], [75, 30, s * 30], 6, 6),
        tube([[-54, 200, s * 42], [-72, 204, s * 42]], 5),
      ]),
      block([75, 26, 0], 30, 6, 80, 2),
    ),
  ),
  dok({ id: "timbangan-dokter", title: "Timbangan Dokter", description: "Timbangan badan bertiang dengan lengan geser, piringan angka, dan pengukur tinggi badan.", difficulty: "mudah", minutes: 35, age: 6, tags: ["dokter", "puskesmas"] }, 450, "Tinggi", (k) =>
    k.add(
      block([0, 12, 0], 180, 24, 160, 6),
      block([-70, 200, 0], 30, 360, 30, 4),
      block([-20, 330, 0], 120, 14, 16, 2),
      block([10, 330, 0], 16, 24, 22, 2),
      beam([-70, 380, 0], [-70, 440, 0], 10, 10),
      block([-40, 440, 0], 70, 6, 20, 2),
      cyl([-70, 250, 16], [-70, 250, 22], 26, 16),
    ),
  ),
  dok({ id: "lampu-rontgen", title: "Lampu Baca Rontgen", description: "Kotak lampu berjendela untuk menempel 'foto rontgen' dari kertas kalkir. Taruh senter di dalamnya.", difficulty: "mudah", minutes: 30, age: 7, tags: ["dokter", "lampu", "sains"] }, 300, "Lebar", (k) =>
    k
      .box({ W: 300, D: 220, H: 60, lid: "glued", holes: { lid: [rectPoints(20, 20, 260, 170)], right: [circ(110, 30, 14)] }, labels: { base: "Panel belakang", lid: "Muka berjendela" } }, STAND, [0, 220, 0], "Kotak lampu")
      .add(...[30, 270].map((x) => block([x, -6, 40], 40, 12, 90, 3))),
  ),
];

/* ================================================================== */
/* Pilot & astronot                                                    */
/* ================================================================== */

const pil = T("pilot");
const PILOT: Template[] = [
  pil({ id: "kokpit-pesawat", title: "Kokpit Pesawat", description: "Kokpit seukuran anak: kursi pilot, dasbor penuh jarum penunjuk, kemudi, tuas gas, dan rangka kaca depan.", difficulty: "sulit", minutes: 150, age: 6, tags: ["pilot", "pesawat", "main peran"], featured: true }, 700, "Lebar", (k) =>
    k.add(
      block([0, 10, 0], 700, 20, 600, 3),
      block([0, 110, 120], 320, 40, 260, 8),
      block([0, 260, 235], 320, 250, 40, 8),
      ...both((s) => [block([s * 340, 160, 0], 20, 300, 600, 4)]),
      block([0, 330, -260], 660, 180, 40, 6),
      ...[-220, -120, 120, 220].flatMap((x) => [cyl([x, 360, -240], [x, 360, -234], 34, 14), cyl([x, 360, -234], [x, 360, -231], 4, 6)]),
      cyl([0, 380, -240], [0, 380, -234], 44, 16),
      beam([0, 280, -240], [0, 280, -130], 14, 14),
      block([0, 292, -122], 180, 20, 20, 4),
      ...both((s) => [cyl([s * 90, 260, -122], [s * 90, 320, -122], 9, 8)]),
      ...[0, 30].map((dz) => beam([200, 250, -150 + dz], [215, 320, -140 + dz], 8, 8)),
      tube([[-330, 420, -280], [-200, 560, -260], [200, 560, -260], [330, 420, -280]], 9),
    ),
  ),
  pil({ id: "helm-astronot", title: "Helm Astronot", description: "Helm antariksa berkubah dengan cincin leher, kaca pelindung cembung, dan lampu di sisi kepala.", difficulty: "sedang", minutes: 70, age: 7, tags: ["astronot", "luar angkasa", "kostum"] }, 330, "Lebar", (k) =>
    k.add(
      lathe([[150, 0], [158, 60], [150, 140], [118, 210], [70, 250], [0, 265]], 16),
      tube(ringPath([0, 0, 0], 152, 18), 14, 14, 8, true),
      hull(
        [-50, -25, 0, 25, 50].flatMap((az) =>
          [-5, 20, 45].map((el) => {
            const a = (az * Math.PI) / 180,
              e = (el * Math.PI) / 180;
            return [Math.sin(a) * Math.cos(e) * 164, 100 + Math.sin(e) * 164, Math.cos(a) * Math.cos(e) * 164] as P3;
          }),
        ),
      ),
      ...both((s) => [cyl([s * 150, 150, 0], [s * 166, 150, 0], 22, 10), cyl([s * 166, 150, 0], [s * 172, 150, 0], 14, 10)]),
    ),
  ),
  pil({ id: "jetpack-astronot", title: "Jetpack Astronot", description: "Ransel roket berisi dua tabung bahan bakar, kotak kendali, nosel, dan semburan api. Ikat dengan tali ransel.", difficulty: "sedang", minutes: 60, age: 6, tags: ["astronot", "kostum", "roket"] }, 400, "Tinggi", (k) =>
    k.add(
      block([0, 200, 0], 180, 300, 30, 8),
      ...both((s) => [
        lathe([[40, 60], [42, 80], [42, 300], [30, 340], [0, 352]], 12, [s * 55, 0, 40]),
        cyl([s * 55, 60, 40], [s * 55, 25, 40], 22, 10, 30),
        lathe([[24, 0], [16, -20], [0, -50]], 8, [s * 55, 25, 40]),
      ]),
      block([0, 330, 32], 60, 40, 36, 4),
      cyl([0, 330, 50], [0, 330, 56], 8, 8),
    ),
  ),
  pil({ id: "panel-kendali-roket", title: "Panel Kendali Roket", description: "Meja kendali misi miring dengan tiga layar, deretan tombol, dan tuas peluncuran.", difficulty: "sedang", minutes: 60, age: 7, tags: ["astronot", "roket", "main peran"] }, 420, "Lebar", (k) => {
    const yAt = (z: number) => 70 + ((80 - z) * 70) / 160;
    const n: P3 = [0, 160 / 175, 70 / 175];
    const btn = (x: number, z: number, r: number): Part => {
      const p: P3 = [x, yAt(z), z];
      return cyl(p, [p[0] + n[0] * 7, p[1] + n[1] * 7, p[2] + n[2] * 7], r, 8);
    };
    k.add(
      hull([-200, 200].flatMap((x) => [[x, 0, 80], [x, 0, -80], [x, 70, 80], [x, 140, -80]] as P3[])),
      ...[-140, 0, 140].map((x) => slab([x, 140, -86], 120, 12, 116, 10, 90)),
      ...[-150, -90, -30, 30, 90].flatMap((x) => [btn(x, 40, 9), btn(x, 0, 7)]),
      ...[110, 150].flatMap((x) => {
        const z = -40;
        return [beam([x, yAt(z), z], [x, yAt(z) + 50, z + 10], 6, 6), ellipsoid([x, yAt(z) + 54, z + 11], 9, 9, 9, 3, 8)];
      }),
    );
  }),
  pil({ id: "satelit", title: "Satelit", description: "Satelit di atas dudukan pajangan: badan kotak, dua sayap panel surya, antena piring, dan pendorong.", difficulty: "mudah", minutes: 45, age: 7, tags: ["luar angkasa", "sains"] }, 440, "Lebar", (k) =>
    k.add(
      cyl([0, 0, 0], [0, 8, 0], 60, 12),
      cyl([0, 8, 0], [0, 50, 0], 5, 6),
      block([0, 100, 0], 80, 100, 80, 4),
      ...both((s) => [beam([s * 40, 100, 0], [s * 62, 100, 0], 6, 6), block([s * 150, 100, 0], 180, 4, 70)]),
      lathe([[0, 0], [20, 4], [40, 14], [52, 24]], 12, [0, 150, 0]),
      cyl([0, 150, 0], [0, 200, 0], 3, 6),
      ...both((s) => [cyl([s * 30, 60, 30], [s * 30, 40, 30], 7, 6, 10)]),
    ),
  ),
  pil({ id: "pesawat-ulang-alik", title: "Pesawat Ulang-alik", description: "Rangkaian peluncuran: tangki bahan bakar besar, dua roket pendorong, dan pesawat orbiter bersayap delta.", difficulty: "sulit", minutes: 100, age: 9, tags: ["astronot", "roket", "nasa"] }, 400, "Tinggi", (k) =>
    k.add(
      block([0, -6, 0], 260, 12, 220, 3),
      lathe([[42, 0], [42, 300], [30, 350], [0, 380]], 12),
      ...both((s) => [lathe([[18, 0], [18, 290], [12, 320], [0, 340]], 10, [s * 58, 0, 0]), cyl([s * 58, 0, 0], [s * 58, -6, 0], 14, 8, 20)]),
      tube([[0, 60, 72], [0, 120, 72], [0, 280, 72], [0, 320, 72], [0, 345, 72]], [26, 28, 28, 20, 4], [22, 24, 24, 18, 4]),
      hull([18, 90].flatMap((x) => [-1, 1].flatMap((s) => [[s * x, 70, 69], [s * x, 70, 75]] as P3[])).concat([[-20, 200, 69], [20, 200, 69], [-20, 200, 75], [20, 200, 75]])),
      hull([[-3, 70, 90], [3, 70, 90], [-3, 112, 90], [3, 112, 90], [-3, 70, 145], [3, 70, 145], [-3, 92, 145], [3, 92, 145]]),
      ...[-12, 0, 12].map((x) => cyl([x, 62, 72], [x, 48, 72], 7, 6, 10)),
    ),
  ),
];

/* ================================================================== */
/* Chef & barista                                                      */
/* ================================================================== */

const chef = T("chef");
const CHEF: Template[] = [
  chef({ id: "kulkas-mainan", title: "Kulkas Mainan", description: "Kulkas main peran dengan pintu yang bisa dibuka (lidah selip), dua papan rak di dalam, dan pegangan.", difficulty: "sedang", minutes: 50, age: 4, tags: ["dapur", "main peran", "pintu"], featured: true }, 360, "Tinggi", (k) =>
    k
      .box({ W: 360, D: 220, H: 180, lid: "tuck", labels: { base: "Dinding belakang", lid: "Pintu kulkas", back: "Sisi kanan (engsel)" } }, SIDE, [220, 360, 0], "Badan kulkas")
      .board(212, 170, FLAT, [4, 120, 4], "Rak bawah")
      .board(212, 170, FLAT, [4, 240, 4], "Rak atas")
      .add(beam([24, 250, 188], [24, 150, 188], 8, 8), ...[20, 200].map((x) => block([x, -6, 90], 24, 12, 160, 2))),
  ),
  chef({ id: "kompor-oven-mainan", title: "Kompor & Oven", description: "Kompor main peran dengan pintu oven berjendela yang bisa dibuka, empat tungku bergaris, dan kenop.", difficulty: "sedang", minutes: 60, age: 4, tags: ["dapur", "main peran", "masak"] }, 320, "Lebar", (k) =>
    k
      .box({ W: 320, D: 300, H: 250, lid: "tuck", holes: { lid: [rectPoints(60, 60, 200, 110)] }, labels: { base: "Dinding belakang", back: "Atas kompor", lid: "Pintu oven" } }, STAND, [0, 300, 0], "Badan kompor")
      .add(
        ...[80, 240].flatMap((x) => [70, 180].flatMap((z) => [tube(ringPath([x, 304, z], 36, 16), 4, 4, 6, true), beam([x - 36, 305, z], [x + 36, 305, z], 4, 4), beam([x, 305, z - 36], [x, 305, z + 36], 4, 4)])),
        beam([60, 250, 258], [260, 250, 258], 8, 8),
        ...[60, 130, 190, 260].map((x) => cyl([x, 285, 252], [x, 285, 262], 12, 10)),
      ),
  ),
  chef({ id: "mesin-espresso", title: "Mesin Espresso", description: "Replika mesin kopi: kepala seduh, portafilter bergagang, pipa uap, pengukur tekanan, baki tetes, dan dua cangkir.", difficulty: "sedang", minutes: 60, age: 8, tags: ["barista", "kopi", "kafe"] }, 300, "Tinggi", (k) =>
    k.add(
      block([0, 150, 0], 200, 300, 170, 8),
      block([0, 205, 100], 60, 20, 40, 4),
      cyl([0, 190, 100], [0, 172, 100], 28, 12),
      beam([0, 178, 120], [0, 172, 190], 12, 12),
      block([0, 12, 115], 170, 20, 60, 3),
      ...[-40, 40].map((x) => lathe([[16, 22], [22, 60], [24, 62], [0, 62]], 10, [x, 0, 110])),
      tube([[70, 220, 86], [85, 190, 110], [85, 120, 115]], 4),
      cyl([-60, 260, 85], [-60, 260, 92], 18, 12),
      ...[-30, 0, 30].map((x) => cyl([x, 270, 85], [x, 270, 91], 8, 8)),
      block([0, 304, 0], 190, 8, 160, 2),
    ),
  ),
  chef({ id: "etalase-kue", title: "Etalase Kue", description: "Lemari kaca berjendela (tempel mika) dengan dua rak dan kue bertingkat serta cupcake di dalamnya.", difficulty: "sedang", minutes: 55, age: 7, tags: ["kafe", "toko kue", "main peran"] }, 300, "Lebar", (k) =>
    k
      .box(
        {
          W: 300,
          D: 160,
          H: 200,
          lid: "glued",
          holes: { front: [rectPoints(16, 14, 268, 172)], left: [rectPoints(14, 14, 132, 172)], right: [rectPoints(14, 14, 132, 172)], lid: [rectPoints(16, 16, 268, 128)] },
        },
        FLAT,
        [0, 0, 0],
        "Kotak etalase",
      )
      .board(294, 154, FLAT, [3, 70, 3], "Rak 1")
      .board(294, 154, FLAT, [3, 140, 3], "Rak 2")
      .add(
        lathe([[40, 0], [40, 30], [28, 30], [28, 54], [0, 54]], 12, [80, 2, 80]),
        ...[150, 220].map((x) => lathe([[18, 0], [22, 18], [20, 26], [0, 34]], 10, [x, 72, 80])),
        lathe([[36, 0], [36, 40], [0, 40]], 12, [200, 142, 80]),
      ),
  ),
  chef({ id: "wastafel-dapur", title: "Wastafel Dapur", description: "Lemari wastafel berpintu samping, meja atas, bak cuci berbingkai, keran melengkung, dan kenop air.", difficulty: "sedang", minutes: 55, age: 4, tags: ["dapur", "main peran"] }, 320, "Lebar", (k) =>
    k
      .box({ W: 260, D: 300, H: 180, lid: "tuck", labels: { lid: "Pintu lemari" } }, SIDE, [300, 260, 0], "Lemari wastafel")
      .board(320, 120, STAND, [-10, 400, -6], "Panel dinding")
      .add(
        block([150, 268, 90], 320, 16, 200, 2),
        tube(
          [
            [70, 278, 50],
            [230, 278, 50],
            [230, 278, 150],
            [70, 278, 150],
          ],
          6,
          6,
          6,
          true,
        ),
        tube([[150, 276, 15], [150, 340, 15], [150, 360, 45], [150, 335, 75]], 8),
        ...[110, 190].map((x) => cyl([x, 276, 20], [x, 290, 20], 10, 8)),
      ),
  ),
  chef({ id: "food-truck", title: "Food Truck", description: "Truk jualan makanan dengan jendela saji beratap tenda, meja saji, papan menu di atap, dan empat roda.", difficulty: "sedang", minutes: 75, age: 7, tags: ["kuliner", "usaha", "kendaraan"] }, 470, "Panjang", (k) =>
    k.add(
      block([200, 150, 0], 380, 200, 180, 10),
      block([425, 120, 0], 70, 140, 170, 10),
      slab([460, 120, 0], 14, 150, 4, 140, 60, 6, 0),
      hull([120, 300].flatMap((x) => [[x, 246, 90], [x, 249, 90], [x, 215, 150], [x, 218, 150]] as P3[])),
      block([210, 150, 102], 180, 6, 30),
      block([210, 180, 91], 186, 70, 4, 1),
      block([200, 292, 0], 160, 56, 10, 3),
      ...both((s) => [beam([140, 250, s * 0], [140, 266, s * 0], 6, 6)]),
      ...[90, 400].flatMap((x) => both((s) => [wheel(x, 40, s * 80, s * 100, 40)])),
    ),
  ),
];

/* ================================================================== */
/* Pemadam & polisi                                                    */
/* ================================================================== */

const pem = T("pemadam");
const sign = (pts: [number, number][], x: number, y: number): Part => prism(pts.map(([u, v]) => [x + u, y + v]), "xy", -2, 2);
const PEMADAM: Template[] = [
  pem({ id: "mobil-pemadam", title: "Mobil Pemadam Kebakaran", description: "Truk pemadam dengan kabin, tangga putar di atap, gulungan selang, lampu sirene, dan enam roda.", difficulty: "sulit", minutes: 100, age: 7, tags: ["pemadam", "kendaraan", "main peran"], featured: true }, 470, "Panjang", (k) => {
    const rungs = Array.from({ length: 9 }, (_, i) => beam([70 + i * 40, 208, -24], [70 + i * 40, 208, 24], 5, 5));
    k.add(
      block([390, 100, 0], 100, 140, 170, 10),
      block([180, 110, 0], 320, 160, 170, 6),
      cyl([110, 190, 0], [110, 198, 0], 40, 12),
      ...both((s) => [beam([40, 210, s * 26], [430, 210, s * 26], 8, 8)]),
      ...rungs,
      cyl([200, 120, 86], [200, 120, 96], 40, 12),
      ...both((s) => [block([400, 178, s * 40], 30, 12, 26, 3)]),
      ...[70, 170, 380].flatMap((x) => both((s) => [wheel(x, 40, s * 76, s * 96, 40)])),
    );
  }),
  pem({ id: "helm-pemadam", title: "Helm Pemadam", description: "Helm pemadam klasik dengan kubah bersirip, pinggiran lebar memanjang ke belakang, dan lencana di depan.", difficulty: "sedang", minutes: 60, age: 6, tags: ["pemadam", "kostum"] }, 360, "Panjang", (k) =>
    k.add(
      lathe([[100, 40], [104, 70], [94, 120], [66, 155], [30, 172], [0, 176]], 14),
      hull(ringPath([0, 36, -30], 140, 18, "xz", 170).flatMap(([x, , z]) => [[x, 34, z] as P3, [x, 42, z] as P3])),
      hull([[-40, 60, 104], [40, 60, 104], [-36, 150, 98], [36, 150, 98], [0, 170, 92], [-40, 60, 110], [40, 60, 110], [-36, 150, 104], [36, 150, 104], [0, 170, 98]]),
      hull([-4, 4].flatMap((x) => [[x, 150, -80], [x, 170, -40], [x, 178, 0], [x, 172, 40], [x, 150, 80], [x, 140, 0]] as P3[])),
    ),
  ),
  pem({ id: "tabung-oksigen", title: "Tabung Oksigen Ransel", description: "Ransel tabung udara pemadam dengan papan punggung, katup, regulator, selang, dan pengukur tekanan.", difficulty: "mudah", minutes: 45, age: 6, tags: ["pemadam", "kostum"] }, 400, "Tinggi", (k) =>
    k.add(
      block([0, 200, -30], 160, 320, 20, 6),
      lathe([[52, 30], [56, 50], [56, 300], [40, 345], [16, 360], [16, 375], [0, 378]], 14, [0, 0, 30]),
      cyl([0, 378, 30], [0, 392, 30], 10, 8),
      cyl([-16, 386, 30], [16, 386, 30], 7, 8),
      tube([[0, 390, 30], [40, 395, 40], [90, 360, 50], [100, 280, 60]], 6),
      cyl([100, 280, 60], [100, 280, 70], 18, 12),
    ),
  ),
  pem({ id: "motor-polisi", title: "Motor Polisi", description: "Motor patroli dengan fairing depan, kaca angin, tangki, jok, kotak samping, tiang sirene, dan knalpot.", difficulty: "sedang", minutes: 75, age: 7, tags: ["polisi", "kendaraan", "main peran"] }, 380, "Panjang", (k) =>
    k.add(
      ...[60, 320].flatMap((x) => [wheel(x, 45, -9, 9, 45, 14), cyl([x, 45, -14], [x, 45, 14], 8, 8)]),
      hull([[80, 60, -16], [80, 60, 16], [300, 60, -16], [300, 60, 16], [260, 140, -18], [260, 140, 18], [130, 130, -18], [130, 130, 18]]),
      ellipsoid([220, 150, 0], 60, 22, 28, 3, 10),
      block([140, 150, 0], 110, 14, 46, 6),
      hull([[280, 90, -40], [280, 90, 40], [320, 120, -42], [320, 120, 42], [330, 200, -34], [330, 200, 34], [300, 210, -30], [300, 210, 30], [270, 150, -40], [270, 150, 40]]),
      hull([[300, 208, -26], [300, 208, 26], [286, 262, -20], [286, 262, 20], [292, 262, -20], [292, 262, 20], [306, 208, -26], [306, 208, 26]]),
      ...both((s) => [block([90, 110, s * 42], 70, 60, 30, 8)]),
      beam([70, 150, 0], [60, 250, 0], 5, 5),
      ...both((s) => [block([60, 256, s * 10], 14, 14, 18, 3)]),
      beam([290, 200, -50], [290, 200, 50], 6, 6),
      cyl([60, 50, -30], [180, 60, -30], 8),
    ),
  ),
  pem({ id: "pos-polisi", title: "Pos Polisi", description: "Pos jaga dengan pintu dan jendela berlubang, atap limas, papan nama, lampu atap, dan palang pintu.", difficulty: "sedang", minutes: 60, age: 6, tags: ["polisi", "main peran", "bangunan"] }, 460, "Panjang", (k) =>
    k
      .box(
        {
          W: 200,
          D: 200,
          H: 260,
          lid: "glued",
          holes: { front: [rectPoints(70, 0.01 + 4, 60, 150)], left: [rectPoints(50, 120, 100, 80)], right: [rectPoints(50, 120, 100, 80)] },
        },
        FLAT,
        [0, 0, 0],
        "Bangunan pos",
      )
      .add(
        pyramid([100, 260, 100], 240, 240, 80),
        block([100, 248, 206], 140, 30, 6, 1),
        cyl([100, 336, 100], [100, 356, 100], 10, 10),
        cyl([250, 0, 160], [250, 110, 160], 8, 8),
        beam([250, 110, 160], [460, 110, 160], 10, 10),
      ),
  ),
  pem({ id: "set-rambu-lalu-lintas", title: "Set Rambu Lalu Lintas", description: "Rambu stop segi delapan, rambu peringatan segitiga, rambu larangan bundar, dua kerucut lalu lintas, dan barikade.", difficulty: "mudah", minutes: 50, age: 5, tags: ["polisi", "jalan raya", "main peran"] }, 760, "Lebar", (k) => {
    const oct = Array.from({ length: 8 }, (_, i) => [Math.cos(((i + 0.5) * Math.PI) / 4) * 50, Math.sin(((i + 0.5) * Math.PI) / 4) * 50] as [number, number]);
    const tri: [number, number][] = [
      [-50, -30],
      [50, -30],
      [0, 55],
    ];
    const round = Array.from({ length: 16 }, (_, i) => [Math.cos((i / 16) * Math.PI * 2) * 45, Math.sin((i / 16) * Math.PI * 2) * 45] as [number, number]);
    k.add(
      ...[0, 150, 300].flatMap((x) => [cyl([x, 0, 0], [x, 8, 0], 36, 12), cyl([x, 8, 0], [x, 250, -4], 5, 6)]),
      sign(oct, 0, 280),
      sign(tri, 150, 280),
      sign(round, 300, 280),
      ...[450, 530].map((x) => lathe([[40, 0], [40, 6], [30, 6], [8, 140], [0, 146]], 10, [x, 0, 0])),
      ...[620, 740].map((x) => beam([x, 0, 0], [x, 110, 0], 8, 8)),
      block([680, 100, 0], 150, 24, 6, 1),
      block([680, 60, 0], 150, 24, 6, 1),
    );
  }),
];

/* ================================================================== */
/* Arsitek & insinyur                                                  */
/* ================================================================== */

const ars = T("arsitek");
function catenary(x0: number, x1: number, y0: number, sag: number, z: number, n = 8): P3[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const f = i / n;
    return [x0 + (x1 - x0) * f, y0 - sag * 4 * f * (1 - f), z] as P3;
  });
}
const ARSITEK: Template[] = [
  ars({ id: "crane-menara", title: "Crane Menara", description: "Derek konstruksi dengan tiang menjulang, lengan panjang, lengan penyeimbang berbeban, kabin, puncak, dan kait.", difficulty: "sedang", minutes: 70, age: 8, tags: ["konstruksi", "insinyur", "alat berat"] }, 520, "Tinggi", (k) =>
    k.add(
      block([0, 15, 0], 120, 30, 120, 3),
      block([0, 265, 0], 40, 470, 40),
      hull([[-110, 500, -14], [-110, 500, 14], [360, 500, -14], [360, 500, 14], [-110, 520, -14], [-110, 520, 14], [360, 516, -10], [360, 516, 10]]),
      block([-90, 480, 0], 50, 40, 40, 3),
      block([20, 480, 30], 40, 36, 30, 4),
      pyramid([0, 520, 0], 40, 40, 70),
      beam([0, 586, 0], [350, 520, 0], 4, 4),
      beam([0, 586, 0], [-105, 520, 0], 4, 4),
      block([240, 494, 0], 24, 10, 34, 2),
      beam([240, 490, 0], [240, 300, 0], 3, 3),
      block([240, 292, 0], 20, 16, 12, 3),
    ),
  ),
  ars({ id: "jembatan-gantung", title: "Jembatan Gantung", description: "Jembatan dengan dua menara, kabel utama melengkung, kabel penggantung, dan lantai jalan di atas pilar.", difficulty: "sulit", minutes: 90, age: 9, tags: ["jembatan", "insinyur", "konstruksi"] }, 620, "Panjang", (k) => {
    const parts: Part[] = [block([0, 40, 0], 600, 10, 60, 2), block([0, -2, 0], 640, 4, 140, 2)];
    for (const x of [-180, 180]) parts.push(...both((s) => [block([x, 110, s * 32], 14, 220, 14, 2)]), block([x, 205, 0], 14, 12, 78, 2), block([x, 18, 0], 50, 36, 90, 3));
    for (const z of [-32, 32]) {
      parts.push(tube(catenary(-300, -180, 220, -80, z, 4).reverse(), 3, 3, 6), tube(catenary(-180, 180, 220, 150, z, 8), 3, 3, 6), tube(catenary(180, 300, 220, -80, z, 4), 3, 3, 6));
      for (const x of [-120, -60, 0, 60, 120]) {
        const f = (x + 180) / 360;
        const y = 220 - 150 * 4 * f * (1 - f);
        parts.push(beam([x, 46, z], [x, y, z], 2, 2));
      }
    }
    k.add(...parts);
  }),
  ars({ id: "gedung-pencakar-langit", title: "Gedung Pencakar Langit", description: "Maket kota: menara berundak berpuncak runcing, menara kembar dengan jembatan langit, dan gedung miring modern.", difficulty: "sedang", minutes: 80, age: 9, tags: ["arsitek", "maket", "kota"] }, 420, "Lebar papan", (k) =>
    k.add(
      block([0, 4, 0], 420, 8, 220, 2),
      ...[[90, 0, 120], [70, 120, 220], [50, 220, 300], [32, 300, 350]].map(([s, y0, y1]) => block([-120, (y0 + y1) / 2 + 8, 0], s, y1 - y0, s, 2)),
      cyl([-120, 358, 0], [-120, 420, 0], 4, 6, 1),
      ...both((s) => [lathe([[34, 8], [34, 200], [26, 200], [26, 250], [16, 250], [16, 280], [0, 300]], 8, [40 + s * 45, 0, 0])]),
      block([40, 150, 0], 40, 14, 20, 2),
      hull([...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => [150 + sx * 40, 8, sz * 40] as P3)), ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => [160 + sx * 28 - sz * 10, 240, sz * 28 + sx * 10] as P3))]),
    ),
  ),
  ars({ id: "turbin-angin", title: "Turbin Angin", description: "Kincir listrik tenaga angin: menara meruncing, rumah mesin, hidung bulat, dan tiga bilah panjang.", difficulty: "mudah", minutes: 45, age: 8, tags: ["energi", "insinyur", "sains"] }, 560, "Tinggi", (k) => {
    const blade = hull([
      [-9, 0, 47],
      [9, 0, 47],
      [-9, 0, 53],
      [9, 0, 53],
      [-3, 170, 49],
      [3, 170, 49],
      [-3, 170, 51],
      [3, 170, 51],
    ]);
    k.add(
      block([0, 6, 0], 120, 12, 120, 3),
      lathe([[18, 12], [10, 380]], 10),
      block([0, 392, 10], 32, 28, 76, 8),
      ellipsoid([0, 392, 50], 14, 14, 12, 3, 8),
      ...[0, 120, 240].map((a) => rotate(rotate(blade, "z", 0), "z", a, [0, 0, 0])).map((b) => b.map((t) => t.map(([x, y, z]) => [x, y + 392, z] as P3) as [P3, P3, P3])),
    );
  }),
  ars({ id: "rumah-modern", title: "Rumah Modern 2 Lantai", description: "Maket arsitek: lantai atas menjorok, atap datar, jendela kaca lebar, tangga luar, dan carport bertiang.", difficulty: "sedang", minutes: 70, age: 9, tags: ["arsitek", "maket", "rumah"] }, 420, "Lebar papan", (k) =>
    k.add(
      block([0, 4, 0], 420, 8, 300, 2),
      block([-40, 68, 0], 200, 120, 140),
      block([30, 178, -10], 220, 100, 150),
      block([-40, 132, 0], 216, 8, 156),
      block([30, 232, -10], 236, 8, 166),
      block([-40, 70, 72], 120, 70, 4),
      block([30, 180, 66], 150, 60, 4),
      ...[0, 1, 2, 3, 4].map((i) => block([100 + i * 14, 16 + i * 14, 90], 14, 14 + i * 28, 40)),
      ...both((s) => [cyl([170, 8, s * 40], [170, 120, s * 40], 4, 6)]),
      block([160, 124, 0], 100, 6, 110, 2),
    ),
  ),
  ars({ id: "truk-molen", title: "Truk Molen", description: "Truk pengaduk semen dengan tangki molen miring, corong tuang, tangki air, kabin, dan enam roda.", difficulty: "sedang", minutes: 75, age: 7, tags: ["konstruksi", "kendaraan", "alat berat"] }, 450, "Panjang", (k) =>
    k.add(
      block([200, 50, 0], 380, 20, 130, 3),
      block([370, 110, 0], 80, 110, 140, 10),
      rotate(lathe([[0, 0], [50, 40], [70, 120], [60, 170], [30, 200]], 12), "z", 70, [0, 0, 0]).map((t) => t.map(([x, y, z]) => [x + 330, y + 70, z] as P3) as [P3, P3, P3]),
      beam([90, 150, 0], [30, 110, 0], 16, 6),
      cyl([150, 80, -60], [150, 80, -40], 20, 10),
      ...[60, 130, 360].flatMap((x) => both((s) => [wheel(x, 36, s * 58, s * 76, 36)])),
    ),
  ),
];

/* ================================================================== */
/* Ilmuwan                                                             */
/* ================================================================== */

const ilm = T("ilmuwan");
function helix(phase: number): P3[] {
  return Array.from({ length: 17 }, (_, i) => {
    const t = (i / 16) * Math.PI * 4 + phase;
    return [Math.cos(t) * 50, 30 + (i / 16) * 300, Math.sin(t) * 50] as P3;
  });
}
const ILMUWAN: Template[] = [
  ilm({ id: "proyektor-planetarium", title: "Proyektor Planetarium", description: "Kotak berlubang bintang di lima sisi. Masukkan senter dari lubang bawah dan matikan lampu kamar.", difficulty: "mudah", minutes: 40, age: 7, tags: ["sains", "astronomi", "lampu"], featured: true }, 200, "Sisi", (k) =>
    k.box(
      {
        W: 180,
        D: 180,
        H: 180,
        lid: "glued",
        holes: { base: [circ(90, 90, 26)], front: stars(11, 180, 180, 26), back: stars(23, 180, 180, 26), left: stars(37, 180, 180, 26), right: stars(51, 180, 180, 26), lid: stars(67, 180, 180, 30) },
        labels: { base: "Alas (lubang senter)" },
      },
      FLAT,
      [0, 40, 0],
      "Kubus bintang",
    ).add(...[[20, 20], [160, 20], [90, 160]].map(([x, z]) => cyl([x, 0, z], [x, 40, z], 8, 8))),
  ),
  ilm({ id: "model-tata-surya", title: "Model Tata Surya", description: "Orrery pajangan: matahari di puncak tiang dan delapan planet di lengan berbeda panjang, Saturnus bercincin.", difficulty: "sedang", minutes: 70, age: 8, tags: ["sains", "astronomi", "planet"] }, 520, "Lebar", (k) => {
    const planets = [
      [70, 4, 6],
      [95, 7, 7],
      [120, 8, 8],
      [145, 6, 7],
      [180, 22, 9],
      [215, 18, 10],
      [240, 12, 11],
      [262, 12, 12],
    ];
    k.add(
      lathe([[90, 0], [90, 10], [20, 16], [0, 16]], 16),
      cyl([0, 16, 0], [0, 250, 0], 5, 8),
      ellipsoid([0, 270, 0], 34, 34, 34, 5, 12),
      ...planets.flatMap(([r, size, h], i) => {
        const a = i * 2.4;
        const y = 70 + h * 12;
        const p: P3 = [Math.cos(a) * r, y, Math.sin(a) * r];
        const arm = [beam([0, y, 0], [p[0], y, p[2]], 3, 3), ellipsoid(p, size, size, size, 4, 8)];
        if (i === 5) arm.push(tube(ringPath(p, size * 1.8, 14), 2, 1, 4, true));
        return arm;
      }),
    );
  }),
  ilm({ id: "mikroskop", title: "Mikroskop", description: "Replika mikroskop: alas, lengan melengkung, meja preparat berjepit, tabung, lensa okuler, revolver, dan kenop fokus.", difficulty: "sedang", minutes: 55, age: 8, tags: ["sains", "laboratorium"] }, 300, "Tinggi", (k) =>
    k.add(
      block([0, 10, 0], 120, 20, 160, 6),
      tube([[0, 20, -50], [0, 120, -60], [0, 200, -40], [0, 236, 0]], [14, 16, 16, 14]),
      block([0, 110, 20], 90, 8, 90, 2),
      ...both((s) => [block([s * 25, 116, 30], 10, 4, 40, 1), cyl([s * 16, 160, -52], [s * 30, 160, -52], 16, 12)]),
      cyl([0, 170, 30], [0, 262, 30], 14, 12),
      cyl([0, 262, 30], [0, 292, 30], 10, 10),
      lathe([[20, 0], [16, 8], [0, 10]], 10, [0, 160, 30]),
      cyl([0, 160, 30], [0, 140, 30], 6, 8, 4),
      cyl([0, 20, 30], [0, 28, 30], 16, 12),
    ),
  ),
  ilm({ id: "teleskop", title: "Teleskop", description: "Teleskop di atas tripod: tabung panjang dengan tudung embun, lensa okuler, dan teleskop pencari kecil.", difficulty: "sedang", minutes: 55, age: 8, tags: ["sains", "astronomi"] }, 460, "Panjang", (k) =>
    k.add(
      ...[0, 120, 240].map((a) => {
        const t = (a * Math.PI) / 180;
        return beam([Math.cos(t) * 130, 0, Math.sin(t) * 130], [0, 290, 0], 9, 9);
      }),
      block([0, 300, 0], 36, 30, 36, 4),
      cyl([-160, 320, 0], [200, 372, 0], 30, 14),
      cyl([170, 368, 0], [250, 380, 0], 36, 14),
      cyl([-160, 320, 0], [-196, 314, 0], 9, 8),
      cyl([-90, 360, 0], [40, 378, 0], 8, 8),
      ...[-60, 20].map((x) => beam([x, 340, 0], [x, 360, 0], 4, 4)),
    ),
  ),
  ilm({ id: "gunung-berapi", title: "Model Gunung Berapi", description: "Gunung dengan kawah cekung, aliran lava, pepohonan, dan kepulan asap. Cocok untuk percobaan letusan soda kue.", difficulty: "mudah", minutes: 40, age: 6, tags: ["sains", "geografi", "eksperimen"] }, 380, "Lebar", (k) =>
    k.add(
      block([0, 4, 0], 380, 8, 380, 3),
      lathe([[180, 8], [150, 40], [90, 130], [48, 190], [40, 196], [30, 186], [0, 180]], 16),
      ...[0, 2.1, 4.2].map((a) => tube([0, 0.5, 1, 1.5].map((f) => [Math.cos(a + f * 0.3) * (44 + f * 90), 194 - f * 110, Math.sin(a + f * 0.3) * (44 + f * 90)] as P3), [10, 12, 12, 10], [4, 4, 4, 4], 6)),
      ...[[150, 120], [-150, 130], [140, -140], [-130, -150]].map(([x, z]) => lathe([[18, 8], [16, 40], [0, 70]], 8, [x, 0, z])),
      ...[[0, 230, 0, 30], [20, 268, 10, 24], [-10, 300, 0, 18]].map(([x, y, z, r]) => ellipsoid([x, y, z], r, r * 0.8, r, 3, 8)),
    ),
  ),
  ilm({ id: "model-dna", title: "Model DNA", description: "Heliks ganda dua untai berpilin dengan pasangan basa di antaranya, berdiri di tiang dan alas.", difficulty: "sedang", minutes: 60, age: 10, tags: ["sains", "biologi"] }, 360, "Tinggi", (k) => {
    const a = helix(0),
      b = helix(Math.PI);
    k.add(
      lathe([[80, 0], [80, 12], [20, 18], [0, 18]], 14),
      cyl([0, 18, 0], [0, 340, 0], 4, 6),
      tube(a, 6, 6, 6),
      tube(b, 6, 6, 6),
      ...[1, 3, 5, 7, 9, 11, 13, 15].map((i) => beam(a[i], b[i], 4, 4)),
    );
  }),
];

/* ================================================================== */
/* Dokter hewan                                                        */
/* ================================================================== */

const vet = T("dokterhewan");
/** Anjing berdiri menghadap +X. */
function dog(o: P3): Part[] {
  const p = (x: number, y: number, z: number): P3 => [o[0] + x, o[1] + y, o[2] + z];
  return [
    ellipsoid(p(0, 80, 0), 60, 30, 26, 4, 10),
    tube([p(45, 92, 0), p(64, 120, 0)], [16, 14], [18, 16]),
    ellipsoid(p(74, 136, 0), 22, 20, 20, 4, 10),
    ellipsoid(p(98, 128, 0), 16, 10, 11, 3, 8),
    ellipsoid(p(112, 130, 0), 5, 5, 5, 3, 6),
    ...both((s) => [hull([p(66, 150, s * 12), p(76, 152, s * 18), p(60, 118, s * 24), p(70, 116, s * 26)])]),
    ...[38, -38].flatMap((x) => both((s) => [tube([p(x, 70, s * 14), p(x + 2, 36, s * 15), p(x + 4, 6, s * 15)], [9, 7, 6], [9, 7, 6], 6), ellipsoid(p(x + 8, 4, s * 15), 9, 4, 7, 3, 6)])),
    tube([p(-56, 90, 0), p(-74, 116, 0), p(-80, 140, 0)], [6, 5, 3]),
    tube(ringPath(p(58, 112, 0), 18, 10, "xz"), 3, 3, 4, true),
  ];
}
const DOKTERHEWAN: Template[] = [
  vet({ id: "klinik-hewan", title: "Klinik Hewan", description: "Bangunan klinik terbuka di depan untuk main peran: jendela, atap pelana, papan nama berpalang, dan meja periksa.", difficulty: "sedang", minutes: 60, age: 5, tags: ["dokter hewan", "main peran", "bangunan"] }, 380, "Lebar", (k) =>
    k
      .box({ W: 360, D: 240, H: 160, lid: "open", holes: { base: [rectPoints(60, 50, 90, 70), rectPoints(210, 50, 90, 70)], left: [rectPoints(50, 70, 60, 70)], right: [rectPoints(50, 70, 60, 70)] }, labels: { base: "Dinding belakang", front: "Lantai", back: "Plafon" } }, STAND, [0, 240, 0], "Ruang klinik")
      .add(
        hull([...[-10, 370].flatMap((x) => [[x, 238, -10] as P3, [x, 238, 170] as P3]), [-10, 300, 80], [370, 300, 80]]),
        block([180, 268, 172], 160, 40, 6, 2),
        prism(plus(120, 268, 14, 5), "xy", 175, 179),
        block([180, 50, 80], 120, 10, 70, 2),
        ...[130, 230].map((x) => block([x, 22, 80], 10, 44, 60, 1)),
      ),
  ),
  vet({ id: "meja-periksa-hewan", title: "Meja Periksa Hewan", description: "Meja periksa dengan rak bawah, timbangan hewan, dan lampu periksa berlengan.", difficulty: "mudah", minutes: 45, age: 6, tags: ["dokter hewan", "main peran"] }, 300, "Panjang", (k) =>
    k.add(
      block([0, 120, 0], 260, 12, 140, 4),
      ...[-120, 120].flatMap((x) => [-60, 60].map((z) => block([x, 57, z], 12, 114, 12, 2))),
      block([0, 40, 0], 250, 8, 130, 2),
      block([60, 132, 0], 90, 10, 80, 4),
      cyl([60, 137, 42], [60, 137, 50], 16, 12),
      cyl([-110, 126, -50], [-110, 132, -50], 20, 10),
      tube([[-110, 132, -50], [-110, 230, -50], [-70, 270, -30], [-40, 250, -20]], 5),
      lathe([[6, 0], [30, -24], [0, -26]], 10, [-40, 252, -20]),
    ),
  ),
  vet({ id: "kandang-rawat-inap", title: "Kandang Rawat Inap", description: "Kandang pasien bertutup selip dengan jeruji depan, lubang udara di samping, dan pegangan.", difficulty: "mudah", minutes: 40, age: 6, tags: ["dokter hewan", "kandang", "main peran"] }, 270, "Panjang", (k) =>
    k
      .box(
        {
          W: 260,
          D: 180,
          H: 180,
          lid: "tuck",
          holes: { front: Array.from({ length: 8 }, (_, i) => stadiumPoints([30 + i * 28.5, 95], 12, 120)), left: [circ(60, 110, 12), circ(120, 110, 12)], right: [circ(60, 110, 12), circ(120, 110, 12)] },
          labels: { front: "Jeruji depan" },
        },
        FLAT,
        [0, 0, 0],
        "Kandang",
      )
      .add(tube([[100, 182, 90], [105, 214, 90], [155, 214, 90], [160, 182, 90]], 7)),
  ),
  vet({ id: "boneka-anjing-pasien", title: "Boneka Anjing Pasien", description: "Anjing berdiri dengan telinga terkulai, moncong, ekor terangkat, dan kalung. Siap diperiksa.", difficulty: "sedang", minutes: 60, age: 6, tags: ["dokter hewan", "anjing", "hewan"] }, 230, "Panjang", (k) => k.add(block([0, -4, 0], 220, 8, 110, 3), ...dog([-10, 0, 0]))),
  vet({ id: "boneka-kucing-pasien", title: "Boneka Kucing Pasien", description: "Kucing duduk dengan perban di kaki depan, telinga runcing, kumis, dan ekor melingkar.", difficulty: "sedang", minutes: 55, age: 6, tags: ["dokter hewan", "kucing", "hewan"] }, 230, "Tinggi", (k) =>
    k.add(
      block([0, 4, 0], 150, 8, 170, 3),
      ellipsoid([0, 62, -20], 50, 50, 56, 4, 10),
      ellipsoid([0, 120, 10], 32, 52, 32, 4, 10),
      ...both((s) => [cyl([s * 15, 8, 38], [s * 13, 100, 24], 8, 8, 9), ellipsoid([s * 15, 12, 44], 10, 6, 12, 3, 6), hull([[s * 8, 196, 14], [s * 24, 196, 8], [s * 18, 196, 26], [s * 20, 226, 14]])]),
      tube(ringPath([15, 50, 34], 11, 10, "xz"), 3, 5, 4, true),
      ellipsoid([0, 180, 18], 30, 28, 28, 4, 10),
      ellipsoid([0, 172, 42], 12, 9, 9, 3, 8),
      tube([[0, 16, -74], [40, 12, -56], [56, 12, -10], [48, 12, 40]], 6, 6, 6),
    ),
  ),
  vet({ id: "ambulans-hewan", title: "Ambulans Hewan", description: "Mobil ambulans hewan dengan kabin, lampu sirene, tanda palang dan tapak kaki timbul, serta empat roda.", difficulty: "sedang", minutes: 70, age: 6, tags: ["dokter hewan", "kendaraan", "main peran"] }, 400, "Panjang", (k) =>
    k.add(
      block([150, 120, 0], 280, 180, 160, 10),
      hull([[290, 40, -78], [290, 40, 78], [380, 40, -72], [380, 40, 72], [380, 110, -70], [380, 110, 70], [330, 170, -72], [330, 170, 72], [290, 170, -78], [290, 170, 78]]),
      block([300, 216, 0], 40, 14, 120, 3),
      ...both((s) => [block([300, 224, s * 40], 30, 12, 26, 3)]),
      prism(plus(150, 130, 34, 10), "xy", 80, 84),
      ellipsoid([60, 140, 82], 16, 14, 4, 3, 8),
      ...[[44, 162], [60, 168], [76, 162]].map(([x, y]) => ellipsoid([x, y, 82], 6, 6, 3, 3, 6)),
      ...[70, 330].flatMap((x) => both((s) => [wheel(x, 36, s * 72, s * 90, 36)])),
    ),
  ),
];

export const CITACITA: Template[] = [...DOKTER, ...PILOT, ...CHEF, ...PEMADAM, ...ARSITEK, ...ILMUWAN, ...DOKTERHEWAN];

