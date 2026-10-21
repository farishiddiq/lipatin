import { Matrix4, Vector3 } from "three";
import { foldMatrices } from "./fold";
import {
  add,
  bbox,
  dist,
  interiorPoint,
  lerp2,
  norm,
  perp,
  pointInPolygon,
  polygonsOverlap,
  scale,
  segKey,
  segmentsCross,
  sub,
  subtractCollinear,
  distToSegment,
  centroid,
} from "./polygon";
import { shapeToPolyline } from "./sketch";
import { tabShape } from "./builder";
import type { Issue, Line, Mods, NetBase, Panel, Sketch, Vec2 } from "./types";

export interface HingeFrame {
  a: Vector3;
  k: Vector3;
}

export interface Seam {
  n: number;
  /** Segmen 2D di tiap sisi beserta panelnya (untuk label nomor). */
  sides: { panelId: string; a: Vec2; b: Vec2 }[];
  viaTab?: string;
}

export interface ResolvedNet {
  panels: Panel[];
  byId: Map<string, Panel>;
  children: Map<string, string[]>;
  order: string[];
  depth: Map<string, number>;
  maxDepth: number;
  angles: Map<string, number>;
  hinges: Map<string, HingeFrame>;
  lines: Line[];
  seams: Seam[];
  issues: Issue[];
  bbox: { minX: number; minY: number; maxX: number; maxY: number };
  sketches: Sketch[];
  closed: boolean;
  thickness: number;
}

const v3 = (p: Vec2) => new Vector3(p[0], 0, p[1]);

function frameFor(parent: Panel, a: Vec2, b: Vec2) {
  const ex = norm(sub(b, a));
  let ey = perp(ex);
  const probe = add(lerp2(a, b, 0.5), scale(ey, Math.min(0.5, dist(a, b) * 0.01)));
  if (pointInPolygon(probe, parent.points)) ey = scale(ey, -1);
  return ([u, v]: Vec2): Vec2 => add(a, add(scale(ex, u), scale(ey, v)));
}

function edgeOf(p: Panel, i: number): [Vec2, Vec2] {
  return [p.points[i], p.points[(i + 1) % p.points.length]];
}

function hingeDir(child: Panel): Vec2 {
  // arah di bidang pola dari engsel menuju bagian dalam panel anak
  const [a, b] = child.hinge!;
  const n = norm(perp(sub(b, a)));
  const m = lerp2(a, b, 0.5);
  const ip = interiorPoint(child.points);
  const s = (ip[0] - m[0]) * n[0] + (ip[1] - m[1]) * n[1];
  return s >= 0 ? n : scale(n, -1);
}

export function resolveNet(base: NetBase, mods: Mods, sketches: Sketch[], thickness: number): ResolvedNet {
  // 1. salin panel & hapus yang dibuang beserta turunannya
  const removed = new Set(mods.removed);
  let changed = true;
  while (changed) {
    changed = false;
    for (const p of base.panels) {
      if (p.parent && removed.has(p.parent) && !removed.has(p.id)) {
        removed.add(p.id);
        changed = true;
      }
    }
  }
  const panels: Panel[] = base.panels
    .filter((p) => !removed.has(p.id))
    .map((p) => ({ ...p, holes: p.holes ? [...p.holes] : undefined, angle: mods.angles[p.id] ?? p.angle }));
  const byId = new Map(panels.map((p) => [p.id, p]));

  // 2. tab tambahan dari pengguna
  for (const t of mods.tabs) {
    const parent = byId.get(t.panelId);
    if (!parent || t.edge >= parent.points.length) continue;
    const id = `x-tab-${t.panelId}-${t.edge}`;
    if (byId.has(id) || removed.has(id)) continue;
    const [a, b] = edgeOf(parent, t.edge);
    const f = frameFor(parent, a, b);
    const tab: Panel = {
      id,
      label: "Tab lem",
      kind: "tab",
      points: tabShape(dist(a, b), t.width).map(f),
      parent: parent.id,
      hinge: [a, b],
      angle: mods.angles[id] ?? 90,
      autoAngle: mods.angles[id] === undefined,
    };
    panels.push(tab);
    byId.set(id, tab);
  }

  // 3. sketsa potong tertutup di dalam panel menjadi lubang
  for (const s of sketches) {
    if (s.lineType !== "cut") continue;
    const pl = shapeToPolyline(s.shape);
    if (!pl || !pl.closed || pl.pts.length < 3) continue;
    const host = panels.find((p) => p.kind !== "tab" && pl.pts.every((q) => pointInPolygon(q, p.points)) && !edgesTouch(pl.pts, p.points));
    if (host) host.holes = [...(host.holes ?? []), pl.pts];
  }

  // 4. pohon lipat
  const children = new Map<string, string[]>();
  const roots: string[] = [];
  for (const p of panels) {
    if (p.parent && byId.has(p.parent)) {
      const arr = children.get(p.parent) ?? [];
      arr.push(p.id);
      children.set(p.parent, arr);
    } else {
      p.parent = undefined;
      roots.push(p.id);
    }
  }
  const order: string[] = [];
  const depth = new Map<string, number>();
  const queue = [...roots];
  roots.forEach((r) => depth.set(r, 0));
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const c of children.get(id) ?? []) {
      depth.set(c, (depth.get(id) ?? 0) + 1);
      queue.push(c);
    }
  }
  const maxDepth = Math.max(0, ...depth.values());

  const hinges = new Map<string, HingeFrame>();
  for (const p of panels) {
    if (!p.parent || !p.hinge) continue;
    const w = hingeDir(p);
    // k = w × Y  → (-wz, 0, wx) dengan w = (wx, 0, wz)
    hinges.set(p.id, { a: v3(p.hinge[0]), k: new Vector3(-w[1], 0, w[0]).normalize() });
  }

  const angles = new Map<string, number>();
  for (const p of panels) if (p.parent) angles.set(p.id, p.angle ?? 90);

  const r: ResolvedNet = {
    panels,
    byId,
    children,
    order,
    depth,
    maxDepth,
    angles,
    hinges,
    lines: [],
    seams: [],
    issues: [],
    bbox: bbox(panels.flatMap((p) => p.points)),
    sketches,
    closed: !!base.closed,
    thickness,
  };

  r.lines = compileLines(r);
  const seamInfo: SeamInfo = base.stacked ? { seams: [], unmatched: [], orphanTabs: [] } : computeSeams(r);
  r.seams = seamInfo.seams;
  r.issues = validate(r, seamInfo);
  return r;
}

