import { add, circlePoints, cross, dist, dot, lerp2, norm, perp, pointInPolygon, polygonsOverlap, rectPoints, regularPolygon, scale, sub } from "./polygon";
import type { DimAnnotation, NetBase, Panel, PanelKind, Vec2 } from "./types";

interface AttachOpts {
  id: string;
  label?: string;
  angle?: number;
  kind?: PanelKind;
  autoAngle?: boolean;
  /** Lubang dalam koordinat lokal engsel (u sepanjang engsel, v keluar). */
  holes?: Vec2[][];
}

export class NetBuilder {
  panels: Panel[] = [];
  dims: DimAnnotation[] = [];
  private map = new Map<string, Panel>();

  add(p: Panel) {
    this.panels.push(p);
    this.map.set(p.id, p);
    return p;
  }

  get(id: string) {
    const p = this.map.get(id);
    if (!p) throw new Error(`Panel ${id} tidak ditemukan`);
    return p;
  }

  edge(id: string, i: number): [Vec2, Vec2] {
    const pts = this.get(id).points;
    return [pts[i % pts.length], pts[(i + 1) % pts.length]];
  }

  /** Kerangka lokal: asal di a, sumbu u searah a→b, sumbu v menjauhi panel induk. */
  frame(parentId: string, a: Vec2, b: Vec2) {
    const parent = this.get(parentId);
    const ex = norm(sub(b, a));
    let ey = perp(ex);
    const probe = add(lerp2(a, b, 0.5), scale(ey, Math.min(0.5, dist(a, b) * 0.01)));
    if (pointInPolygon(probe, parent.points)) ey = scale(ey, -1);
    return ([u, v]: Vec2): Vec2 => add(a, add(scale(ex, u), scale(ey, v)));
  }

  attach(parentId: string, a: Vec2, b: Vec2, local: Vec2[], o: AttachOpts) {
    const f = this.frame(parentId, a, b);
    return this.add({
      id: o.id,
      label: o.label,
      kind: o.kind ?? "face",
      points: local.map(f),
      holes: o.holes?.map((h) => h.map(f)),
      parent: parentId,
      hinge: [a, b],
      angle: o.angle ?? 90,
      autoAngle: o.autoAngle,
    });
  }

  /** Tempel panel pada tepi ke-i induk, opsional hanya pada rentang [from, to] mm dari titik awal tepi. */
  attachEdge(parentId: string, i: number, local: (L: number) => Vec2[], o: AttachOpts, span?: [number, number]) {
    let [a, b] = this.edge(parentId, i);
    if (span) {
      const u = norm(sub(b, a));
      const a2 = add(a, scale(u, span[0]));
      b = add(a, scale(u, span[1]));
      a = a2;
    }
    return this.attach(parentId, a, b, local(dist(a, b)), o);
  }

  tab(parentId: string, i: number, width: number, id?: string) {
    return this.tryTab([[parentId, i]], width, id, 0);
  }

  /**
   * Tempel tab lem pada opsi tepi pertama yang tidak bertumpuk dengan panel lain.
   * Bila semua bertumpuk, coba tab yang lebih sempit; bila tetap gagal, sambungan dibiarkan tanpa tab.
   */
  tryTab(options: [string, number][], width: number, id?: string, margin = 0) {
    // variasi: tab normal, tab bersudut landai (untuk celah sempit), lalu versi lebih sempit
    const variants: [number, number][] = [
      [width, 0.9],
      [width, 2.2],
      [width * 0.6, 2.2],
      [width * 0.4, 3],
    ];
    for (const [w, k] of variants) {
      for (const [pid, i] of options) {
        let [a, b] = this.edge(pid, i);
        const L0 = dist(a, b);
        // tepi pendek tidak diberi tab (sama seperti hasil bongkar): terlalu kecil untuk dilem
        if (L0 - 2 * margin < 8) continue;
        if (margin > 0) {
          const u = norm(sub(b, a));
          [a, b] = [add(a, scale(u, margin)), add(b, scale(u, -margin))];
        }
        const f = this.frame(pid, a, b);
        const pts = tabShape(dist(a, b), w, k).map(f);
        // termasuk panel induk: tab di sudut cekung bisa menimpa induknya sendiri
        if (this.panels.some((p) => polygonsOverlap(pts, p.points, undefined, p.holes))) continue;
        return this.add({
          id: id ?? `${pid}-tab${i}`,
          label: "Tab lem",
          kind: "tab",
          points: pts,
          parent: pid,
          hinge: [a, b],
          angle: 90,
          autoAngle: true,
        });
      }
    }
    return null;
  }

