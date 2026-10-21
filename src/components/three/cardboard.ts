"use client";

import { useEffect, useState } from "react";
import {
  BufferAttribute,
  CanvasTexture,
  ClampToEdgeWrapping,
  ShapeGeometry,
  Color,
  ExtrudeGeometry,
  MeshStandardMaterial,
  Path,
  RepeatWrapping,
  Shape,
  SRGBColorSpace,
  Vector2,
  type ExtrudeGeometryOptions,
} from "three";
import type { Panel } from "@/lib/geometry/types";
import { applyAffine, invertAffine, loadImage, type DecalRender } from "@/lib/decals";
import type { MaterialSettings } from "@/lib/materials";
import { materialInfo } from "@/lib/materials";

/* Tekstur prosedural: tidak butuh unduhan aset, jadi editor tetap ringan dan bisa offline. */

function rand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const textureCache = new Map<string, CanvasTexture>();

function surfaceTexture(color: MaterialSettings["color"]) {
  const key = `surface-${color}`;
  const hit = textureCache.get(key);
  if (hit) return hit;
  const size = 512;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const base = color === "kraft" ? "#b88a5a" : "#ece6dc";
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  const r = rand(color === "kraft" ? 7 : 11);
  // bintik halus
  for (let i = 0; i < 9000; i++) {
    const x = r() * size;
    const y = r() * size;
    const l = r();
    g.fillStyle = color === "kraft" ? `rgba(${l > 0.5 ? "255,236,205" : "70,40,15"},${0.05 + r() * 0.06})` : `rgba(${l > 0.5 ? "255,255,255" : "120,110,95"},${0.04 + r() * 0.05})`;
    g.fillRect(x, y, 1 + r() * 1.5, 1 + r() * 1.5);
  }
  // serat pendek
  g.lineCap = "round";
  for (let i = 0; i < 700; i++) {
    const x = r() * size;
    const y = r() * size;
    const a = r() * Math.PI;
    const len = 3 + r() * 10;
    g.strokeStyle = color === "kraft" ? `rgba(90,55,25,${0.05 + r() * 0.08})` : `rgba(150,140,125,${0.05 + r() * 0.06})`;
    g.lineWidth = 0.6 + r() * 0.6;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    g.stroke();
  }
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  textureCache.set(key, t);
  return t;
}

