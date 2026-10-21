import {
  Box3,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  Mesh,
  ShapeUtils,
  Vector2,
  Vector3,
  type Object3D,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { foldMatrices } from "./geometry/fold";
import type { ResolvedNet } from "./geometry/resolve";
import type { RawMesh } from "./geometry/unfold";

export type PrimKind = "balok" | "prisma" | "limas" | "silinder" | "kerucut" | "bola";

export interface Prim {
  id: string;
  kind: PrimKind;
  w: number;
  h: number;
  d: number;
  n: number;
  x: number;
  z: number;
}

export const PRIM_LABEL: Record<PrimKind, string> = {
  balok: "Kubus / balok",
  prisma: "Prisma",
  limas: "Limas",
  silinder: "Silinder",
  kerucut: "Kerucut",
  bola: "Bola low-poly",
};

export function primGeometry(p: Prim): BufferGeometry {
  let g: BufferGeometry;
  const r = p.w / 2;
  switch (p.kind) {
    case "balok":
      g = new BoxGeometry(p.w, p.h, p.d);
      break;
    case "prisma":
      g = new CylinderGeometry(r, r, p.h, p.n, 1);
      break;
    case "silinder":
      g = new CylinderGeometry(r, r, p.h, Math.max(8, p.n), 1);
      break;
    case "limas":
      g = new ConeGeometry(r, p.h, p.n, 1);
      break;
    case "kerucut":
      g = new ConeGeometry(r, p.h, Math.max(8, p.n), 1);
      break;
    case "bola":
      g = new IcosahedronGeometry(r, 1);
      g.translate(0, r - p.h / 2, 0);
      break;
  }
  g.translate(p.x, p.h / 2, p.z);
  return g;
}

function positionsOnly(g: BufferGeometry) {
  const n = g.index ? g.toNonIndexed() : g.clone();
  const out = new BufferGeometry();
  out.setAttribute("position", n.getAttribute("position"));
  return out;
}

export function mergeToGeometry(list: BufferGeometry[]): BufferGeometry {
  const merged = mergeGeometries(list.map(positionsOnly), false);
  merged.computeVertexNormals();
  return merged;
}

export function geometryToRaw(g: BufferGeometry): RawMesh {
  const pos = g.getAttribute("position");
  const idx = g.getIndex();
  return { positions: new Float32Array(pos.array as ArrayLike<number>).slice(0, pos.count * 3), index: idx ? new Uint32Array(idx.array as ArrayLike<number>) : null };
}

export function rawToGeometry(m: RawMesh): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(m.positions), 3));
  if (m.index) g.setIndex(new BufferAttribute(new Uint32Array(m.index), 1));
  const flat = g.index ? g.toNonIndexed() : g;
  flat.computeVertexNormals();
  return flat;
}

export const triangleCount = (g: BufferGeometry) => (g.index ? g.index.count : g.getAttribute("position").count) / 3;

/** Normalisasi model impor: tinggi target (mm), alas di y = 0, terpusat di x/z. */
export function normalizeGeometry(g: BufferGeometry, targetHeight: number) {
  g.computeBoundingBox();
  const b = g.boundingBox!;
  const size = b.getSize(new Vector3());
  const s = targetHeight / (size.y || 1);
  g.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
  g.scale(s, s, s);
  return g;
}

export const MAX_UPLOAD = 50 * 1024 * 1024;

export async function loadModelFile(file: File): Promise<BufferGeometry> {
  const ext = file.name.toLowerCase().split(".").pop();
  if (!ext || !["obj", "stl", "glb"].includes(ext)) throw new Error("Format belum didukung. Gunakan OBJ, STL, atau GLB.");
  if (file.size > MAX_UPLOAD) throw new Error("Berkas lebih dari 50 MB. Sederhanakan dulu di aplikasi 3D-mu.");
  const collect = (root: Object3D) => {
    root.updateMatrixWorld(true);
    const parts: BufferGeometry[] = [];
    root.traverse((o) => {
      const m = o as Mesh;
      if (m.isMesh && m.geometry?.getAttribute("position")) parts.push(m.geometry.clone().applyMatrix4(m.matrixWorld));
    });
    if (!parts.length) throw new Error("Tidak ada mesh di dalam berkas ini.");
    return mergeToGeometry(parts);
  };
  if (ext === "stl") {
    const { STLLoader } = await import("three/examples/jsm/loaders/STLLoader.js");
    const g = new STLLoader().parse(await file.arrayBuffer());
    return mergeToGeometry([g]);
  }
  if (ext === "obj") {
    const { OBJLoader } = await import("three/examples/jsm/loaders/OBJLoader.js");
    return collect(new OBJLoader().parse(await file.text()));
  }
  const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
  const gltf = await new GLTFLoader().parseAsync(await file.arrayBuffer(), "");
  return collect(gltf.scene);
}

/** Mesh permukaan model terlipat dari sebuah pola (untuk "ambil dari galeri" lalu dibongkar ulang). */
export function foldedMesh(net: ResolvedNet): BufferGeometry {
  const mats = foldMatrices(net, 1);
  const pos: number[] = [];
  const v = new Vector3();
  for (const p of net.panels) {
    if (p.kind !== "face") continue;
    const m = mats.get(p.id)!;
    const contour = p.points.map(([x, y]) => new Vector2(x, y));
    const tris = ShapeUtils.triangulateShape(contour, []);
    for (const t of tris) {
      let [a, b, c] = t.map((i) => p.points[i]);
      const cr = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      if (cr < 0) [b, c] = [c, b];
      for (const q of [a, b, c]) {
        v.set(q[0], 0, q[1]).applyMatrix4(m);
        pos.push(v.x, v.y, v.z);
      }
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.computeBoundingBox();
  const b = g.boundingBox ?? new Box3();
  g.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
  g.computeVertexNormals();
  return g;
}
