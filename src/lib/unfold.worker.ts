/// <reference lib="webworker" />
import { BufferAttribute, BufferGeometry } from "three";
import { SimplifyModifier } from "three/examples/jsm/modifiers/SimplifyModifier.js";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { unfoldMesh, type RawMesh, type UnfoldOptions } from "./geometry/unfold";

export type WorkerRequest =
  | { id: number; type: "unfold"; mesh: RawMesh; opts: UnfoldOptions }
  | { id: number; type: "simplify"; mesh: RawMesh; targetTriangles: number };

async function simplify(mesh: RawMesh, target: number): Promise<RawMesh> {
  let g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(mesh.positions), 3));
  if (mesh.index) g.setIndex(new BufferAttribute(new Uint32Array(mesh.index), 1));
  g = mergeVertices(g.index ? g.toNonIndexed() : g, 1e-4);
  const tris = (g.index ? g.index.count : g.getAttribute("position").count) / 3;
  if (tris <= target) return mesh;
  const removeVerts = Math.floor((tris - target) / 2);
  const out = await new SimplifyModifier().modify(g, removeVerts);
  const pos = out.getAttribute("position");
  const idx = out.getIndex();
  return { positions: new Float32Array(pos.array as ArrayLike<number>).slice(0, pos.count * 3), index: idx ? new Uint32Array(idx.array as ArrayLike<number>) : null };
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const req = e.data;
  try {
    if (req.type === "unfold") {
      const res = unfoldMesh(req.mesh, req.opts);
      self.postMessage({ id: req.id, ok: true, res });
    } else {
      const res = await simplify(req.mesh, req.targetTriangles);
      self.postMessage({ id: req.id, ok: true, res });
    }
  } catch (err) {
    self.postMessage({ id: req.id, ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