function fluteTexture(color: MaterialSettings["color"], hasFlute: boolean) {
  const key = `flute-${color}-${hasFlute}`;
  const hit = textureCache.get(key);
  if (hit) return hit;
  const w = 128;
  const h = 64;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  const liner = color === "kraft" ? "#9c7044" : "#d8cfc0";
  const core = color === "kraft" ? "#c99b67" : "#e9e2d6";
  const dark = color === "kraft" ? "#6b4a2b" : "#a89c88";
  g.fillStyle = hasFlute ? core : liner;
  g.fillRect(0, 0, w, h);
  if (hasFlute) {
    g.fillStyle = dark;
    g.globalAlpha = 0.35;
    g.fillRect(0, 0, w, h);
    g.globalAlpha = 1;
    // gelombang flute
    g.fillStyle = core;
    g.beginPath();
    g.moveTo(0, h);
    for (let x = 0; x <= w; x++) g.lineTo(x, h / 2 + Math.sin((x / w) * Math.PI * 2) * (h * 0.36));
    g.lineTo(w, h);
    g.closePath();
    g.globalAlpha = 0.55;
    g.fill();
    g.globalAlpha = 1;
    g.strokeStyle = dark;
    g.lineWidth = 3;
    g.beginPath();
    for (let x = 0; x <= w; x++) {
      const y = h / 2 + Math.sin((x / w) * Math.PI * 2) * (h * 0.36);
      if (x === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
    g.fillStyle = liner;
    g.fillRect(0, 0, w, h * 0.1);
    g.fillRect(0, h * 0.9, w, h * 0.1);
  } else {
    g.fillStyle = dark;
    g.globalAlpha = 0.2;
    for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 1);
    g.globalAlpha = 1;
  }
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.colorSpace = SRGBColorSpace;
  textureCache.set(key, t);
  return t;
}

export interface CardboardMaterials {
  face: MeshStandardMaterial;
  faceHover: MeshStandardMaterial;
  faceSelected: MeshStandardMaterial;
  faceIssue: MeshStandardMaterial;
  edge: MeshStandardMaterial;
  pitch: number;
}

export function createMaterials(m: MaterialSettings): CardboardMaterials {
  const info = materialInfo(m.type);
  const surface = surfaceTexture(m.color).clone();
  surface.needsUpdate = true;
  surface.repeat.set(1 / 140, 1 / 140);
  const hasFlute = info.pitch > 0;
  const fl = fluteTexture(m.color, hasFlute).clone();
  fl.needsUpdate = true;
  const pitch = hasFlute ? info.pitch * (m.thickness / info.thickness) : 8;
  fl.repeat.set(1 / pitch, 1 / m.thickness);
  fl.offset.set(0, 1 - 1 / m.thickness);
  const mk = (emissive?: string, intensity = 0) =>
    new MeshStandardMaterial({ map: surface, roughness: 0.92, metalness: 0, emissive: new Color(emissive ?? "#000"), emissiveIntensity: intensity });
  return {
    face: mk(),
    faceHover: mk("#f97316", 0.18),
    faceSelected: mk("#ea580c", 0.42),
    faceIssue: mk("#dc2626", 0.4),
    edge: new MeshStandardMaterial({ map: fl, roughness: 0.95 }),
    pitch,
  };
}

export function disposeMaterials(m: CardboardMaterials) {
  for (const mat of [m.face, m.faceHover, m.faceSelected, m.faceIssue, m.edge]) {
    mat.map?.dispose();
    mat.dispose();
  }
}

/**
 * Geometri panel: bentuk 2D diekstrusi setebal kardus ke arah sisi luar (−Y).
 * UV tepi diatur agar gelombang flute muncul di tepi yang memotong arah flute.
 */
export function panelGeometry(p: Panel, thickness: number, flute: MaterialSettings["flute"]) {
  const shape = new Shape(p.points.map(([x, y]) => new Vector2(x, y)));
  for (const h of p.holes ?? []) shape.holes.push(new Path(h.map(([x, y]) => new Vector2(x, y))));
  const opts: ExtrudeGeometryOptions = {
    depth: Math.max(0.2, thickness),
    bevelEnabled: false,
    UVGenerator: {
      generateTopUV: (_g, v, a, b, c) => [new Vector2(v[a * 3], v[a * 3 + 1]), new Vector2(v[b * 3], v[b * 3 + 1]), new Vector2(v[c * 3], v[c * 3 + 1])],
      generateSideWallUV: (_g, v, a, b, c, d) => {
        const ax = v[a * 3],
          ay = v[a * 3 + 1],
          az = v[a * 3 + 2];
        const bx = v[b * 3],
          by = v[b * 3 + 1],
          bz = v[b * 3 + 2];
        const cx = v[c * 3],
          cy = v[c * 3 + 1],
          cz = v[c * 3 + 2];
        const dx = v[d * 3],
          dy = v[d * 3 + 1],
          dz = v[d * 3 + 2];
        // tepi sejajar flute: tampak sebagai garis lurus (u konstan)
        const alongX = Math.abs(bx - ax) >= Math.abs(by - ay);
        const crossesFlute = flute === "vertical" ? alongX : !alongX;
        const u = (x: number, y: number) => (crossesFlute ? (alongX ? x : y) : 0.25);
        return [new Vector2(u(ax, ay), 1 - az), new Vector2(u(bx, by), 1 - bz), new Vector2(u(cx, cy), 1 - cz), new Vector2(u(dx, dy), 1 - dz)];
      },
    },
  };
  const g = new ExtrudeGeometry(shape, opts);
  g.rotateX(Math.PI / 2);
  g.computeVertexNormals();
  return g;
}

/* ------------------------------------------------------------------ */
/* Tempelan logo                                                       */
/* ------------------------------------------------------------------ */

const PAD = 4;
const decalTexCache = new Map<string, Promise<{ tex: CanvasTexture; w: number; h: number }>>();

function decalTexture(id: string, src: string) {
  let p = decalTexCache.get(id);
  if (!p) {
    p = loadImage(src).then((img) => {
      // tepi transparen agar UV di luar gambar (clamp) tidak menyebarkan piksel
      const c = document.createElement("canvas");
      c.width = img.naturalWidth + PAD * 2;
      c.height = img.naturalHeight + PAD * 2;
      c.getContext("2d")!.drawImage(img, PAD, PAD);
      const tex = new CanvasTexture(c);
      tex.colorSpace = SRGBColorSpace;
      tex.wrapS = tex.wrapT = ClampToEdgeWrapping;
      tex.anisotropy = 4;
      return { tex, w: img.naturalWidth, h: img.naturalHeight };
    });
    decalTexCache.set(id, p);
  }
  return p;
}

export function useDecalTextures(decals?: DecalRender[]) {
  const [map, setMap] = useState(new Map<string, CanvasTexture>());
  const key = (decals ?? []).map((d) => d.asset.id).join("|");
  useEffect(() => {
    let alive = true;
    const ids = [...new Set((decals ?? []).map((d) => d.asset))];
    Promise.all(ids.map((a) => decalTexture(a.id, a.src).then((t) => [a.id, t.tex] as const))).then((entries) => {
      if (alive) setMap(new Map(entries));
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return map;
}

/** Bidang tipis tepat di luar sisi cetak panel, UV dihitung dari kotak tempelan. */
export function decalGeometry(p: Panel, d: DecalRender, thickness: number) {
  const shape = new Shape(p.points.map(([x, y]) => new Vector2(x, y)));
  for (const h of p.holes ?? []) shape.holes.push(new Path(h.map(([x, y]) => new Vector2(x, y))));
  const g = new ShapeGeometry(shape);
  const pos = g.getAttribute("position");
  const uv = new Float32Array(pos.count * 2);
  const a = (-d.rot * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const tw = d.asset.w + PAD * 2;
  const th = d.asset.h + PAD * 2;
  const inv = d.matrix ? invertAffine(d.matrix) : null;
  for (let i = 0; i < pos.count; i++) {
    if (inv) {
      const [px, py] = applyAffine(inv, pos.getX(i), pos.getY(i));
      uv[i * 2] = (PAD + px) / tw;
      uv[i * 2 + 1] = 1 - (PAD + py) / th;
      continue;
    }
    const x = pos.getX(i) - d.cx;
    const y = pos.getY(i) - d.cy;
    const lx = x * cos - y * sin;
    const ly = x * sin + y * cos;
    const u = lx / d.w + 0.5;
    const v = ly / d.h + 0.5; // 0 = atas gambar
    uv[i * 2] = (PAD + u * d.asset.w) / tw;
    uv[i * 2 + 1] = 1 - (PAD + v * d.asset.h) / th;
  }
  g.setAttribute("uv", new BufferAttribute(uv, 2));
  g.rotateX(Math.PI / 2);
  g.translate(0, -Math.max(0.2, thickness) - 0.12, 0);
  return g;
}
