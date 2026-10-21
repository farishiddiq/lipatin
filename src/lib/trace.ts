import { area, dist, pointInPanel, segmentsCross, signedArea } from "./geometry/polygon";
import type { Vec2 } from "./geometry/types";

/**
 * Fitur B — gambar → pola. Analisis foto: segmentasi objek, kontur halus, lubang,
 * transformasi jarak (untuk relief berlapis), dan potongan foto bertransparansi.
 * Masih deteksi kontur 2D, bukan rekonstruksi 3D dari foto.
 */

export type TraceErrorCode = "no-object" | "low-contrast" | "too-complex" | "unreadable";

export class TraceError extends Error {
  constructor(
    public code: TraceErrorCode,
    message: string,
  ) {
    super(message);
  }
}

const TIPS: Record<TraceErrorCode, string> = {
  "no-object": "Objek tidak terdeteksi. Pakai foto dengan satu objek besar di tengah, atau naikkan sensitivitas latar.",
  "low-contrast": "Latar dan objek kurang kontras. Foto di atas latar polos (kertas/dinding) atau turunkan sensitivitas latar.",
  "too-complex": "Bentuknya terlalu rumit untuk dilipat. Kurangi detail atau pakai foto dengan bentuk lebih sederhana.",
  "unreadable": "Gambar tidak bisa dibaca. Coba PNG atau JPG lain.",
};

export const traceTip = (c: TraceErrorCode) => TIPS[c];

export interface Region {
  outer: Vec2[];
  holes: Vec2[][];
}

export interface Analysis {
  w: number;
  h: number;
  rgba: Uint8ClampedArray;
  mask: Uint8Array;
  /** Kontur luar yang sudah dihaluskan (piksel kerja). */
  contour: Vec2[];
  region: Region;
  /** Kemiripan poligon terhadap masker (IoU 0–1). */
  fidelity: number;
  dist: Float32Array;
  maxDist: number;
  /** Potongan foto (PNG transparan) — piksel aset (ax, ay) ↔ piksel kerja (x0 + ax/k, y0 + ay/k). */
  cutout: { src: string; w: number; h: number; x0: number; y0: number; k: number };
  /** Warna rata-rata objek. */
  color: [number, number, number];
}

export interface AnalyzeOpts {
  detail: number;
  /** 0,5 (latar sempit) – 2 (latar lebar). */
  sensitivity: number;
  keepHoles: boolean;
}

const WORK = 320;

/* ------------------------------------------------------------------ */
/* Utilitas masker                                                     */
/* ------------------------------------------------------------------ */

interface Comps {
  label: Int32Array;
  size: number[];
  start: number[];
  border: boolean[];
}

function components(mask: Uint8Array, w: number, h: number, value = 1): Comps {
  const label = new Int32Array(w * h).fill(-1);
  const size: number[] = [];
  const start: number[] = [];
  const border: boolean[] = [];
  const stack: number[] = [];
  for (let i = 0; i < w * h; i++) {
    if (mask[i] !== value || label[i] >= 0) continue;
    const id = size.length;
    let n = 0;
    let touch = false;
    label[i] = id;
    stack.push(i);
    while (stack.length) {
      const p = stack.pop()!;
      n++;
      const x = p % w;
      const y = (p / w) | 0;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) touch = true;
      if (x > 0 && mask[p - 1] === value && label[p - 1] < 0) ((label[p - 1] = id), stack.push(p - 1));
      if (x < w - 1 && mask[p + 1] === value && label[p + 1] < 0) ((label[p + 1] = id), stack.push(p + 1));
      if (y > 0 && mask[p - w] === value && label[p - w] < 0) ((label[p - w] = id), stack.push(p - w));
      if (y < h - 1 && mask[p + w] === value && label[p + w] < 0) ((label[p + w] = id), stack.push(p + w));
    }
    size.push(n);
    start.push(i);
    border.push(touch);
  }
  return { label, size, start, border };
}

