import { composeAffine, applyAffine, type Affine, type Design, type DesignAsset, type Print } from "./decals";
import { buildProfile, NetBuilder } from "./geometry/builder";
import { bbox, dist, pointInPanel, segmentsCross, signedArea } from "./geometry/polygon";
import type { NetBase, Panel, Vec2 } from "./geometry/types";
import { edgeColor, layerRegions, type Analysis } from "./trace";
import { uid } from "./utils";

export type Construction = "relief" | "ekstrusi" | "kotak" | "berdiri";

export const CONSTRUCTIONS: { id: Construction; label: string; hint: string }[] = [
  { id: "relief", label: "Relief berlapis", hint: "Lapisan kardus bertumpuk makin kecil ke tengah, seperti patung kardus." },
  { id: "ekstrusi", label: "Ekstrusi samping", hint: "Foto jadi sisi kiri & kanan, dinding melingkar mengikuti bentuk." },
  { id: "kotak", label: "Kotak bentuk siluet", hint: "Foto jadi tutup kotak, dinding mengikuti kontur." },
  { id: "berdiri", label: "Siluet berdiri", hint: "Potongan foto berdiri di atas alas. Paling mudah." },
];

export interface BuildOpts {
  construction: Construction;
  /** Lebar objek jadi (mm). */
  width: number;
  /** Kedalaman/tinggi dinding (mm). */
  depth: number;
  tab: number;
  layers: number;
  detail: number;
  print: boolean;
  keepHoles: boolean;
  thickness: number;
}

export interface PhotoBuild {
  net: NetBase;
  design: Design;
}

/* ------------------------- transform bantu ------------------------- */

