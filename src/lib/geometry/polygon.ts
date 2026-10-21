import type { Vec2 } from "./types";

export const add = (a: Vec2, b: Vec2): Vec2 => [a[0] + b[0], a[1] + b[1]];
export const sub = (a: Vec2, b: Vec2): Vec2 => [a[0] - b[0], a[1] - b[1]];
export const scale = (a: Vec2, s: number): Vec2 => [a[0] * s, a[1] * s];
export const dot = (a: Vec2, b: Vec2) => a[0] * b[0] + a[1] * b[1];
export const cross = (a: Vec2, b: Vec2) => a[0] * b[1] - a[1] * b[0];
export const len = (a: Vec2) => Math.hypot(a[0], a[1]);
export const dist = (a: Vec2, b: Vec2) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export const norm = (a: Vec2): Vec2 => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l];
};
export const perp = (a: Vec2): Vec2 => [-a[1], a[0]];
export const lerp2 = (a: Vec2, b: Vec2, t: number): Vec2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

export function signedArea(pts: Vec2[]) {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return s / 2;
}

export const area = (pts: Vec2[]) => Math.abs(signedArea(pts));

export function centroid(pts: Vec2[]): Vec2 {
  const A = signedArea(pts);
  if (Math.abs(A) < 1e-9) {
    const s = pts.reduce((acc, p) => add(acc, p), [0, 0] as Vec2);
    return scale(s, 1 / pts.length);
  }
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const f = a[0] * b[1] - b[0] * a[1];
    cx += (a[0] + b[0]) * f;
    cy += (a[1] + b[1]) * f;
  }
  return [cx / (6 * A), cy / (6 * A)];
}

export function bbox(pts: Vec2[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

export function pointInPolygon(p: Vec2, pts: Vec2[]) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function pointInPanel(p: Vec2, pts: Vec2[], holes?: Vec2[][]) {
  if (!pointInPolygon(p, pts)) return false;
  return !(holes ?? []).some((h) => pointInPolygon(p, h));
}

/** Jarak bertanda titik c dari garis a→b. */
function sideDist(a: Vec2, b: Vec2, c: Vec2) {
  const d = sub(b, a);
  const l = len(d) || 1;
  return cross(d, sub(c, a)) / l;
}

/** Perpotongan murni dua segmen (bukan sekadar bersentuhan / segaris). */
export function segmentsCross(a: Vec2, b: Vec2, c: Vec2, d: Vec2, eps = 1e-3) {
  const d1 = sideDist(a, b, c);
  const d2 = sideDist(a, b, d);
  const d3 = sideDist(c, d, a);
  const d4 = sideDist(c, d, b);
  return ((d1 > eps && d2 < -eps) || (d1 < -eps && d2 > eps)) && ((d3 > eps && d4 < -eps) || (d3 < -eps && d4 > eps));
}

export function distToSegment(p: Vec2, a: Vec2, b: Vec2) {
  const ab = sub(b, a);
  const l2 = dot(ab, ab);
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, dot(sub(p, a), ab) / l2));
  return dist(p, add(a, scale(ab, t)));
}

/** Titik yang dijamin berada di dalam poligon (juga untuk poligon cekung) dan di luar lubangnya. */
export function interiorPoint(pts: Vec2[], holes?: Vec2[][]): Vec2 {
  const ok = (q: Vec2) => pointInPolygon(q, pts) && !(holes ?? []).some((h) => pointInPolygon(q, h));
  const c = centroid(pts);
  if (ok(c)) return c;
  if (holes?.length) {
    const b = bbox(pts);
    for (let i = 1; i < 8; i++)
      for (let j = 1; j < 8; j++) {
        const q: Vec2 = [b.minX + ((b.maxX - b.minX) * i) / 8, b.minY + ((b.maxY - b.minY) * j) / 8];
        if (ok(q)) return q;
      }
  }
  const b = bbox(pts);
  const size = Math.max(b.maxX - b.minX, b.maxY - b.minY);
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const e = pts[(i + 1) % pts.length];
    const m = lerp2(a, e, 0.5);
    const n = norm(perp(sub(e, a)));
    for (const s of [1, -1]) {
      const q = add(m, scale(n, s * Math.min(1, size * 0.01)));
      if (pointInPolygon(q, pts)) return q;
    }
  }
  return c;
}

