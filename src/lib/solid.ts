import { ShapeUtils, Vector2, Vector3 } from "three";
import { ConvexGeometry } from "three/examples/jsm/geometries/ConvexGeometry.js";
import type { RawMesh } from "./geometry/unfold";

/*
 * Pembangun bangun 3D low-poly untuk dibongkar jadi pola kardus:
 * setiap bagian adalah solid tertutup (loft, selubung cembung, silinder, balok),
 * lalu semua bagian digabung dan dibongkar sekaligus dengan pose aslinya.
 * Satuan mm, sumbu Y ke atas.
 */

export type P3 = [number, number, number];
export type Tri = [P3, P3, P3];
export type Part = Tri[];

const v3 = (p: P3) => new Vector3(p[0], p[1], p[2]);
const sub3 = (a: P3, b: P3): P3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add3 = (a: P3, b: P3): P3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul3 = (a: P3, k: number): P3 => [a[0] * k, a[1] * k, a[2] * k];
const cross3 = (a: P3, b: P3): P3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot3 = (a: P3, b: P3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit3 = (a: P3): P3 => mul3(a, 1 / (Math.hypot(...a) || 1));

function newell(pts: P3[]): P3 {
  const n: P3 = [0, 0, 0];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    n[0] += (a[1] - b[1]) * (a[2] + b[2]);
    n[1] += (a[2] - b[2]) * (a[0] + b[0]);
    n[2] += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return n;
}

/** Dua sumbu tegak lurus terhadap n. */
function basis(n: P3): [P3, P3] {
  const N = unit3(n);
  const ref: P3 = Math.abs(N[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const u = unit3(cross3(ref, N));
  return [u, cross3(N, u)];
}

/** Tutup poligon datar; urutan `forward` menentukan arah normal tutup. */
function cap(pts: P3[], forward: boolean): Tri[] {
  const clean = pts.filter((p, i) => Math.hypot(...sub3(p, pts[(i + 1) % pts.length])) > 1e-6);
  if (clean.length < 3) return [];
  const n = newell(clean);
  if (Math.hypot(...n) < 1e-6) return [];
  const [u, v] = basis(n);
  const c = mul3(clean.reduce(add3, [0, 0, 0] as P3), 1 / clean.length);
  const flat = clean.map((p) => new Vector2(dot3(sub3(p, c), u), dot3(sub3(p, c), v)));
  const want = forward ? n : mul3(n, -1);
  return ShapeUtils.triangulateShape(flat, []).map(([a, b, d]) => {
    const t: Tri = [clean[a], clean[b], clean[d]];
    return dot3(cross3(sub3(t[1], t[0]), sub3(t[2], t[0])), want) < 0 ? [t[0], t[2], t[1]] : t;
  });
}

/** Solid dari irisan-irisan berjumlah titik sama (titik tunggal diulang = ujung lancip). */
export function loft(secs: P3[][], capStart = true, capEnd = true): Part {
  const n = Math.max(...secs.map((s) => s.length));
  const S = secs.map((s) => (s.length === 1 ? Array.from({ length: n }, () => s[0]) : s));
  const out: Tri[] = [];
  for (let i = 0; i + 1 < S.length; i++)
    for (let j = 0; j < n; j++) {
      const a = S[i][j],
        b = S[i][(j + 1) % n],
        c = S[i + 1][(j + 1) % n],
        d = S[i + 1][j];
      out.push([a, b, c], [a, c, d]);
    }
  if (capStart) out.push(...cap([...S[0]].reverse(), true));
  if (capEnd) out.push(...cap(S[S.length - 1], true));
  return out;
}

/** Selubung cembung dari sekumpulan titik. */
export function hull(pts: P3[]): Part {
  const g = new ConvexGeometry(pts.map(v3));
  const a = g.getAttribute("position");
  const out: Tri[] = [];
  for (let i = 0; i + 2 < a.count; i += 3) out.push([0, 1, 2].map((k) => [a.getX(i + k), a.getY(i + k), a.getZ(i + k)] as P3) as Tri);
  g.dispose();
  return out;
}

/** Cincin n titik berjari-jari (rx, ry) mengelilingi sumbu `axis` di titik c. */
export function ring(c: P3, axis: P3, rx: number, ry = rx, n = 8, phase = Math.PI / n): P3[] {
  const [u, v] = basis(axis);
  return Array.from({ length: n }, (_, i) => {
    const t = phase + (i / n) * Math.PI * 2;
    return add3(c, add3(mul3(u, Math.cos(t) * rx), mul3(v, Math.sin(t) * ry)));
  });
}

/** Silinder/kerucut terpancung dari a ke b. */
export function cyl(a: P3, b: P3, r: number, n = 8, r2 = r): Part {
  const ax = sub3(b, a);
  return loft([ring(a, ax, r, r, n), ring(b, ax, r2, r2, n)]);
}

/** Balok dengan pinggiran dipotong miring (bevel) – berpusat di c. */
export function block(c: P3, w: number, h: number, d: number, bevel = 0): Part {
  const [x, y, z] = c;
  const pts: P3[] = [];
  const b = Math.min(bevel, w / 3, h / 3, d / 3);
  for (const sx of [-1, 1])
    for (const sy of [-1, 1])
      for (const sz of [-1, 1]) {
        const X = x + (sx * w) / 2,
          Y = y + (sy * h) / 2,
          Z = z + (sz * d) / 2;
        if (b > 0) pts.push([X - sx * b, Y, Z], [X, Y - sy * b, Z], [X, Y, Z - sz * b]);
        else pts.push([X, Y, Z]);
      }
  return hull(pts);
}

/** Balok memanjang dari a ke b (lengan, batang, tiang), penampang w × h. */
export function beam(a: P3, b: P3, w: number, h: number, up: P3 = [0, 1, 0]): Part {
  const ax = unit3(sub3(b, a));
  let side = cross3(ax, up);
  if (Math.hypot(...side) < 1e-6) side = cross3(ax, [1, 0, 0]);
  side = unit3(side);
  const top = cross3(side, ax);
  const pts: P3[] = [];
  for (const e of [a, b]) for (const sw of [-1, 1]) for (const sh of [-1, 1]) pts.push(add3(e, add3(mul3(side, (sw * w) / 2), mul3(top, (sh * h) / 2))));
  return hull(pts);
}

/** Benda putar di sumbu Y: profil [jari-jari, tinggi] dari bawah ke atas (jari-jari 0 = titik lancip). */
export function lathe(profile: [number, number][], n = 12, c: P3 = [0, 0, 0], sx = 1, sz = 1, caps: [boolean, boolean] = [true, true]): Part {
  return loft(
    profile.map(([r, y]) =>
      r < 1e-6
        ? [[c[0], c[1] + y, c[2]] as P3]
        : Array.from({ length: n }, (_, k) => {
            const t = Math.PI / n + (k / n) * Math.PI * 2;
            return [c[0] + Math.cos(t) * r * sx, c[1] + y, c[2] + Math.sin(t) * r * sz] as P3;
          }),
    ),
    caps[0],
    caps[1],
  );
}

/** Elipsoid low-poly (kepala, badan, telur). */
export function ellipsoid(c: P3, rx: number, ry: number, rz: number, lat = 4, n = 10): Part {
  const prof: [number, number][] = Array.from({ length: lat + 1 }, (_, i) => {
    const f = -Math.PI / 2 + (Math.PI * i) / lat;
    return [Math.abs(Math.cos(f)) < 1e-9 ? 0 : Math.cos(f), Math.sin(f) * ry];
  });
  return lathe(prof, n, c, rx, rz);
}

/**
 * Tabung mengikuti lintasan (leher, ekor, bilah keris berluk, cincin).
 * rx = lebar menyamping, ry = tinggi; bingkai diteruskan tanpa terpelintir (parallel transport).
 */
export function tube(path: P3[], rx: number | number[], ry: number | number[] = rx, n = 8, closed = false, caps = true): Part {
  const R = (a: number | number[], i: number) => (Array.isArray(a) ? a[i] : a);
  const m = path.length;
  const T = path.map((_, i) => {
    const a = closed ? path[(i - 1 + m) % m] : path[Math.max(0, i - 1)];
    const b = closed ? path[(i + 1) % m] : path[Math.min(m - 1, i + 1)];
    return unit3(sub3(b, a));
  });
  let up: P3 = [0, 1, 0];
  if (Math.abs(dot3(up, T[0])) > 0.9) up = [1, 0, 0];
  let N = unit3(sub3(up, mul3(T[0], dot3(up, T[0]))));
  const secs = path.map((p, i) => {
    if (i > 0) N = unit3(sub3(N, mul3(T[i], dot3(N, T[i]))));
    const B = cross3(T[i], N);
    // cincin tertutup: mulai dari sudut 0 supaya tidak ada sisi datar berbentuk donat (sisi berlubang)
    const phase = closed ? 0 : Math.PI / n;
    return Array.from({ length: n }, (_, k) => {
      const t = phase + (k / n) * Math.PI * 2;
      return add3(p, add3(mul3(B, Math.cos(t) * R(rx, i)), mul3(N, Math.sin(t) * R(ry, i))));
    });
  });
  return closed ? loft([...secs, secs[0]], false, false) : loft(secs, caps, caps);
}

/** Balok meruncing: alas w0 × d0 di y0, atas w1 × d1 di y1 (bisa digeser dx, dz). */
export function slab(c: P3, w0: number, d0: number, w1: number, d1: number, h: number, dx = 0, dz = 0): Part {
  const [x, y, z] = c;
  const pts: P3[] = [];
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      pts.push([x + (sx * w0) / 2, y, z + (sz * d0) / 2]);
      pts.push([x + dx + (sx * w1) / 2, y + h, z + dz + (sz * d1) / 2]);
    }
  return hull(pts);
}

/** Limas segi empat beralas w × d di titik c. */
export function pyramid(c: P3, w: number, d: number, h: number): Part {
  const [x, y, z] = c;
  return hull([[x - w / 2, y, z - d / 2], [x + w / 2, y, z - d / 2], [x + w / 2, y, z + d / 2], [x - w / 2, y, z + d / 2], [x, y + h, z]]);
}

/** Ekstrusi garis luar 2D (u, v) pada bidang tertentu sejauh d0..d1 di sumbu ketiga. */
export function prism(outline: [number, number][], plane: "xy" | "xz" | "zy", d0: number, d1: number): Part {
  const at = ([u, v]: [number, number], d: number): P3 => (plane === "xy" ? [u, v, d] : plane === "xz" ? [u, d, v] : [d, v, u]);
  return loft([outline.map((p) => at(p, d0)), outline.map((p) => at(p, d1))]);
}

/* ------------------------------------------------------------------ */
/* Transformasi                                                        */
/* ------------------------------------------------------------------ */

const mapPart = (p: Part, f: (q: P3) => P3): Part => p.map((t) => t.map(f) as Tri);
export const move = (p: Part, d: P3): Part => mapPart(p, (q) => add3(q, d));
export const scalePart = (p: Part, k: number): Part => mapPart(p, (q) => mul3(q, k));
export const mirrorX = (p: Part): Part => mapPart(p, ([x, y, z]) => [-x, y, z]);
export const mirrorZ = (p: Part): Part => mapPart(p, ([x, y, z]) => [x, y, -z]);
export function rotate(p: Part, axis: "x" | "y" | "z", deg: number, c: P3 = [0, 0, 0]): Part {
  const t = (deg * Math.PI) / 180;
  const cs = Math.cos(t),
    sn = Math.sin(t);
  return mapPart(p, (q) => {
    const [x, y, z] = sub3(q, c);
    const r: P3 = axis === "x" ? [x, y * cs - z * sn, y * sn + z * cs] : axis === "y" ? [x * cs + z * sn, y, -x * sn + z * cs] : [x * cs - y * sn, x * sn + y * cs, z];
    return add3(r, c);
  });
}

/** Pastikan normal menghadap ke luar (volume bertanda positif). */
function outward(p: Part): Part {
  let vol = 0;
  for (const [a, b, c] of p) vol += dot3(a, cross3(b, c));
  return vol >= 0 ? p : p.map(([a, b, c]) => [a, c, b] as Tri);
}

/** Gabungkan bagian-bagian menjadi mesh mentah untuk dibongkar. */
export function toMesh(parts: Part[]): RawMesh {
  const positions: number[] = [];
  for (const p of parts) for (const t of outward(p)) for (const q of t) positions.push(q[0], q[1], q[2]);
  return { positions, index: null };
}