function morph(mask: Uint8Array, w: number, h: number, dilate: boolean) {
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let v = dilate ? 0 : 1;
      for (let dy = -1; dy <= 1 && v === (dilate ? 0 : 1); dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          const m = xx < 0 || yy < 0 || xx >= w || yy >= h ? 0 : mask[yy * w + xx];
          if (dilate && m) {
            v = 1;
            break;
          }
          if (!dilate && !m) {
            v = 0;
            break;
          }
        }
      out[y * w + x] = v;
    }
  return out;
}

function otsu(hist: Uint32Array, total: number) {
  let sum = 0;
  for (let i = 0; i < hist.length; i++) sum += i * hist[i];
  let sumB = 0,
    wB = 0,
    best = 0,
    thr = 0;
  for (let i = 0; i < hist.length; i++) {
    wB += hist[i];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += i * hist[i];
    const v = wB * wF * (sumB / wB - (sum - sumB) / wF) ** 2;
    if (v > best) ((best = v), (thr = i));
  }
  return thr;
}

/** Klaster k-means kecil untuk warna latar dari piksel tepi. */
function kmeans(samples: number[][], k: number) {
  const centers = Array.from({ length: k }, (_, i) => [...samples[Math.floor(((i + 0.5) / k) * samples.length)]]);
  for (let it = 0; it < 8; it++) {
    const acc = centers.map(() => [0, 0, 0, 0]);
    for (const s of samples) {
      let bi = 0,
        bd = Infinity;
      centers.forEach((c, i) => {
        const d = (s[0] - c[0]) ** 2 + (s[1] - c[1]) ** 2 + (s[2] - c[2]) ** 2;
        if (d < bd) ((bd = d), (bi = i));
      });
      acc[bi][0] += s[0];
      acc[bi][1] += s[1];
      acc[bi][2] += s[2];
      acc[bi][3]++;
    }
    acc.forEach((a, i) => {
      if (a[3]) centers[i] = [a[0] / a[3], a[1] / a[3], a[2] / a[3]];
    });
  }
  return centers;
}

/** Penelusuran tetangga Moore untuk satu wilayah berlabel. */
function moore(inside: (x: number, y: number) => boolean, sx: number, sy: number, limit: number): Vec2[] {
  const dirs: Vec2[] = [
    [-1, 0],
    [-1, -1],
    [0, -1],
    [1, -1],
    [1, 0],
    [1, 1],
    [0, 1],
    [-1, 1],
  ];
  const out: Vec2[] = [[sx, sy]];
  let cx = sx,
    cy = sy,
    from = 0;
  for (let guard = 0; guard < limit; guard++) {
    let found = false;
    for (let k = 1; k <= 8; k++) {
      const di = (from + k) % 8;
      const nx = cx + dirs[di][0];
      const ny = cy + dirs[di][1];
      if (inside(nx, ny)) {
        from = di % 2 === 0 ? (di + 5) % 8 : (di + 6) % 8;
        cx = nx;
        cy = ny;
        found = true;
        break;
      }
    }
    if (!found || (cx === sx && cy === sy)) break;
    out.push([cx, cy]);
  }
  return out;
}

/** Haluskan rantai piksel (rata-rata bergerak melingkar) agar tangga piksel hilang. */
function smoothChain(pts: Vec2[], r = 2): Vec2[] {
  const n = pts.length;
  if (n < 2 * r + 2) return pts;
  return pts.map((_, i) => {
    let x = 0,
      y = 0;
    for (let k = -r; k <= r; k++) {
      const p = pts[(i + k + n) % n];
      x += p[0];
      y += p[1];
    }
    return [x / (2 * r + 1), y / (2 * r + 1)] as Vec2;
  });
}

/* ------------------------------------------------------------------ */
/* Penyederhanaan                                                      */
/* ------------------------------------------------------------------ */