function edgesTouch(a: Vec2[], b: Vec2[]) {
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      if (segmentsCross(a[i], a[(i + 1) % a.length], b[j], b[(j + 1) % b.length], 1e-4)) return true;
    }
  }
  return a.some((p) => b.some((_, j) => distToSegment(p, b[j], b[(j + 1) % b.length]) < 0.2));
}

function compileLines(r: ResolvedNet): Line[] {
  const out: Line[] = [];
  const seen = new Set<string>();
  for (const p of r.panels) {
    const hingeSegs: [Vec2, Vec2][] = [];
    if (p.hinge) hingeSegs.push(p.hinge);
    for (const c of r.children.get(p.id) ?? []) {
      const h = r.byId.get(c)!.hinge;
      if (h) hingeSegs.push(h);
    }
    p.points.forEach((_, i) => {
      const [a, b] = edgeOf(p, i);
      for (const [s, e] of subtractCollinear(a, b, hingeSegs)) {
        const k = segKey(s, e);
        if (seen.has(k)) continue;
        seen.add(k);
        out.push({ a: s, b: e, type: "cut", panelId: p.id, edge: i });
      }
    });
    for (const hole of p.holes ?? []) {
      hole.forEach((_, i) => {
        const a = hole[i];
        const b = hole[(i + 1) % hole.length];
        for (const [s, e] of subtractCollinear(a, b, hingeSegs)) {
          const k = segKey(s, e);
          if (seen.has(k)) continue;
          seen.add(k);
          out.push({ a: s, b: e, type: "cut", panelId: p.id });
        }
      });
    }
  }
  for (const p of r.panels) {
    if (!p.parent || !p.hinge) continue;
    const ang = r.angles.get(p.id) ?? 0;
    out.push({ a: p.hinge[0], b: p.hinge[1], type: ang >= 0 ? "mountain" : "valley", hingeOf: p.id });
  }
  return out;
}

interface SeamInfo {
  seams: Seam[];
  unmatched: Line[];
  orphanTabs: string[];
}

