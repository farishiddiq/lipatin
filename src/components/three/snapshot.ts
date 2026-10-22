"use client";

import { AmbientLight, CanvasTexture, DirectionalLight, Group, HemisphereLight, Mesh, MeshBasicMaterial, PerspectiveCamera, PlaneGeometry, Scene, SRGBColorSpace, Vector3, WebGLRenderer } from "three";
import { foldMatrices } from "@/lib/geometry/fold";
import { foldedBounds, type ResolvedNet } from "@/lib/geometry/resolve";
import { defaultMaterial } from "@/lib/materials";
import { createMaterials, panelGeometry, type CardboardMaterials } from "./cardboard";

/*
 * Foto 3D statis untuk kartu galeri: satu WebGLRenderer dipakai bergantian untuk semua kartu
 * (browser membatasi jumlah konteks WebGL), hasilnya disimpan sebagai gambar.
 */

const W = 640;
const H = 480;
const S = 0.01;

let renderer: WebGLRenderer | null = null;
let materials: CardboardMaterials | null = null;
let shadowTex: CanvasTexture | null = null;
const cache = new Map<string, string>();
const pending = new Map<string, Promise<string | null>>();
let chain: Promise<unknown> = Promise.resolve();

function setup() {
  if (renderer) return renderer;
  renderer = new WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.outputColorSpace = SRGBColorSpace;
  materials = createMaterials(defaultMaterial());
  // bayangan lembut di lantai (gradasi radial)
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, "rgba(59,42,26,0.42)");
  grad.addColorStop(1, "rgba(59,42,26,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  shadowTex = new CanvasTexture(c);
  return renderer;
}

function render(net: ResolvedNet): string {
  const r = setup();
  const scene = new Scene();
  scene.add(new HemisphereLight("#fff8ee", "#7a6a58", 1.3));
  scene.add(new AmbientLight("#ffffff", 0.25));
  const key = new DirectionalLight("#ffffff", 2);
  key.position.set(3, 6, 4);
  const fill = new DirectionalLight("#ffffff", 0.5);
  fill.position.set(-4, 3, -2);
  scene.add(key, fill);

  const mats = foldMatrices(net, 1);
  const b = foldedBounds(net, mats);
  const size = b.max.clone().sub(b.min);
  const group = new Group();
  // sumbu x dicerminkan seperti di penampil 3D, agar sisi luar sama dengan pola yang dicetak
  group.scale.set(-S, S, S);
  group.position.set(((b.min.x + b.max.x) / 2) * S, -b.min.y * S, (-(b.min.z + b.max.z) / 2) * S);
  const geos = net.panels.map((p) => {
    const geo = panelGeometry(p, net.thickness, defaultMaterial().flute);
    const mesh = new Mesh(geo, [materials!.face, materials!.edge]);
    mesh.matrixAutoUpdate = false;
    mesh.matrix.copy(mats.get(p.id)!);
    group.add(mesh);
    return geo;
  });
  scene.add(group);

  const radius = 0.5 * size.length() * S;
  const shadow = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.setScalar(Math.max(size.x, size.z) * S * 1.5);
  scene.add(shadow);

  const cam = new PerspectiveCamera(30, W / H, 0.01, 200);
  const fov = (cam.fov * Math.PI) / 180;
  const fovH = 2 * Math.atan(Math.tan(fov / 2) * (W / H));
  const dist = (radius / Math.sin(Math.min(fov, fovH) / 2)) * 1.02;
  const ty = size.y * S * 0.45;
  cam.position.copy(new Vector3(0.75, 0.55, 1).normalize().multiplyScalar(dist)).add(new Vector3(0, ty, 0));
  cam.lookAt(0, ty, 0);

  r.render(scene, cam);
  const url = r.domElement.toDataURL("image/webp", 0.86);
  geos.forEach((g) => g.dispose());
  shadow.geometry.dispose();
  (shadow.material as MeshBasicMaterial).dispose();
  return url;
}

/** Foto 3D model terlipat penuh, dirender bergiliran (satu per giliran) lalu disimpan. */
export function snapshot(id: string, net: ResolvedNet): Promise<string | null> {
  const hit = cache.get(id);
  if (hit) return Promise.resolve(hit);
  const wait = pending.get(id);
  if (wait) return wait;
  const job = chain.then(
    () =>
      new Promise<string | null>((resolve) => {
        // beri jeda agar halaman tetap responsif di antara render
        setTimeout(() => {
          try {
            const url = render(net);
            cache.set(id, url);
            resolve(url);
          } catch {
            resolve(null);
          } finally {
            pending.delete(id);
          }
        }, 16);
      }),
  );
  chain = job;
  pending.set(id, job);
  return job;
}

export const cachedSnapshot = (id: string) => cache.get(id);