function dpOpen(pts: Vec2[], tol: number): Vec2[] {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const [ax, ay] = pts[a];
    const [bx, by] = pts[b];
    const L = Math.hypot(bx - ax, by - ay) || 1;
    let md = 0,
      mi = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((bx - ax) * (ay - pts[i][1]) - (ax - pts[i][0]) * (by - ay)) / L;
      if (d > md) ((md = d), (mi = i));
    }
    if (md > tol && mi > 0) {
      keep[mi] = 1;
      stack.push([a, mi], [mi, b]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

function dp(pts: Vec2[], tol: number): Vec2[] {
  let far = 0,
    fd = 0;
  pts.forEach((p, i) => {
    const d = dist(p, pts[0]);
    if (d > fd) ((fd = d), (far = i));
  });
  const a = dpOpen(pts.slice(0, far + 1), tol);
  const b = dpOpen([...pts.slice(far), pts[0]], tol);
  return [...a, ...b.slice(1, -1)];
}

function isSimple(poly: Vec2[]) {
  const n = poly.length;
  for (let i = 0; i < n; i++)
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      if (segmentsCross(poly[i], poly[(i + 1) % n], poly[j], poly[(j + 1) % n], 1e-6)) return false;
    }
  return true;
}

/** Sederhanakan kontur ke maks `maxVerts` titik, tanpa sisi yang saling memotong. */
export function simplifyContour(contour: Vec2[], maxVerts: number): Vec2[] {
  const xs = contour.map((p) => p[0]);
  const ys = contour.map((p) => p[1]);
  const diag = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  let lo = 0.15,
    hi = diag * 0.25,
    best: Vec2[] | null = null;
  for (let it = 0; it < 26; it++) {
    const tol = (lo + hi) / 2;
    const s = dp(contour, tol);
    if (s.length > maxVerts) lo = tol;
    else {
      if (s.length >= 3 && isSimple(s)) best = s;
      hi = tol;
    }
  }
  if (!best || best.length < 3 || area(best) < 1) throw new TraceError("too-complex", TIPS["too-complex"]);
  return best;
}

/* ------------------------------------------------------------------ */
/* Wilayah (luar + lubang) dari sebuah masker                          */
/* ------------------------------------------------------------------ */

/** Ambil komponen terbesar dari masker, lalu kontur luar + lubang yang cukup besar. */
export function maskRegion(mask: Uint8Array, w: number, h: number, detail: number, keepHoles: boolean, minFrac = 0.012) {
  const fg = components(mask, w, h, 1);
  if (!fg.size.length) return null;
  let best = 0;
  fg.size.forEach((s, i) => s > fg.size[best] && (best = i));
  const total = fg.size[best];
  const solid = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) solid[i] = fg.label[i] === best ? 1 : 0;
  const sx = fg.start[best] % w;
  const sy = (fg.start[best] / w) | 0;
  const raw = moore((x, y) => x >= 0 && y >= 0 && x < w && y < h && solid[y * w + x] === 1, sx, sy, w * h * 4);
  if (raw.length < 8) return null;
  const contour = smoothChain(raw, 2);
  const outer = simplifyContour(contour, detail);
  const holes: Vec2[][] = [];
  if (keepHoles) {
    const bg = components(solid, w, h, 0);
    bg.size.forEach((s, i) => {
      if (bg.border[i] || s < total * minFrac) return;
      const hx = bg.start[i] % w;
      const hy = (bg.start[i] / w) | 0;
      const hr = moore((x, y) => x >= 0 && y >= 0 && x < w && y < h && bg.label[y * w + x] === i, hx, hy, w * h * 4);
      if (hr.length < 8) return;
      try {
        const hp = simplifyContour(smoothChain(hr, 1), Math.max(6, Math.round(detail / 2)));
        if (hp.every((q) => pointInPanel(q, outer)) && !crosses(hp, outer)) holes.push(hp);
      } catch {}
    });
  }
  return { solid, contour, region: { outer, holes } as Region, area: total };
}