  dim(a: Vec2, b: Vec2, param?: string, offset = 0) {
    this.dims.push({ a, b, param, offset });
  }

  build(closed = false): NetBase {
    return { panels: this.panels, dims: this.dims, closed };
  }
}

export function tabShape(L: number, w: number, k = 0.9): Vec2[] {
  const inset = Math.min(w * k, L * 0.45);
  return [
    [0, 0],
    [L, 0],
    [L - inset, w],
    [inset, w],
  ];
}

export function taperShape(L: number, h: number, taper = 0.5): Vec2[] {
  const r = Math.min(h * taper, L * 0.25);
  return [
    [0, 0],
    [L, 0],
    [L - r, h],
    [r, h],
  ];
}

const rectLocal = (L: number, h: number): Vec2[] => [
  [0, 0],
  [L, 0],
  [L, h],
  [0, h],
];

/* ------------------------------------------------------------------ */
/* Kotak                                                               */
/* ------------------------------------------------------------------ */

export type BoxFace = "base" | "front" | "back" | "left" | "right" | "lid";

export interface BoxOpts {
  W: number;
  D: number;
  H: number;
  tab: number;
  lid: "open" | "tuck" | "glued";
  t: number;
  compensate: boolean;
  /** Lubang per sisi dalam koordinat lokal sisi (u sepanjang engsel, v menjauhi engsel). */
  holes?: Partial<Record<BoxFace, Vec2[][]>>;
  /** Tanpa alas (mis. helm): sisi dinding tetap menempel ke "alas" yang menjadi atap. */
  labels?: Partial<Record<BoxFace, string>>;
}

export function buildBox(o: BoxOpts): NetBuilder {
  const { W, D, H, tab } = o;
  const c = o.compensate ? o.t : 0;
  const nb = new NetBuilder();
  const L = { base: "Alas", front: "Dinding depan", back: "Dinding belakang", left: "Dinding kiri", right: "Dinding kanan", lid: "Tutup", ...o.labels };
  const base = rectPoints(0, 0, W, D);
  const baseHoles = o.holes?.base;
  nb.add({ id: "base", label: L.base, kind: "face", points: base, holes: baseHoles });

  const wallW = (len: number) => [
    [-c, 0],
    [len + c, 0],
    [len + c, H],
    [-c, H],
  ] as Vec2[];

  nb.attachEdge("base", 2, () => wallW(W), { id: "front", label: L.front, holes: o.holes?.front?.map((h) => h) });
  nb.attachEdge("base", 0, () => wallW(W), { id: "back", label: L.back, holes: o.holes?.back });
  nb.attachEdge("base", 3, (len) => rectLocal(len, H), { id: "left", label: L.left, holes: o.holes?.left });
  nb.attachEdge("base", 1, (len) => rectLocal(len, H), { id: "right", label: L.right, holes: o.holes?.right });

  if (tab > 0) {
    const margin = c > 0 ? c + 0.5 : 0;
    for (const side of ["left", "right"]) {
      nb.tryTab([[side, 1]], tab, undefined, margin);
      nb.tryTab([[side, 3]], tab, undefined, margin);
    }
  }

  if (o.lid !== "open") {
    nb.attachEdge("back", 2, (len) => rectLocal(len, D + c), { id: "lid", label: L.lid, holes: o.holes?.lid });
    if (o.lid === "tuck") {
      const lidLen = W + 2 * c;
      const Lt = Math.max(10, W - 1);
      const h = Math.min(H * 0.5, D * 0.6, 40);
      const s0 = (lidLen - Lt) / 2;
      nb.attachEdge("lid", 2, (len) => taperShape(len, h, 0.6), { id: "tuck", label: "Lidah selip", kind: "flap" }, [s0, s0 + Lt]);
      const dh = Math.min(D * 0.45, H * 0.5, 35);
      for (const side of ["left", "right"]) {
        nb.attachEdge(side, 2, (len) => taperShape(len, dh, 0.8), { id: `${side}-dust`, label: "Sayap penahan", kind: "flap" }, [0.5, Math.max(1, D - 0.5)]);
      }
    } else if (tab > 0) {
      nb.tab("lid", 1, tab);
      nb.tab("lid", 2, tab);
      nb.tab("lid", 3, tab);
    }
  }

  nb.dim([0, D * 0.25], [W, D * 0.25], "W");
  nb.dim([W * 0.75, 0], [W * 0.75, D], "D");
  nb.dim([W, D * 0.5], [W + H, D * 0.5], "H");
  return nb;
}