function computeSeams(r: ResolvedNet): SeamInfo {
  const mats = foldMatrices(r, 1);
  const tol = Math.max(1, r.thickness * 1.6 + 0.5);
  const minLen = Math.max(3, r.thickness * 2.2);
  type Cand = { line: Line; p: Vector3; q: Vector3; panel: Panel };
  const cands: Cand[] = [];
  const toWorld = (pid: string, pt: Vec2) => v3(pt).applyMatrix4(mats.get(pid)!);
  for (const l of r.lines) {
    if (l.type !== "cut" || l.edge === undefined || !l.panelId) continue;
    const panel = r.byId.get(l.panelId)!;
    if (panel.kind !== "face") continue;
    if (dist(l.a, l.b) < minLen) continue;
    cands.push({ line: l, p: toWorld(l.panelId, l.a), q: toWorld(l.panelId, l.b), panel });
  }
  // hash sederhana berdasarkan titik tengah
  const cell = tol * 2;
  const keyOf = (v: Vector3) => `${Math.floor(v.x / cell)},${Math.floor(v.y / cell)},${Math.floor(v.z / cell)}`;
  const grid = new Map<string, number[]>();
  const mid = (c: Cand) => c.p.clone().add(c.q).multiplyScalar(0.5);
  cands.forEach((c, i) => {
    const k = keyOf(mid(c));
    const arr = grid.get(k) ?? [];
    arr.push(i);
    grid.set(k, arr);
  });
  const near = (v: Vector3) => {
    const bx = Math.floor(v.x / cell);
    const by = Math.floor(v.y / cell);
    const bz = Math.floor(v.z / cell);
    const res: number[] = [];
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        for (let dz = -1; dz <= 1; dz++) {
          const arr = grid.get(`${bx + dx},${by + dy},${bz + dz}`);
          if (arr) res.push(...arr);
        }
    return res;
  };
  const sameSeg = (p1: Vector3, q1: Vector3, p2: Vector3, q2: Vector3) =>
    (p1.distanceTo(p2) < tol && q1.distanceTo(q2) < tol) || (p1.distanceTo(q2) < tol && q1.distanceTo(p2) < tol);

  const used = new Set<number>();
  const seams: Seam[] = [];
  let n = 1;

  // tab lem → pasangan
  const orphanTabs: string[] = [];
  for (const p of r.panels) {
    if (p.kind !== "tab" || !p.parent || !p.hinge) continue;
    const hp = toWorld(p.parent, p.hinge[0]);
    const hq = toWorld(p.parent, p.hinge[1]);
    const m = hp.clone().add(hq).multiplyScalar(0.5);
    let found = -1;
    for (const i of near(m)) {
      const c = cands[i];
      if (c.panel.id === p.parent) continue;
      if (sameSeg(hp, hq, c.p, c.q)) {
        found = i;
        break;
      }
    }
    if (found < 0) {
      orphanTabs.push(p.id);
      continue;
    }
    used.add(found);
    const c = cands[found];
    seams.push({
      n: n++,
      viaTab: p.id,
      sides: [
        { panelId: p.id, a: p.hinge[0], b: p.hinge[1] },
        { panelId: c.panel.id, a: c.line.a, b: c.line.b },
      ],
    });
    if (p.autoAngle) {
      const parentM = mats.get(p.parent)!;
      const w = hingeDir(p);
      const WP = new Vector3(w[0], 0, w[1]).transformDirection(parentM);
      const qPanel = c.panel;
      const qMid = lerp2(c.line.a, c.line.b, 0.5);
      const en = norm(perp(sub(c.line.b, c.line.a)));
      const ip = interiorPoint(qPanel.points);
      const sgn = (ip[0] - qMid[0]) * en[0] + (ip[1] - qMid[1]) * en[1] >= 0 ? 1 : -1;
      const WQ = new Vector3(en[0] * sgn, 0, en[1] * sgn).transformDirection(mats.get(qPanel.id)!);
      const K = r.hinges.get(p.id)!.k.clone().transformDirection(parentM);
      const theta = Math.atan2(WP.clone().cross(WQ).dot(K), WP.dot(WQ));
      r.angles.set(p.id, ((theta * 180) / Math.PI) * 0.97);
    }
  }

  // tepi potong ↔ tepi potong
  cands.forEach((c, i) => {
    if (used.has(i)) return;
    for (const j of near(mid(c))) {
      if (j === i || used.has(j)) continue;
      const d = cands[j];
      if (d.panel.id === c.panel.id) continue;
      if (sameSeg(c.p, c.q, d.p, d.q)) {
        used.add(i);
        used.add(j);
        seams.push({
          n: n++,
          sides: [
            { panelId: c.panel.id, a: c.line.a, b: c.line.b },
            { panelId: d.panel.id, a: d.line.a, b: d.line.b },
          ],
        });
        return;
      }
    }
  });

  const unmatched = cands.filter((_, i) => !used.has(i)).map((c) => c.line);
  return { seams, unmatched, orphanTabs };
}