export function polygonsOverlap(A: Vec2[], B: Vec2[], holesA?: Vec2[][], holesB?: Vec2[][]) {
  const ba = bbox(A);
  const bb = bbox(B);
  const e = 0.01;
  if (ba.maxX <= bb.minX + e || bb.maxX <= ba.minX + e || ba.maxY <= bb.minY + e || bb.maxY <= ba.minY + e) return false;
  for (let i = 0; i < A.length; i++) {
    const a1 = A[i];
    const a2 = A[(i + 1) % A.length];
    for (let j = 0; j < B.length; j++) {
      if (segmentsCross(a1, a2, B[j], B[(j + 1) % B.length])) return true;
    }
  }
  if (pointInPanel(interiorPoint(A, holesA), B, holesB)) return true;
  if (pointInPanel(interiorPoint(B, holesB), A, holesA)) return true;
  return false;
}

export function regularPolygon(n: number, side: number): Vec2[] {
  // poligon beraturan dengan sisi bawah horizontal, sumbu y ke atas, urutan CCW
  const R = side / (2 * Math.sin(Math.PI / n));
  const pts: Vec2[] = [];
  const start = -Math.PI / 2 - Math.PI / n;
  for (let i = 0; i < n; i++) {
    const t = start + (i * 2 * Math.PI) / n;
    pts.push([R * Math.cos(t), R * Math.sin(t)]);
  }
  const minY = Math.min(...pts.map((p) => p[1]));
  const x0 = pts[0][0];
  return pts.map(([x, y]) => [x - x0, y - minY] as Vec2);
}

export function circlePoints(c: Vec2, r: number, segments = 32, start = 0, end = Math.PI * 2): Vec2[] {
  const full = Math.abs(end - start - Math.PI * 2) < 1e-9;
  const n = Math.max(3, segments);
  const pts: Vec2[] = [];
  const count = full ? n : n + 1;
  for (let i = 0; i < count; i++) {
    const t = start + ((end - start) * i) / n;
    pts.push([c[0] + r * Math.cos(t), c[1] + r * Math.sin(t)]);
  }
  return pts;
}

export function rectPoints(x: number, y: number, w: number, h: number): Vec2[] {
  return [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ];
}

export function stadiumPoints(c: Vec2, w: number, h: number, segments = 10): Vec2[] {
  const r = Math.min(w, h) / 2;
  const horizontal = w >= h;
  const half = (Math.max(w, h) - 2 * r) / 2;
  const pts: Vec2[] = [];
  const c1: Vec2 = horizontal ? [c[0] + half, c[1]] : [c[0], c[1] + half];
  const c2: Vec2 = horizontal ? [c[0] - half, c[1]] : [c[0], c[1] - half];
  const base = horizontal ? -Math.PI / 2 : 0;
  for (let i = 0; i <= segments; i++) {
    const t = base + (Math.PI * i) / segments;
    pts.push([c1[0] + r * Math.cos(t), c1[1] + r * Math.sin(t)]);
  }
  for (let i = 0; i <= segments; i++) {
    const t = base + Math.PI + (Math.PI * i) / segments;
    pts.push([c2[0] + r * Math.cos(t), c2[1] + r * Math.sin(t)]);
  }
  return pts;
}

/** Kurangi bagian segmen [a,b] yang tertutup oleh segmen-segmen segaris lain. */
export function subtractCollinear(a: Vec2, b: Vec2, cutters: [Vec2, Vec2][], tol = 0.05): [Vec2, Vec2][] {
  const d = sub(b, a);
  const L = len(d);
  if (L < 1e-6) return [];
  const u = scale(d, 1 / L);
  const covered: [number, number][] = [];
  for (const [c, e] of cutters) {
    if (Math.abs(sideDist(a, b, c)) > tol || Math.abs(sideDist(a, b, e)) > tol) continue;
    let t0 = dot(sub(c, a), u);
    let t1 = dot(sub(e, a), u);
    if (t0 > t1) [t0, t1] = [t1, t0];
    t0 = Math.max(0, t0);
    t1 = Math.min(L, t1);
    if (t1 - t0 > tol) covered.push([t0, t1]);
  }
  if (!covered.length) return [[a, b]];
  covered.sort((x, y) => x[0] - y[0]);
  const out: [Vec2, Vec2][] = [];
  let cursor = 0;
  for (const [t0, t1] of covered) {
    if (t0 - cursor > tol) out.push([add(a, scale(u, cursor)), add(a, scale(u, t0))]);
    cursor = Math.max(cursor, t1);
  }
  if (L - cursor > tol) out.push([add(a, scale(u, cursor)), b]);
  return out;
}

export const segKey = (a: Vec2, b: Vec2) => {
  const r = (v: number) => Math.round(v * 20) / 20;
  const p = `${r(a[0])},${r(a[1])}`;
  const q = `${r(b[0])},${r(b[1])}`;
  return p < q ? `${p}|${q}` : `${q}|${p}`;
};