function crosses(a: Vec2[], b: Vec2[]) {
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) if (segmentsCross(a[i], a[(i + 1) % a.length], b[j], b[(j + 1) % b.length], 1e-6)) return true;
  return false;
}

/** Transformasi jarak chamfer (piksel di dalam objek → jarak ke latar). */
function distance(mask: Uint8Array, w: number, h: number) {
  const d = new Float32Array(w * h);
  const INF = 1e9;
  for (let i = 0; i < w * h; i++) d[i] = mask[i] ? INF : 0;
  const D = Math.SQRT2;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[y * w + x]);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!d[i]) continue;
      d[i] = Math.min(d[i], at(x - 1, y) + 1, at(x, y - 1) + 1, at(x - 1, y - 1) + D, at(x + 1, y - 1) + D);
    }
  let max = 0;
  for (let y = h - 1; y >= 0; y--)
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      if (!d[i]) continue;
      d[i] = Math.min(d[i], at(x + 1, y) + 1, at(x, y + 1) + 1, at(x + 1, y + 1) + D, at(x - 1, y + 1) + D);
      if (d[i] > max) max = d[i];
    }
  return { d, max };
}

/* ------------------------------------------------------------------ */
/* Analisis utama                                                      */
/* ------------------------------------------------------------------ */

export function analyzeImage(source: HTMLCanvasElement, o: AnalyzeOpts): Analysis {
  const k0 = Math.min(1, WORK / Math.max(source.width, source.height));
  const w = Math.max(16, Math.round(source.width * k0));
  const h = Math.max(16, Math.round(source.height * k0));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.drawImage(source, 0, 0, w, h);
  const rgba = g.getImageData(0, 0, w, h).data;
  const n = w * h;

  let mask = new Uint8Array(n);
  let transparent = 0;
  for (let i = 0; i < n; i++) if (rgba[i * 4 + 3] < 128) transparent++;
  let holeLike = new Uint8Array(n);

  if (transparent > n * 0.04) {
    for (let i = 0; i < n; i++) mask[i] = rgba[i * 4 + 3] >= 128 ? 1 : 0;
    for (let i = 0; i < n; i++) holeLike[i] = mask[i] ? 0 : 1;
  } else {
    // 1) warna latar = klaster dari piksel tepi
    const samples: number[][] = [];
    const push = (x: number, y: number) => {
      const i = (y * w + x) * 4;
      samples.push([rgba[i], rgba[i + 1], rgba[i + 2]]);
    };
    for (let x = 0; x < w; x += 2) (push(x, 0), push(x, 1), push(x, h - 1), push(x, h - 2));
    for (let y = 0; y < h; y += 2) (push(0, y), push(1, y), push(w - 1, y), push(w - 2, y));
    const centers = kmeans(samples, 3);
    // 2) jarak tiap piksel ke warna latar terdekat → ambang Otsu
    const dmin = new Float32Array(n);
    const hist = new Uint32Array(256);
    for (let i = 0; i < n; i++) {
      let best = Infinity;
      for (const cc of centers) best = Math.min(best, Math.hypot(rgba[i * 4] - cc[0], rgba[i * 4 + 1] - cc[1], rgba[i * 4 + 2] - cc[2]));
      dmin[i] = best;
      hist[Math.min(255, best / 1.7) | 0]++;
    }
    const thr = Math.max(14, Math.min(120, otsu(hist, n) * 1.7 * (1 / o.sensitivity)));
    const bgLike = new Uint8Array(n);
    for (let i = 0; i < n; i++) bgLike[i] = dmin[i] < thr ? 1 : 0;
    // lubang hanya bila warnanya benar-benar seperti latar (kaca/velg abu-abu tidak ikut terpotong)
    const strict = new Uint8Array(n);
    for (let i = 0; i < n; i++) strict[i] = dmin[i] < thr * 0.45 ? 1 : 0;
    // 3) latar = wilayah mirip-latar yang tersambung ke tepi gambar
    const reach = new Uint8Array(n);
    const stack: number[] = [];
    for (let x = 0; x < w; x++)
      for (const y of [0, h - 1]) {
        const i = y * w + x;
        if (bgLike[i] && !reach[i]) ((reach[i] = 1), stack.push(i));
      }
    for (let y = 0; y < h; y++)
      for (const x of [0, w - 1]) {
        const i = y * w + x;
        if (bgLike[i] && !reach[i]) ((reach[i] = 1), stack.push(i));
      }
    while (stack.length) {
      const p = stack.pop()!;
      const x = p % w;
      const y = (p / w) | 0;
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) if (q >= 0 && bgLike[q] && !reach[q]) ((reach[q] = 1), stack.push(q));
    }
    for (let i = 0; i < n; i++) mask[i] = reach[i] ? 0 : 1;
    // 4) tutup celah kecil (closing)
    mask = morph(morph(mask, w, h, true), w, h, false);
    holeLike = strict;
  }

  let fgCount = 0;
  for (let i = 0; i < n; i++) fgCount += mask[i];
  if (fgCount < n * 0.012) throw new TraceError("no-object", TIPS["no-object"]);
  if (fgCount > n * 0.96) throw new TraceError("low-contrast", TIPS["low-contrast"]);

  // lubang = wilayah mirip-latar yang terkurung objek
  if (o.keepHoles) for (let i = 0; i < n; i++) if (mask[i] && holeLike[i]) mask[i] = 0;
  mask = morph(morph(mask, w, h, false), w, h, true); // opening: buang serpihan

  const r = maskRegion(mask, w, h, o.detail, o.keepHoles);
  if (!r) throw new TraceError("no-object", TIPS["no-object"]);
  const finalMask = r.solid;
  {
    // isi rongga yang tidak dipertahankan sebagai lubang, agar masker konsisten dengan poligon
    const bg = components(finalMask, w, h, 0);
    const fill = bg.size.map((_, i) => {
      if (bg.border[i]) return false;
      const x = bg.start[i] % w;
      const y = (bg.start[i] / w) | 0;
      return !r.region.holes.some((hp) => pointInPanel([x + 0.5, y + 0.5], hp));
    });
    for (let i = 0; i < n; i++) if (!finalMask[i] && bg.label[i] >= 0 && fill[bg.label[i]]) finalMask[i] = 1;
  }

  // kemiripan poligon vs masker
  let inter = 0,
    uni = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const a = finalMask[y * w + x] === 1;
      const b = pointInPanel([x + 0.5, y + 0.5], r.region.outer, r.region.holes);
      if (a && b) inter++;
      if (a || b) uni++;
    }

  const { d, max } = distance(finalMask, w, h);

  // warna rata-rata objek
  let cr = 0,
    cg = 0,
    cb = 0,
    cn = 0;
  for (let i = 0; i < n; i++)
    if (finalMask[i]) {
      cr += rgba[i * 4];
      cg += rgba[i * 4 + 1];
      cb += rgba[i * 4 + 2];
      cn++;
    }

  return {
    w,
    h,
    rgba,
    mask: finalMask,
    contour: r.contour,
    region: r.region,
    fidelity: uni ? inter / uni : 0,
    dist: d,
    maxDist: max,
    cutout: makeCutout(source, finalMask, w, h, k0),
    color: cn ? [cr / cn, cg / cn, cb / cn] : [180, 140, 100],
  };
}