/* ------------------------------------------------------------------ */
/* Profil yang diekstrusi (prisma, rumah, mobil, dll.)                 */
/* ------------------------------------------------------------------ */

export interface ProfileOpts {
  /** Poligon profil CCW (sumbu y ke atas), p0 = (0,0), p1 = (L,0). */
  profile: Vec2[];
  depth: number;
  tab: number;
  /** strip = rebah di sisi bawah profil; sideA = berdiri di atas sisi profil. */
  root: "strip" | "sideA";
  closed?: boolean;
  sideA?: boolean;
  sideB?: boolean;
  sideBTabs?: boolean;
  sideHoles?: { A?: Vec2[][]; B?: Vec2[][] };
  stripHoles?: Record<number, Vec2[][]>;
  labels?: { strip?: (i: number) => string; A?: string; B?: string };
}

export function turnAngles(profile: Vec2[], closed: boolean) {
  const n = profile.length;
  const turns: number[] = [0];
  const edges = closed ? n : n - 1;
  for (let i = 1; i < edges; i++) {
    const d0 = sub(profile[i], profile[i - 1]);
    const d1 = sub(profile[(i + 1) % n], profile[i]);
    turns.push((Math.atan2(cross(d0, d1), dot(d0, d1)) * 180) / Math.PI);
  }
  return turns;
}

export function buildProfile(o: ProfileOpts): NetBuilder {
  const { profile, depth, tab } = o;
  const closed = o.closed ?? true;
  const n = profile.length;
  const edgeCount = closed ? n : n - 1;
  const lens = Array.from({ length: edgeCount }, (_, i) => dist(profile[i], profile[(i + 1) % n]));
  const turns = turnAngles(profile, closed);
  const X: number[] = [0];
  for (const l of lens) X.push(X[X.length - 1] + l);
  const nb = new NetBuilder();
  const stripLabel = o.labels?.strip ?? ((i: number) => `Sisi ${i + 1}`);
  const mapStripHoles = (i: number) => o.stripHoles?.[i]?.map((h) => h.map(([u, v]) => [X[i] + u, v] as Vec2));

  const useA = o.sideA ?? closed;
  const useB = o.sideB ?? closed;

  if (o.root === "sideA") {
    const pts = profile.map(([x, y]) => [x, -y] as Vec2);
    nb.add({ id: "sideA", label: o.labels?.A ?? "Alas", kind: "face", points: pts, holes: o.sideHoles?.A?.map((h) => h.map(([x, y]) => [x, -y] as Vec2)) });
    nb.add({
      id: "strip0",
      label: stripLabel(0),
      kind: "face",
      points: rectPoints(X[0], 0, lens[0], depth),
      holes: mapStripHoles(0),
      parent: "sideA",
      hinge: [
        [0, 0],
        [lens[0], 0],
      ],
      angle: 90,
    });
  } else {
    nb.add({ id: "strip0", label: stripLabel(0), kind: "face", points: rectPoints(X[0], 0, lens[0], depth), holes: mapStripHoles(0) });
  }

  for (let i = 1; i < edgeCount; i++) {
    nb.add({
      id: `strip${i}`,
      label: stripLabel(i),
      kind: "face",
      points: rectPoints(X[i], 0, lens[i], depth),
      holes: mapStripHoles(i),
      parent: `strip${i - 1}`,
      hinge: [
        [X[i], 0],
        [X[i], depth],
      ],
      angle: turns[i],
    });
  }

  if (closed && tab > 0) nb.tab(`strip${edgeCount - 1}`, 1, tab, "seam-tab");

  if (useA && o.root === "strip") {
    nb.attach("strip0", [0, 0], [lens[0], 0], profile, { id: "sideA", label: o.labels?.A ?? "Sisi A", angle: 90, holes: o.sideHoles?.A });
  }
  if (useB) {
    nb.attach("strip0", [0, depth], [lens[0], depth], profile, { id: "sideB", label: o.labels?.B ?? "Sisi B", angle: 90, holes: o.sideHoles?.B });
  }
  if (tab > 0) {
    // profil terbuka: tepi penutup (tanpa dinding) tidak diberi tab
    if (useA)
      for (let i = 1; i < edgeCount; i++)
        nb.tryTab(
          [
            ["sideA", i],
            [`strip${i}`, 0],
          ],
          tab,
        );
    if (useB)
      for (let i = 1; i < edgeCount; i++)
        nb.tryTab(
          o.sideBTabs ?? true
            ? [
                ["sideB", i],
                [`strip${i}`, 2],
              ]
            : [[`strip${i}`, 2]],
          tab,
        );
  }
  return nb;
}

