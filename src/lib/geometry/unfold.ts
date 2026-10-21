import { Matrix4, Vector3, type BufferGeometry } from "three";
import { tabShape } from "./builder";
import { add, bbox, dist, lerp2, norm, perp, pointInPolygon, polygonsOverlap, scale, sub, dot as dot2 } from "./polygon";
import type { NetBase, Panel, Vec2 } from "./types";

export interface UnfoldOptions {
  tabs: boolean;
  tabWidth: number;
  gap?: number;
  /** Rakit kembali ke orientasi model asli (mis. topi kerucut tetap tegak). */
  keepPose?: boolean;
}

export interface UnfoldResult {
  net: NetBase;
  faceCount: number;
  triangleCount: number;
  pieces: number;
  ms: number;
}

interface Face {
  tris: number[];
  normal: Vector3;
  area: number;
  loop: number[];
  verts: number[];
}

/** Mesh mentah: posisi (mm) + indeks segitiga. */
export interface RawMesh {
  positions: Float32Array | number[];
  index?: Uint32Array | Uint16Array | number[] | null;
}

export function meshFromGeometry(g: BufferGeometry): RawMesh {
  const pos = g.getAttribute("position");
  const idx = g.getIndex();
  return { positions: Array.from(pos.array as ArrayLike<number>).slice(0, pos.count * 3), index: idx ? Array.from(idx.array as ArrayLike<number>) : null };
}

