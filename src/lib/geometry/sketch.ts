import { circlePoints, rectPoints } from "./polygon";
import type { SketchShape, Vec2 } from "./types";

function bezierPoint(p: [Vec2, Vec2, Vec2, Vec2], t: number): Vec2 {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return [a * p[0][0] + b * p[1][0] + c * p[2][0] + d * p[3][0], a * p[0][1] + b * p[1][1] + c * p[2][1] + d * p[3][1]];
}

function roundedRect(x: number, y: number, w: number, h: number, r: number): Vec2[] {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  if (rr <= 0.01) return rectPoints(x, y, w, h);
  const pts: Vec2[] = [];
  const corners: [number, number, number][] = [
    [x + w - rr, y + rr, -Math.PI / 2],
    [x + w - rr, y + h - rr, 0],
    [x + rr, y + h - rr, Math.PI / 2],
    [x + rr, y + rr, Math.PI],
  ];
  for (const [cx, cy, s] of corners) pts.push(...circlePoints([cx, cy], rr, 6, s, s + Math.PI / 2));
  return pts;
}

/** Ubah bentuk sketsa menjadi polyline (untuk ekspor, lubang 3D, dan deteksi klik). */
export function shapeToPolyline(s: SketchShape): { pts: Vec2[]; closed: boolean } | null {
  switch (s.kind) {
    case "line":
      return { pts: [s.a, s.b], closed: false };
    case "polyline":
      return { pts: s.pts, closed: s.closed };
    case "rect":
      return { pts: roundedRect(s.x, s.y, s.w, s.h, s.r ?? 0), closed: true };
    case "circle":
      return { pts: circlePoints(s.c, s.r, Math.max(24, Math.min(96, Math.round(s.r * 2)))), closed: true };
    case "arc": {
      const a0 = (s.start * Math.PI) / 180;
      let a1 = (s.end * Math.PI) / 180;
      if (a1 <= a0) a1 += Math.PI * 2;
      const seg = Math.max(8, Math.round(((a1 - a0) / (Math.PI * 2)) * 64));
      return { pts: circlePoints(s.c, s.r, seg, a0, a1), closed: false };
    }
    case "bezier": {
      const pts: Vec2[] = [];
      for (let i = 0; i <= 40; i++) pts.push(bezierPoint(s.pts, i / 40));
      return { pts, closed: false };
    }
    case "text":
      return null;
  }
}

const f = (n: number) => Math.round(n * 100) / 100;

export function shapeToPath(s: SketchShape): string {
  switch (s.kind) {
    case "line":
      return `M${f(s.a[0])} ${f(s.a[1])}L${f(s.b[0])} ${f(s.b[1])}`;
    case "bezier": {
      const [a, b, c, d] = s.pts;
      return `M${f(a[0])} ${f(a[1])}C${f(b[0])} ${f(b[1])} ${f(c[0])} ${f(c[1])} ${f(d[0])} ${f(d[1])}`;
    }
    case "text":
      return "";
    default: {
      const pl = shapeToPolyline(s);
      if (!pl) return "";
      return pointsToPath(pl.pts, pl.closed);
    }
  }
}

export function pointsToPath(pts: Vec2[], closed: boolean) {
  if (!pts.length) return "";
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 1; i < pts.length; i++) d += `L${f(pts[i][0])} ${f(pts[i][1])}`;
  return closed ? d + "Z" : d;
}

export function shapePoints(s: SketchShape): Vec2[] {
  switch (s.kind) {
    case "line":
      return [s.a, s.b];
    case "polyline":
      return s.pts;
    case "bezier":
      return s.pts;
    case "text":
      return [s.at];
    default:
      return shapeToPolyline(s)?.pts ?? [];
  }
}

export function translateShape(s: SketchShape, dx: number, dy: number): SketchShape {
  const t = (p: Vec2): Vec2 => [p[0] + dx, p[1] + dy];
  switch (s.kind) {
    case "line":
      return { ...s, a: t(s.a), b: t(s.b) };
    case "polyline":
      return { ...s, pts: s.pts.map(t) };
    case "rect":
      return { ...s, x: s.x + dx, y: s.y + dy };
    case "circle":
    case "arc":
      return { ...s, c: t(s.c) };
    case "bezier":
      return { ...s, pts: s.pts.map(t) as [Vec2, Vec2, Vec2, Vec2] };
    case "text":
      return { ...s, at: t(s.at) };
  }
}