function validate(r: ResolvedNet, s: SeamInfo): Issue[] {
  const issues: Issue[] = [];
  const P = r.panels;
  const overlapPairs: [string, string][] = [];
  for (let i = 0; i < P.length; i++) {
    for (let j = i + 1; j < P.length; j++) {
      if (polygonsOverlap(P[i].points, P[j].points, P[i].holes, P[j].holes)) overlapPairs.push([P[i].id, P[j].id]);
      if (overlapPairs.length > 40) break;
    }
  }
  for (const [a, b] of overlapPairs.slice(0, 8)) {
    const pa = r.byId.get(a)!;
    const pb = r.byId.get(b)!;
    issues.push({
      level: "error",
      code: "overlap",
      message: `${pa.label ?? a} bertumpuk dengan ${pb.label ?? b}. Geser atau kecilkan salah satunya agar bisa dipotong dari satu lembar.`,
      panelIds: [a, b],
      at: interiorPoint(pa.points),
    });
  }
  if (overlapPairs.length > 8) {
    issues.push({ level: "error", code: "overlap-more", message: `Ada ${overlapPairs.length - 8} tumpukan panel lainnya.` });
  }

  for (const t of s.orphanTabs) {
    const p = r.byId.get(t)!;
    issues.push({
      level: "warning",
      code: "orphan-tab",
      message: "Tab lem ini tidak bertemu tepi mana pun saat dilipat. Pindahkan ke tepi yang bersambung atau hapus.",
      panelIds: [t],
      at: interiorPoint(p.points),
    });
  }

  // bagian terpisah (akar ber-rootPose: laci, kenop, roda) tidak wajib menutup bangun utama
  const rootOf = (id: string | undefined) => {
    let p = id ? r.byId.get(id) : undefined;
    while (p?.parent) p = r.byId.get(p.parent);
    return p;
  };
  const open = s.unmatched.filter((l) => !rootOf(l.panelId)?.rootPose);
  if (r.closed && open.length) {
    issues.push({
      level: "warning",
      code: "open-edges",
      message: `${open.length} tepi tidak bertemu pasangannya saat dilipat penuh, jadi bangun tidak menutup rapat.`,
      panelIds: [...new Set(open.map((l) => l.panelId!))],
      at: lerp2(open[0].a, open[0].b, 0.5),
    });
  }

  const seamsWithoutTab = r.seams.filter((x) => !x.viaTab).length;
  if (seamsWithoutTab > 0) {
    issues.push({
      level: "info",
      code: "seam-no-tab",
      message: `${seamsWithoutTab} sambungan belum punya tab lem. Pilih salah satu tepinya lalu klik "Tambah tab lem", atau gunakan selotip.`,
    });
  }

  for (const sk of r.sketches) {
    if (sk.lineType !== "cut") continue;
    const pl = shapeToPolyline(sk.shape);
    if (!pl || pl.closed) continue;
    const ends = [pl.pts[0], pl.pts[pl.pts.length - 1]];
    const onBoundary = (q: Vec2) =>
      r.lines.some((l) => l.type === "cut" && distToSegment(q, l.a, l.b) < 0.6) || dist(ends[0], ends[1]) < 0.6;
    if (!ends.every(onBoundary)) {
      issues.push({
        level: "warning",
        code: "open-cut",
        message: "Garis potong belum tertutup: ujungnya tidak menyentuh garis potong lain, jadi potongan tidak akan lepas.",
        at: ends[0],
      });
    }
  }

  for (const sk of r.sketches) {
    if (sk.tool !== "slot" || sk.shape.kind !== "rect") continue;
    const w = Math.min(Math.abs(sk.shape.w), Math.abs(sk.shape.h));
    if (w + 0.05 < r.thickness) {
      issues.push({
        level: "warning",
        code: "slot-thin",
        message: `Slot selebar ${w.toFixed(1)} mm lebih sempit dari tebal kardus (${r.thickness} mm). Sambungan akan sulit masuk.`,
        at: [sk.shape.x, sk.shape.y],
      });
    }
  }

  for (const p of r.panels) {
    const a = r.angles.get(p.id);
    if (a !== undefined && Math.abs(a) > 179.5) {
      issues.push({ level: "warning", code: "angle", message: `Sudut lipat ${p.label ?? p.id} hampir 180°, panel akan menumpuk rata.`, panelIds: [p.id] });
    }
  }
  return issues;
}

/** Bounding box lipatan (dunia, mm) — dipakai untuk menaruh model di atas meja. */
export function foldedBounds(r: ResolvedNet, mats: Map<string, Matrix4>) {
  const min = new Vector3(Infinity, Infinity, Infinity);
  const max = new Vector3(-Infinity, -Infinity, -Infinity);
  const v = new Vector3();
  for (const p of r.panels) {
    const m = mats.get(p.id);
    if (!m) continue;
    for (const pt of p.points) {
      for (const y of [0, -r.thickness]) {
        v.set(pt[0], y, pt[1]).applyMatrix4(m);
        min.min(v);
        max.max(v);
      }
    }
  }
  return { min, max };
}

export function seamLabelPos(net: ResolvedNet, panelId: string, a: Vec2, b: Vec2, inset: number): Vec2 {
  const m = lerp2(a, b, 0.5);
  const p = net.byId.get(panelId);
  let n = norm(perp(sub(b, a)));
  if (p) {
    const c = centroid(p.points);
    if ((c[0] - m[0]) * n[0] + (c[1] - m[1]) * n[1] < 0) n = [-n[0], -n[1]];
  }
  return [m[0] + n[0] * inset, m[1] + n[1] * inset];
}