/** Afin kuadrat terkecil: titik gambar → titik pola (3+ titik tidak segaris). */
function fitAffine(src: Vec2[], dst: Vec2[]): Affine {
  let sxx = 0,
    sxy = 0,
    sx = 0,
    syy = 0,
    sy = 0,
    n = 0;
  const bx = [0, 0, 0];
  const by = [0, 0, 0];
  src.forEach(([x, y], i) => {
    const [u, v] = dst[i];
    sxx += x * x;
    sxy += x * y;
    sx += x;
    syy += y * y;
    sy += y;
    n++;
    bx[0] += x * u;
    bx[1] += y * u;
    bx[2] += u;
    by[0] += x * v;
    by[1] += y * v;
    by[2] += v;
  });
  const M = [
    [sxx, sxy, sx],
    [sxy, syy, sy],
    [sx, sy, n],
  ];
  const solve = (b: number[]) => {
    const A = M.map((r, i) => [...r, b[i]]);
    for (let c = 0; c < 3; c++) {
      let p = c;
      for (let r = c + 1; r < 3; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      [A[c], A[p]] = [A[p], A[c]];
      for (let r = 0; r < 3; r++) {
        if (r === c) continue;
        const f = A[r][c] / (A[c][c] || 1e-12);
        for (let k = c; k < 4; k++) A[r][k] -= f * A[c][k];
      }
    }
    return [A[0][3] / (A[0][0] || 1e-12), A[1][3] / (A[1][1] || 1e-12), A[2][3] / (A[2][2] || 1e-12)];
  };
  const [a, c, e] = solve(bx);
  const [b, d, f] = solve(by);
  return [a, b, c, d, e, f];
}

const map = (m: Affine, poly: Vec2[]) => poly.map(([x, y]) => applyAffine(m, x, y) as Vec2);

/** Tambahkan lubang (koordinat gambar) ke panel bila benar-benar di dalam panel. */
function addHoles(p: Panel, holes: Vec2[][], m: Affine) {
  for (const h of holes) {
    const q = map(m, h);
    if (!q.every((v) => pointInPanel(v, p.points))) continue;
    let ok = true;
    for (let i = 0; i < q.length && ok; i++) for (let j = 0; j < p.points.length; j++) if (segmentsCross(q[i], q[(i + 1) % q.length], p.points[j], p.points[(j + 1) % p.points.length], 1e-6)) ok = false;
    if (ok) p.holes = [...(p.holes ?? []), q];
  }
}

/* ------------------------- profil dari kontur ------------------------- */

/** Indeks titik di selubung cembung (urut naik). */
function hullIndices(poly: Vec2[]) {
  const idx = poly.map((_, i) => i).sort((a, b) => poly[a][0] - poly[b][0] || poly[a][1] - poly[b][1]);
  const cr = (o: number, a: number, b: number) => (poly[a][0] - poly[o][0]) * (poly[b][1] - poly[o][1]) - (poly[a][1] - poly[o][1]) * (poly[b][0] - poly[o][0]);
  const half = (list: number[]) => {
    const h: number[] = [];
    for (const i of list) {
      while (h.length >= 2 && cr(h[h.length - 2], h[h.length - 1], i) <= 0) h.pop();
      h.push(i);
    }
    return h;
  };
  return [...new Set([...half(idx), ...half([...idx].reverse())])].sort((a, b) => a - b);
}

/** Alas = tali busur selubung cembung (bawah atau terpanjang); cekungan di bawahnya ditutup. */
function seatOnBase(poly: Vec2[], prefer: "bottom" | "longest"): Vec2[] {
  const hull = hullIndices(poly);
  const n = poly.length;
  let best: [number, number] | null = null;
  let score = -Infinity;
  for (let k = 0; k < hull.length; k++) {
    const a = hull[k];
    const b = hull[(k + 1) % hull.length];
    const L = dist(poly[a], poly[b]);
    const pocket = (b - a - 1 + n) % n;
    const sc = prefer === "longest" ? L - pocket * 2 : (poly[a][1] + poly[b][1]) / 2 + L * 0.15 - pocket * 4 - (Math.abs(poly[b][1] - poly[a][1]) / (L || 1)) * 30;
    if (sc > score) ((score = sc), (best = [a, b]));
  }
  if (!best) return poly;
  const [a, b] = best;
  const out: Vec2[] = [poly[a]];
  for (let i = b; i !== a; i = (i + 1) % n) out.push(poly[i]);
  return out;
}

/** Profil mm (y ke atas, CCW, sisi pertama horizontal di (0,0)→(L,0)) + titik gambar asalnya. */
function toProfile(poly: Vec2[], s: number, minEdge: number) {
  let src = [...poly];
  const A = src[0];
  const B = src[1];
  let pts = src.map(([x, y]) => [x * s, -y * s] as Vec2);
  if (signedArea(pts) < 0) {
    pts = pts.reverse();
    src = src.reverse();
  }
  const keepI: number[] = [];
  pts.forEach((p, i) => {
    const isBase = src[i] === A || src[i] === B;
    if (!keepI.length || isBase || dist(pts[keepI[keepI.length - 1]], p) >= minEdge) keepI.push(i);
  });
  if (keepI.length > 3) {
    const last = keepI[keepI.length - 1];
    if (dist(pts[last], pts[keepI[0]]) < minEdge && src[last] !== A && src[last] !== B) keepI.pop();
  }
  pts = keepI.map((i) => pts[i]);
  src = keepI.map((i) => src[i]);
  const n = pts.length;
  let start = src.findIndex((p, i) => (p === A && src[(i + 1) % n] === B) || (p === B && src[(i + 1) % n] === A));
  if (start < 0) start = 0;
  pts = [...pts.slice(start), ...pts.slice(0, start)];
  src = [...src.slice(start), ...src.slice(0, start)];
  const [a, b] = [pts[0], pts[1]];
  const ang = -Math.atan2(b[1] - a[1], b[0] - a[0]);
  const c = Math.cos(ang),
    sn = Math.sin(ang);
  const profile = pts.map(([x, y]) => {
    const dx = x - a[0],
      dy = y - a[1];
    return [dx * c - dy * sn, dx * sn + dy * c] as Vec2;
  });
  return { profile, src };
}

/* ------------------------- aset & cetakan ------------------------- */

function swatch(rgb: [number, number, number]): Omit<DesignAsset, "id"> {
  const c = document.createElement("canvas");
  c.width = c.height = 4;
  const g = c.getContext("2d")!;
  g.fillStyle = `rgb(${rgb.map((v) => Math.round(v)).join(",")})`;
  g.fillRect(0, 0, 4, 4);
  return { name: "warna sisi", src: c.toDataURL("image/png"), w: 4, h: 4, hidden: true };
}

class DesignBuilder {
  assets: DesignAsset[] = [];
  prints: Print[] = [];
  private photoId: string | null = null;
  private swatches = new Map<string, string>();
  constructor(private a: Analysis) {}

  /** Afin piksel aset foto → piksel kerja. */
  get photoToWork(): Affine {
    const { k, x0, y0 } = this.a.cutout;
    return [1 / k, 0, 0, 1 / k, x0, y0];
  }

  photo(panelId: string, workToNet: Affine) {
    if (!this.photoId) {
      this.photoId = uid("a_");
      const c = this.a.cutout;
      this.assets.push({ id: this.photoId, name: "foto objek", src: c.src, w: c.w, h: c.h });
    }
    this.prints.push({ panelId, assetId: this.photoId, matrix: composeAffine(workToNet, this.photoToWork) });
  }

  color(p: Panel, rgb: [number, number, number]) {
    const key = rgb.map((v) => Math.round(v / 8)).join(",");
    let id = this.swatches.get(key);
    if (!id) {
      id = uid("a_");
      this.swatches.set(key, id);
      this.assets.push({ id, ...swatch(rgb) });
    }
    const b = bbox(p.points);
    this.prints.push({ panelId: p.id, assetId: id, matrix: [(b.maxX - b.minX) / 4, 0, 0, (b.maxY - b.minY) / 4, b.minX, b.minY] });
  }

  design(): Design {
    return { assets: this.assets, decals: [], prints: this.prints };
  }
}

/* ------------------------- pembangun ------------------------- */

export function buildPattern(a: Analysis, o: BuildOpts): PhotoBuild {
  const outer = a.region.outer;
  const ob = bbox(outer);
  const s = o.width / Math.max(1, ob.maxX - ob.minX);
  const db = new DesignBuilder(a);
  const holes = o.keepHoles ? a.region.holes : [];

  if (o.construction === "relief") return relief(a, o, s, db);

  const seated = seatOnBase(outer, o.construction === "kotak" ? "longest" : "bottom");
  const { profile, src } = toProfile(seated, s, Math.max(6, o.thickness * 2.5));

  let nb: NetBuilder;
  let photoPanels: string[];
  if (o.construction === "berdiri") {
    const L = dist(profile[0], profile[1]);
    nb = new NetBuilder();
    nb.add({
      id: "base",
      label: "Alas",
      kind: "face",
      points: [
        [0, 0],
        [L, 0],
        [L, o.depth],
        [0, o.depth],
      ],
    });
    nb.attach("base", [0, 0], [L, 0], profile, { id: "siluet", label: "Siluet", angle: 84 });
    photoPanels = ["siluet"];
  } else {
    nb = buildProfile({
      profile,
      depth: o.depth,
      tab: o.tab,
      root: o.construction === "kotak" ? "sideA" : "strip",
      sideBTabs: true,
      labels: o.construction === "kotak" ? { A: "Alas", B: "Tutup bergambar", strip: (i) => `Dinding ${i + 1}` } : { A: "Sisi kiri", B: "Sisi kanan", strip: (i) => (i === 0 ? "Alas" : `Sisi ${i + 1}`) },
    });
    photoPanels = ["sideA", "sideB"];
  }

  for (const id of photoPanels) {
    const p = nb.panels.find((x) => x.id === id);
    if (!p) continue;
    const m = fitAffine(src, p.points);
    addHoles(p, holes, m);
    if (o.print) db.photo(p.id, m);
  }
  if (o.print) {
    if (o.construction === "berdiri") {
      const base = nb.panels.find((x) => x.id === "base")!;
      db.color(base, edgeColor(a, src[0], src[1], src));
    } else {
      for (const p of nb.panels) {
        const m = /^strip(\d+)$/.exec(p.id);
        if (!m) continue;
        const i = Number(m[1]);
        db.color(p, edgeColor(a, src[i], src[(i + 1) % src.length], src));
      }
    }
  }
  return { net: nb.build(o.construction !== "berdiri"), design: db.design() };
}

/** Relief berlapis: lapisan dari transformasi jarak, ditumpuk & berdiri menghadap depan. */
function relief(a: Analysis, o: BuildOpts, s: number, db: DesignBuilder): PhotoBuild {
  const regions = layerRegions(a, Math.max(1, o.layers), o.detail, o.keepHoles);
  const t = Math.max(0.3, o.thickness);
  const gap = 8;
  const panels: Panel[] = [];
  // tata letak sederhana per baris
  const boxes = regions.map((r) => bbox(r.outer.map(([x, y]) => [x * s, y * s] as Vec2)));
  const rowMax = Math.max(o.width * 2.2, ...boxes.map((b) => b.maxX - b.minX));
  let x = 0,
    y = 0,
    rowH = 0;
  regions.forEach((r, k) => {
    const b = boxes[k];
    const w = b.maxX - b.minX;
    const h = b.maxY - b.minY;
    if (x > 0 && x + w > rowMax) {
      x = 0;
      y += rowH + gap;
      rowH = 0;
    }
    const off: Vec2 = [x - b.minX, y - b.minY];
    x += w + gap;
    rowH = Math.max(rowH, h);
    const m: Affine = [s, 0, 0, s, off[0], off[1]];
    // pose akhir = R · T(−off.x, −k·t, −off.y): geser kembali ke posisi gambar, turunkan k lapis
    // ke arah sisi cetak, lalu tegakkan menghadap depan. R: X→(−1,0,0), Y→(0,0,−1), Z→(0,−1,0).
    const pose = [-1, 0, 0, 0, 0, 0, -1, 0, 0, -1, 0, 0, off[0], off[1], k * t, 1];
    const p: Panel = {
      id: `layer${k}`,
      label: k === 0 ? "Lapisan dasar" : `Lapisan ${k + 1}`,
      kind: "face",
      points: map(m, r.outer),
      rootPose: pose,
    };
    addHoles(p, o.keepHoles ? r.holes : [], m);
    panels.push(p);
    if (o.print) db.photo(p.id, m);
  });
  return { net: { panels, closed: false, stacked: true }, design: db.design() };
}