export function unfoldMesh(mesh: RawMesh, opts: UnfoldOptions): UnfoldResult {
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const P = mesh.positions;
  const count = P.length / 3;

  // --- las titik yang berimpit
  let minX = Infinity,
    minY = Infinity,
    minZ = Infinity,
    maxX = -Infinity,
    maxY = -Infinity,
    maxZ = -Infinity;
  for (let i = 0; i < count; i++) {
    minX = Math.min(minX, P[i * 3]);
    maxX = Math.max(maxX, P[i * 3]);
    minY = Math.min(minY, P[i * 3 + 1]);
    maxY = Math.max(maxY, P[i * 3 + 1]);
    minZ = Math.min(minZ, P[i * 3 + 2]);
    maxZ = Math.max(maxZ, P[i * 3 + 2]);
  }
  const diag = Math.hypot(maxX - minX, maxY - minY, maxZ - minZ) || 1;
  const q = diag * 1e-5;
  const keyMap = new Map<string, number>();
  const verts: Vector3[] = [];
  const remap = new Int32Array(count);
  for (let i = 0; i < count; i++) {
    const x = P[i * 3],
      y = P[i * 3 + 1],
      z = P[i * 3 + 2];
    const k = `${Math.round(x / q)},${Math.round(y / q)},${Math.round(z / q)}`;
    let id = keyMap.get(k);
    if (id === undefined) {
      id = verts.length;
      verts.push(new Vector3(x, y, z));
      keyMap.set(k, id);
    }
    remap[i] = id;
  }
  const idx = mesh.index ? Array.from(mesh.index) : Array.from({ length: count }, (_, i) => i);
  const tris: [number, number, number][] = [];
  const triN: Vector3[] = [];
  const triA: number[] = [];
  for (let i = 0; i + 2 < idx.length; i += 3) {
    const a = remap[idx[i]],
      b = remap[idx[i + 1]],
      c = remap[idx[i + 2]];
    if (a === b || b === c || a === c) continue;
    const n = new Vector3().subVectors(verts[b], verts[a]).cross(new Vector3().subVectors(verts[c], verts[a]));
    const ar = n.length() / 2;
    if (ar < q * q) continue;
    tris.push([a, b, c]);
    triN.push(n.normalize());
    triA.push(ar);
  }

  // --- peta tepi
  const ekey = (a: number, b: number) => (a < b ? `${a}_${b}` : `${b}_${a}`);
  const edgeTris = new Map<string, number[]>();
  tris.forEach((t, ti) => {
    for (let e = 0; e < 3; e++) {
      const k = ekey(t[e], t[(e + 1) % 3]);
      const arr = edgeTris.get(k) ?? [];
      arr.push(ti);
      edgeTris.set(k, arr);
    }
  });

  // --- gabungkan segitiga sebidang menjadi satu sisi
  const parent = tris.map((_, i) => i);
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  for (const arr of edgeTris.values()) {
    if (arr.length !== 2) continue;
    const [t1, t2] = arr;
    if (triN[t1].dot(triN[t2]) > 1 - 1e-5) {
      const off = Math.abs(triN[t1].dot(new Vector3().subVectors(verts[tris[t2][0]], verts[tris[t1][0]])));
      if (off < q * 20) parent[find(t1)] = find(t2);
    }
  }
  const groups = new Map<number, number[]>();
  tris.forEach((_, i) => {
    const r = find(i);
    const arr = groups.get(r) ?? [];
    arr.push(i);
    groups.set(r, arr);
  });

  const faces: Face[] = [];
  const triFace = new Int32Array(tris.length);
  for (const g of groups.values()) {
    const fi = faces.length;
    const n = new Vector3();
    let area = 0;
    for (const t of g) {
      n.addScaledVector(triN[t], triA[t]);
      area += triA[t];
      triFace[t] = fi;
    }
    faces.push({ tris: g, normal: n.normalize(), area, loop: [], verts: [] });
  }
  // batas sisi (loop terluar)
  faces.forEach((f, fi) => {
    const next = new Map<number, number>();
    const vs = new Set<number>();
    for (const t of f.tris) {
      const tr = tris[t];
      for (let e = 0; e < 3; e++) {
        const a = tr[e],
          b = tr[(e + 1) % 3];
        vs.add(a);
        const others = edgeTris.get(ekey(a, b))!;
        const internal = others.some((o) => o !== t && triFace[o] === fi);
        if (!internal) next.set(a, b);
      }
    }
    f.verts = [...vs];
    const visited = new Set<number>();
    let best: number[] = [];
    let bestLen = -1;
    for (const start of next.keys()) {
      if (visited.has(start)) continue;
      const loop: number[] = [];
      let cur = start;
      let guard = 0;
      while (!visited.has(cur) && next.has(cur) && guard++ < 10000) {
        visited.add(cur);
        loop.push(cur);
        cur = next.get(cur)!;
      }
      let perim = 0;
      for (let i = 0; i < loop.length; i++) perim += verts[loop[i]].distanceTo(verts[loop[(i + 1) % loop.length]]);
      if (perim > bestLen) {
        bestLen = perim;
        best = loop;
      }
    }
    f.loop = best;
  });

  // --- ketetanggaan antar sisi
  interface Adj {
    f: number;
    g: number;
    u: number;
    v: number;
    wf: number;
    wg: number;
  }
  const adjMap = new Map<string, { f: number; g: number; edges: [number, number, number, number][] }>();
  for (const [k, arr] of edgeTris) {
    if (arr.length !== 2) continue;
    const [t1, t2] = arr;
    const f = triFace[t1],
      g = triFace[t2];
    if (f === g) continue;
    const [a, b] = k.split("_").map(Number);
    const third = (t: number) => tris[t].find((x) => x !== a && x !== b)!;
    const key = f < g ? `${f}_${g}` : `${g}_${f}`;
    const rec = adjMap.get(key) ?? { f: Math.min(f, g), g: Math.max(f, g), edges: [] };
    const tf = f < g ? t1 : t2;
    const tg = f < g ? t2 : t1;
    rec.edges.push([a, b, third(tf), third(tg)]);
    adjMap.set(key, rec);
  }
  const adjs: Adj[] = [];
  for (const rec of adjMap.values()) {
    // gabungkan sub-tepi segaris: ambil dua titik terjauh
    const pts = [...new Set(rec.edges.flatMap((e) => [e[0], e[1]]))];
    let u = pts[0],
      v = pts[1],
      best = -1;
    for (let i = 0; i < pts.length; i++)
      for (let j = i + 1; j < pts.length; j++) {
        const d = verts[pts[i]].distanceTo(verts[pts[j]]);
        if (d > best) {
          best = d;
          u = pts[i];
          v = pts[j];
        }
      }
    adjs.push({ f: rec.f, g: rec.g, u, v, wf: rec.edges[0][2], wg: rec.edges[0][3] });
  }
  const adjOf = new Map<number, Adj[]>();
  for (const a of adjs) {
    (adjOf.get(a.f) ?? adjOf.set(a.f, []).get(a.f)!).push(a);
    (adjOf.get(a.g) ?? adjOf.set(a.g, []).get(a.g)!).push(a);
  }

  // --- bentang pohon dengan deteksi tumpang tindih
  const pos2 = new Map<number, Map<number, Vec2>>();
  const island = new Int32Array(faces.length).fill(-1);
  const panelParent = new Map<number, { parent: number; adj: Adj; angle: number }>();
  const islandMembers: number[][] = [];
  const islandFrames: Matrix4[] = [];
  const poly = (fi: number) => faces[fi].loop.map((v) => pos2.get(fi)!.get(v)!);

  const placeRoot = (fi: number) => {
    const f = faces[fi];
    const o = verts[f.loop[0]];
    const e1 = new Vector3().subVectors(verts[f.loop[1]], o).normalize();
    const e2 = new Vector3().crossVectors(f.normal, e1).normalize();
    const m = new Map<number, Vec2>();
    for (const v of f.verts) {
      const d = new Vector3().subVectors(verts[v], o);
      m.set(v, [d.dot(e1), d.dot(e2)]);
    }
    pos2.set(fi, m);
    const M = new Matrix4().makeBasis(e1, f.normal.clone().negate(), e2).setPosition(o);
    islandFrames.push(M);
  };

  const placeChild = (child: number, par: number, a: Adj) => {
    const fc = faces[child];
    const U = verts[a.u],
      V = verts[a.v];
    const wc = a.f === child ? a.wf : a.wg;
    const wp = a.f === child ? a.wg : a.wf;
    const e = new Vector3().subVectors(V, U).normalize();
    const w = new Vector3().crossVectors(fc.normal, e).normalize();
    if (new Vector3().subVectors(verts[wc], U).dot(w) < 0) w.negate();
    const pm = pos2.get(par)!;
    const pu = pm.get(a.u)!,
      pv = pm.get(a.v)!;
    const e2 = norm(sub(pv, pu));
    let p2 = perp(e2);
    const pw = pm.get(wp)!;
    if (dot2(sub(pw, pu), p2) > 0) p2 = scale(p2, -1);
    const m = new Map<number, Vec2>();
    for (const x of fc.verts) {
      const d = new Vector3().subVectors(verts[x], U);
      m.set(x, add(pu, add(scale(e2, d.dot(e)), scale(p2, d.dot(w)))));
    }
    return m;
  };

  const remaining = new Set(faces.map((_, i) => i));
  const pickRoot = () => {
    let best = -1;
    let score = Infinity;
    for (const fi of remaining) {
      const s = faces[fi].normal.y * 1000 - faces[fi].area * 1e-6;
      if (s < score) {
        score = s;
        best = fi;
      }
    }
    return best;
  };

  while (remaining.size) {
    const root = pickRoot();
    const isl = islandMembers.length;
    islandMembers.push([root]);
    placeRoot(root);
    island[root] = isl;
    remaining.delete(root);
    const queue: number[] = [root];
    let progressed = true;
    // BFS berulang: sisi yang gagal ditempatkan dicoba lagi lewat tetangga lain
    while (progressed) {
      progressed = false;
      let qi = 0;
      while (qi < queue.length) {
        const cur = queue[qi++];
        for (const a of adjOf.get(cur) ?? []) {
          const nb = a.f === cur ? a.g : a.f;
          if (!remaining.has(nb)) continue;
          const m = placeChild(nb, cur, a);
          const pts = faces[nb].loop.map((v) => m.get(v)!);
          pos2.set(nb, m);
          const clash = islandMembers[isl].some((o) => polygonsOverlap(pts, poly(o)));
          if (clash) {
            pos2.delete(nb);
            continue;
          }
          const n1 = faces[cur].normal,
            n2 = faces[nb].normal;
          const alpha = (Math.acos(Math.max(-1, Math.min(1, n1.dot(n2)))) * 180) / Math.PI;
          const wc = a.f === nb ? a.wf : a.wg;
          const convex = new Vector3().subVectors(verts[wc], verts[a.u]).dot(n1) < 0;
          panelParent.set(nb, { parent: cur, adj: a, angle: convex ? alpha : -alpha });
          island[nb] = isl;
          islandMembers[isl].push(nb);
          remaining.delete(nb);
          queue.push(nb);
          progressed = true;
        }
      }
    }
  }

  // --- susun bagian berdampingan
  const gap = opts.gap ?? 12;
  const boxes = islandMembers.map((mem) => bbox(mem.flatMap((fi) => poly(fi))));
  const totalArea = boxes.reduce((s, b) => s + (b.maxX - b.minX + gap) * (b.maxY - b.minY + gap), 0);
  const rowMax = Math.max(Math.sqrt(totalArea) * 1.4, ...boxes.map((b) => b.maxX - b.minX));
  const order = boxes.map((_, i) => i).sort((a, b) => boxes[b].maxY - boxes[b].minY - (boxes[a].maxY - boxes[a].minY));
  const offsets: Vec2[] = new Array(boxes.length);
  let x = 0,
    y = 0,
    rowH = 0;
  for (const i of order) {
    const b = boxes[i];
    const w = b.maxX - b.minX;
    const h = b.maxY - b.minY;
    if (x > 0 && x + w > rowMax) {
      x = 0;
      y += rowH + gap;
      rowH = 0;
    }
    offsets[i] = [x - b.minX, y - b.minY];
    x += w + gap;
    rowH = Math.max(rowH, h);
  }

  const panels: Panel[] = [];
  const shifted = (fi: number): Vec2[] => {
    const o = offsets[island[fi]];
    return poly(fi).map((p) => [p[0] + o[0], p[1] + o[1]] as Vec2);
  };
  const shiftPt = (fi: number, v: number): Vec2 => {
    const o = offsets[island[fi]];
    const p = pos2.get(fi)!.get(v)!;
    return [p[0] + o[0], p[1] + o[1]];
  };
  const frames = islandFrames.map((M, i) => M.clone().multiply(new Matrix4().makeTranslation(-offsets[i][0], 0, -offsets[i][1])));
  const inv0 = frames[0].clone().invert();
  let label = 1;
  const faceIds = new Map<number, string>();
  for (const mem of islandMembers) {
    for (const fi of mem) {
      const id = `f${fi}`;
      faceIds.set(fi, id);
      const pp = panelParent.get(fi);
      const panel: Panel = { id, label: `Sisi ${label++}`, kind: "face", points: shifted(fi) };
      if (pp) {
        panel.parent = `f${pp.parent}`;
        panel.hinge = [shiftPt(pp.parent, pp.adj.u), shiftPt(pp.parent, pp.adj.v)];
        panel.angle = Math.round(pp.angle * 100) / 100;
      } else if (opts.keepPose) {
        panel.rootPose = Array.from(frames[island[fi]].elements);
      } else if (island[fi] > 0) {
        panel.rootPose = Array.from(inv0.clone().multiply(frames[island[fi]]).elements);
      }
      panels.push(panel);
    }
  }

  // --- tab lem otomatis pada sambungan yang dipotong
  if (opts.tabs) {
    const treeKey = new Set([...panelParent.entries()].map(([c, p]) => (c < p.parent ? `${c}_${p.parent}` : `${p.parent}_${c}`)));
    let tabN = 0;
    for (const a of adjs) {
      if (treeKey.has(`${a.f}_${a.g}`)) continue;
      const tryOn = (fi: number, w: number, k: number) => {
        const A = shiftPt(fi, a.u);
        const B = shiftPt(fi, a.v);
        const L = dist(A, B);
        if (L < 4) return false;
        const host = panels.find((p) => p.id === faceIds.get(fi))!;
        const ex = norm(sub(B, A));
        let ey = perp(ex);
        if (pointInPolygon(add(lerp2(A, B, 0.5), scale(ey, Math.min(0.5, L * 0.01))), host.points)) ey = scale(ey, -1);
        const pts = tabShape(L, w, k).map(([u, v]) => add(A, add(scale(ex, u), scale(ey, v))));
        if (panels.some((p) => polygonsOverlap(pts, p.points))) return false;
        panels.push({ id: `t${tabN++}`, label: "Tab lem", kind: "tab", points: pts, parent: host.id, hinge: [A, B], angle: 90, autoAngle: true });
        return true;
      };
      const variants: [number, number][] = [
        [opts.tabWidth, 0.9],
        [opts.tabWidth, 2.2],
        [opts.tabWidth * 0.6, 2.2],
        [opts.tabWidth * 0.35, 3],
      ];
      for (const [w, k] of variants) {
        if (tryOn(a.f, w, k) || tryOn(a.g, w, k)) break;
      }
    }
  }

  // Cerminkan pola: dunia lipat dirender tercermin di sumbu x (sisi luar = sisi cetak),
  // jadi pola juga dicerminkan agar hasil lipatan sama persis dengan model aslinya.
  for (const p of panels) {
    p.points = p.points.map(([x, y]) => [-x, y] as Vec2);
    if (p.hinge) p.hinge = [[-p.hinge[0][0], p.hinge[0][1]], [-p.hinge[1][0], p.hinge[1][1]]];
    if (p.rootPose) p.rootPose = p.rootPose.map((v, i) => v * ((i % 4 === 0 ? -1 : 1) * (Math.floor(i / 4) === 0 ? -1 : 1)));
  }

  const t1 = typeof performance !== "undefined" ? performance.now() : Date.now();
  return { net: { panels, closed: true }, faceCount: faces.length, triangleCount: tris.length, pieces: islandMembers.length, ms: t1 - t0 };
}
