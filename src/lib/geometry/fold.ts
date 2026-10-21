import { Matrix4, Quaternion, Vector3 } from "three";
import type { ResolvedNet } from "./resolve";

export type ProgressFn = (panelId: string) => number;

const _t1 = new Matrix4();
const _r = new Matrix4();
const _t2 = new Matrix4();
const _pos = new Vector3();
const _q = new Quaternion();
const _s = new Vector3();
const _qi = new Quaternion();

/**
 * Hitung matriks dunia setiap panel. Pola datar berada di bidang XZ (x → X, y → Z),
 * sisi dalam menghadap +Y. Sudut positif mengangkat panel ke arah +Y (lipat gunung dari sisi cetak).
 */
export function foldMatrices(r: ResolvedNet, progress: number | ProgressFn, out = new Map<string, Matrix4>()) {
  const prog: ProgressFn = typeof progress === "number" ? () => progress : progress;
  for (const id of r.order) {
    const p = r.byId.get(id)!;
    let m = out.get(id);
    if (!m) {
      m = new Matrix4();
      out.set(id, m);
    }
    if (!p.parent) {
      if (p.rootPose) {
        const k = Math.min(1, Math.max(0, prog(id)));
        _t1.fromArray(p.rootPose).decompose(_pos, _q, _s);
        _qi.identity().slerp(_q, k);
        m.compose(_pos.multiplyScalar(k), _qi, _s.set(1, 1, 1));
      } else {
        m.identity();
      }
      continue;
    }
    const h = r.hinges.get(id)!;
    const theta = ((r.angles.get(id) ?? 0) * prog(id) * Math.PI) / 180;
    _t1.makeTranslation(h.a.x, h.a.y, h.a.z);
    _r.makeRotationAxis(h.k, theta);
    _t2.makeTranslation(-h.a.x, -h.a.y, -h.a.z);
    m.copy(out.get(p.parent)!).multiply(_t1).multiply(_r).multiply(_t2);
  }
  return out;
}

export const flat3 = (x: number, y: number, target = new Vector3()) => target.set(x, 0, y);