/* ------------------------------------------------------------------ */
/* Limas                                                               */
/* ------------------------------------------------------------------ */

export function buildPyramid(o: { n: number; s: number; h: number; tab: number }) {
  const { n, s, h, tab } = o;
  const nb = new NetBuilder();
  const base = regularPolygon(n, s);
  nb.add({ id: "base", label: "Alas", kind: "face", points: base });
  const apothem = s / (2 * Math.tan(Math.PI / n));
  const slant = Math.hypot(h, apothem);
  const angle = 180 - (Math.atan2(h, apothem) * 180) / Math.PI;
  for (let i = 0; i < n; i++) {
    nb.attachEdge("base", i, (L) => [
      [0, 0],
      [L, 0],
      [L / 2, slant],
    ], { id: `face${i}`, label: `Sisi tegak ${i + 1}`, angle });
  }
  if (tab > 0)
    for (let i = 0; i < n; i++)
      nb.tryTab(
        [
          [`face${i}`, 1],
          [`face${(i + 1) % n}`, 2],
        ],
        tab,
      );
  nb.dim(base[0], base[1], "s", 0);
  return nb;
}

/* ------------------------------------------------------------------ */
/* Menara: prisma tegak + atap limas                                   */
/* ------------------------------------------------------------------ */

export function buildTower(o: { n: number; s: number; H: number; roof: number; tab: number; stripHoles?: Record<number, Vec2[][]> }) {
  const { n, s, H, roof, tab } = o;
  const nb = buildProfile({
    profile: regularPolygon(n, s),
    depth: H,
    tab,
    root: "sideA",
    sideB: false,
    stripHoles: o.stripHoles,
    labels: { A: "Alas", strip: (i) => `Dinding ${i + 1}` },
  });
  const apothem = s / (2 * Math.tan(Math.PI / n));
  const slant = Math.hypot(roof, apothem);
  const angle = 90 - (Math.atan2(roof, apothem) * 180) / Math.PI;
  for (let i = 0; i < n; i++) {
    nb.attachEdge(`strip${i}`, 2, (L) => [
      [0, 0],
      [L, 0],
      [L / 2, slant],
    ], { id: `roof${i}`, label: `Atap ${i + 1}`, angle });
  }
  if (tab > 0)
    for (let i = 0; i < n; i++)
      nb.tryTab(
        [
          [`roof${i}`, 1],
          [`roof${(i - 1 + n) % n}`, 2],
        ],
        tab,
      );
  return nb;
}

/** Roda terpisah yang terbang ke posisinya saat dilipat penuh. */
export function addWheels(nb: NetBuilder, L: number, H: number, W: number, t: number, xs: number[], r: number) {
  const bb = nb.panels.flatMap((p) => p.points);
  const maxY = Math.max(...bb.map((q) => q[1]));
  const minX = Math.min(...bb.map((q) => q[0]));
  let k = 0;
  for (const side of [0, 1]) {
    for (const cx of xs) {
      const wx = minX + r + k * (2 * r + 8);
      const wy = maxY + 10 + r;
      const id = `wheel${k++}`;
      nb.add({ id, label: `Roda ${k}`, kind: "flap", points: circlePoints([wx, wy], r, 24), holes: [circlePoints([wx, wy], r * 0.18, 12)] });
      const m =
        side === 0
          ? // sisi kiri (z = 0): Y lokal → +Z, Z lokal → −Y
            [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, cx - wx, wy, -t - 0.5, 1]
          : // sisi kanan (z = W): Y lokal → −Z, Z lokal → +Y
            [1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, cx - wx, -wy, W + t + 0.5, 1];
      nb.get(id).rootPose = m;
    }
  }
  void L;
  void H;
}

