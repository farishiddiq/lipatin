import { Vector3 } from "three";
import { foldMatrices } from "./geometry/fold";
import { bbox } from "./geometry/polygon";
import type { ResolvedNet } from "./geometry/resolve";
import type { Panel } from "./geometry/types";

/** Gambar unggahan (selalu dirasterisasi ke PNG ≤ 1024 px agar aman dan seragam). */
export interface DesignAsset {
  id: string;
  name: string;
  src: string;
  w: number;
  h: number;
  /** Aset internal (mis. swatch warna sisi) yang tidak ditampilkan di daftar logo. */
  hidden?: boolean;
}

/** Matriks afin SVG [a, b, c, d, e, f]: x' = a·x + c·y + e, y' = b·x + d·y + f (piksel aset → mm pola). */
export type Affine = [number, number, number, number, number, number];

/** Cetakan foto yang dipetakan presisi ke panel (dari fitur Gambar → pola). */
export interface Print {
  panelId: string;
  assetId: string;
  matrix: Affine;
}

/** Tempelan gambar pada satu sisi. x/y: geser relatif ukuran panel (−0,5…0,5); rotation: derajat relatif posisi tegak. */
export interface Decal {
  panelId: string;
  assetId: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface Design {
  assets: DesignAsset[];
  decals: Decal[];
  prints?: Print[];
}

export const emptyDesign = (): Design => ({ assets: [], decals: [] });

export interface DecalRender {
  panelId: string;
  asset: DesignAsset;
  cx: number;
  cy: number;
  w: number;
  h: number;
  /** Rotasi akhir dalam derajat (searah jarum jam di ruang pola). */
  rot: number;
  /** Bila ada, dipakai menggantikan kotak cx/cy/w/h/rot. */
  matrix?: Affine;
}

export const defaultDecal = (panelId: string, assetId: string): Decal => ({ panelId, assetId, x: 0, y: 0, scale: 0.6, rotation: 0 });

const uprightCache = new WeakMap<ResolvedNet, Map<string, number>>();

/** Rotasi agar gambar tampak tegak saat kardus terlipat penuh (dinding: atas = langit; tutup/alas: atas = belakang). */
export function uprightRotation(net: ResolvedNet, panelId: string): number {
  let cache = uprightCache.get(net);
  if (!cache) {
    cache = new Map();
    const mats = foldMatrices(net, 1);
    for (const p of net.panels) {
      const m = mats.get(p.id);
      if (!m) continue;
      const X = new Vector3(1, 0, 0).transformDirection(m);
      const Z = new Vector3(0, 0, 1).transformDirection(m);
      const N = new Vector3(0, 1, 0).transformDirection(m);
      const U = Math.abs(N.y) > 0.7 ? new Vector3(0, 0, -1) : new Vector3(0, 1, 0);
      const dx = X.dot(U);
      const dy = Z.dot(U);
      const deg = Math.hypot(dx, dy) < 1e-6 ? 0 : (Math.atan2(dx, -dy) * 180) / Math.PI;
      cache.set(p.id, Math.round(deg));
    }
    uprightCache.set(net, cache);
  }
  return cache.get(panelId) ?? 0;
}

export function decalBox(panel: Panel, d: Decal, asset: DesignAsset, upright: number) {
  const b = bbox(panel.points);
  const bw = b.maxX - b.minX;
  const bh = b.maxY - b.minY;
  const size = d.scale * Math.min(bw, bh);
  const aspect = asset.h / Math.max(1, asset.w);
  const w = aspect <= 1 ? size : size / aspect;
  const h = w * aspect;
  return { cx: (b.minX + b.maxX) / 2 + d.x * bw, cy: (b.minY + b.maxY) / 2 + d.y * bh, w, h, rot: upright + d.rotation };
}

export function decalRenders(net: ResolvedNet, design?: Design): DecalRender[] {
  if (!design) return [];
  const out: DecalRender[] = [];
  for (const pr of design.prints ?? []) {
    const asset = design.assets.find((a) => a.id === pr.assetId);
    if (!asset || !net.byId.has(pr.panelId)) continue;
    out.push({ panelId: pr.panelId, asset, cx: 0, cy: 0, w: asset.w, h: asset.h, rot: 0, matrix: pr.matrix });
  }
  for (const d of design.decals) {
    const panel = net.byId.get(d.panelId);
    const asset = design.assets.find((a) => a.id === d.assetId);
    if (!panel || !asset) continue;
    out.push({ panelId: d.panelId, asset, ...decalBox(panel, d, asset, uprightRotation(net, d.panelId)) });
  }
  return out;
}

export const MAX_DESIGN_FILE = 5 * 1024 * 1024;

/** Baca PNG/JPG/SVG lalu rasterisasi ke PNG (maks 1024 px). SVG tidak pernah dieksekusi, hanya digambar sebagai gambar. */
export async function readDesignFile(file: File): Promise<Omit<DesignAsset, "id">> {
  const ok = ["image/png", "image/jpeg", "image/svg+xml"].includes(file.type) || /\.(png|jpe?g|svg)$/i.test(file.name);
  if (!ok) throw new Error("Format belum didukung. Gunakan PNG, JPG, atau SVG.");
  if (file.size > MAX_DESIGN_FILE) throw new Error("Berkas lebih dari 5 MB. Perkecil dulu gambarnya.");
  let url: string;
  const isSvg = file.type === "image/svg+xml" || /\.svg$/i.test(file.name);
  if (isSvg) {
    let text = await file.text();
    // pastikan ada ukuran intrinsik agar bisa digambar ke kanvas
    const vb = text.match(/viewBox="([\d.\-\s,]+)"/i);
    if (vb && !/<svg[^>]*\swidth=/i.test(text)) {
      const [, , vw, vh] = vb[1].split(/[\s,]+/).map(Number);
      const k = 1024 / Math.max(vw, vh);
      text = text.replace(/<svg/i, `<svg width="${Math.round(vw * k)}" height="${Math.round(vh * k)}"`);
    }
    url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`;
  } else {
    url = await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = () => rej(new Error("Gagal membaca berkas."));
      r.readAsDataURL(file);
    });
  }
  const img = await loadImage(url);
  const k = Math.min(1, 1024 / Math.max(img.naturalWidth || 512, img.naturalHeight || 512));
  const w = Math.max(1, Math.round((img.naturalWidth || 512) * k));
  const h = Math.max(1, Math.round((img.naturalHeight || 512) * k));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  c.getContext("2d")!.drawImage(img, 0, 0, w, h);
  return { name: file.name, src: c.toDataURL("image/png"), w, h };
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error("Gambar tidak bisa dibuka. Coba berkas lain."));
    img.src = src;
  });
}

export function invertAffine([a, b, c, d, e, f]: Affine): Affine {
  const det = a * d - b * c || 1e-12;
  return [d / det, -b / det, -c / det, a / det, (c * f - d * e) / det, (b * e - a * f) / det];
}

export const applyAffine = ([a, b, c, d, e, f]: Affine, x: number, y: number): [number, number] => [a * x + c * y + e, b * x + d * y + f];

/** Komposisi: hasil = m1 ∘ m2 (terapkan m2 dulu). */
export function composeAffine(m1: Affine, m2: Affine): Affine {
  const [a1, b1, c1, d1, e1, f1] = m1;
  const [a2, b2, c2, d2, e2, f2] = m2;
  return [a1 * a2 + c1 * b2, b1 * a2 + d1 * b2, a1 * c2 + c1 * d2, b1 * c2 + d1 * d2, a1 * e2 + c1 * f2 + e1, b1 * e2 + d1 * f2 + f1];
}