/** Potong foto beresolusi tinggi dengan masker (tepi lembut), dipangkas ke kotak objek. */
function makeCutout(source: HTMLCanvasElement, mask: Uint8Array, w: number, h: number, k0: number) {
  let x0 = w,
    y0 = h,
    x1 = 0,
    y1 = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (mask[y * w + x]) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x + 1);
        y1 = Math.max(y1, y + 1);
      }
  const pad = 2;
  x0 = Math.max(0, x0 - pad);
  y0 = Math.max(0, y0 - pad);
  x1 = Math.min(w, x1 + pad);
  y1 = Math.min(h, y1 + pad);
  // resolusi aset: hingga 2× resolusi kerja, dibatasi sumber
  const k = Math.min(2, 1 / k0);
  const cw = Math.max(1, Math.round((x1 - x0) * k));
  const ch = Math.max(1, Math.round((y1 - y0) * k));
  const m = document.createElement("canvas");
  m.width = w;
  m.height = h;
  const mg = m.getContext("2d")!;
  const md = mg.createImageData(w, h);
  for (let i = 0; i < w * h; i++) md.data[i * 4 + 3] = mask[i] ? 255 : 0;
  mg.putImageData(md, 0, 0);
  const c = document.createElement("canvas");
  c.width = cw;
  c.height = ch;
  const g = c.getContext("2d")!;
  g.drawImage(source, (x0 / k0) * 1, (y0 / k0) * 1, (x1 - x0) / k0, (y1 - y0) / k0, 0, 0, cw, ch);
  g.globalCompositeOperation = "destination-in";
  g.imageSmoothingEnabled = true;
  g.drawImage(m, x0, y0, x1 - x0, y1 - y0, 0, 0, cw, ch);
  return { src: c.toDataURL("image/png"), w: cw, h: ch, x0, y0, k };
}

/** Wilayah lapisan relief ke-i: piksel yang lebih dalam dari ambang jarak. */
export function layerRegions(a: Analysis, layers: number, detail: number, keepHoles: boolean): Region[] {
  const out: Region[] = [a.region];
  const step = (a.maxDist * 0.82) / Math.max(1, layers);
  for (let k = 1; k < layers; k++) {
    const m = new Uint8Array(a.w * a.h);
    let cnt = 0;
    for (let i = 0; i < m.length; i++) if (a.dist[i] > k * step) ((m[i] = 1), cnt++);
    if (cnt < a.w * a.h * 0.004) break;
    try {
      const r = maskRegion(m, a.w, a.h, detail, keepHoles, 0.02);
      if (!r || area(r.region.outer) < 12) break;
      out.push(r.region);
    } catch {
      break;
    }
  }
  return out;
}

/** Warna rata-rata objek di dekat sebuah tepi kontur (untuk dinding samping). */
export function edgeColor(a: Analysis, p: Vec2, q: Vec2, poly: Vec2[]): [number, number, number] {
  const cx = poly.reduce((s, v) => s + v[0], 0) / poly.length;
  const cy = poly.reduce((s, v) => s + v[1], 0) / poly.length;
  let r = 0,
    g = 0,
    b = 0,
    n = 0;
  const L = Math.max(1, dist(p, q));
  const nx = -(q[1] - p[1]) / L;
  const ny = (q[0] - p[0]) / L;
  const mx = (p[0] + q[0]) / 2;
  const my = (p[1] + q[1]) / 2;
  const sgn = (cx - mx) * nx + (cy - my) * ny >= 0 ? 1 : -1;
  for (let t = 0.1; t <= 0.9; t += 0.1)
    for (const off of [2, 4, 6]) {
      const x = Math.round(p[0] + (q[0] - p[0]) * t + nx * sgn * off);
      const y = Math.round(p[1] + (q[1] - p[1]) * t + ny * sgn * off);
      if (x < 0 || y < 0 || x >= a.w || y >= a.h) continue;
      const i = y * a.w + x;
      if (!a.mask[i]) continue;
      r += a.rgba[i * 4];
      g += a.rgba[i * 4 + 1];
      b += a.rgba[i * 4 + 2];
      n++;
    }
  return n ? [r / n, g / n, b / n] : a.color;
}

export const polygonArea = signedArea;
