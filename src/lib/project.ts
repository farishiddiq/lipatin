import type { Design } from "./decals";
import { resolveNet, type ResolvedNet } from "./geometry/resolve";
import { emptyMods, type Mods, type NetBase, type Sketch } from "./geometry/types";
import { defaultMaterial, type MaterialSettings } from "./materials";
import { defaultParams, templateById, type Params } from "./templates";
import { uid } from "./utils";

export type ProjectSource =
  | { kind: "template"; templateId: string; params: Params }
  | { kind: "net"; net: NetBase; origin: string };

export interface ProjectData {
  title: string;
  source: ProjectSource;
  material: MaterialSettings;
  compensate: boolean;
  mods: Mods;
  sketches: Sketch[];
  /** Logo/gambar yang ditempel di sisi kardus. */
  design?: Design;
}

export interface ProjectVersion {
  id: string;
  n: number;
  at: number;
  note: string;
  snapshot: ProjectData;
}

export interface Project extends ProjectData {
  id: string;
  createdAt: number;
  updatedAt: number;
  folder: string;
  visibility: "private" | "link" | "public";
  versions: ProjectVersion[];
  remixOf?: { title: string; author: string };
}

/** Template lama yang sudah dihapus: proyek yang memakainya dialihkan ke versi 3D penggantinya. */
const RETIRED: Record<string, { to: string; params?: Params }> = {
  "tank-baja": { to: "tank-3d" },
  "jet-tempur": { to: "jet-tempur-3d" },
  "kapal-bajak-laut": { to: "kapal-bajak-laut-3d" },
  "kereta-uap": { to: "kereta-uap-3d" },
  helikopter: { to: "helikopter-3d" },
  "dino-trex": { to: "trex-3d" },
  "robot-pahlawan": { to: "robot-3d" },
  "pedang-ksatria": { to: "pedang-3d" },
  mobil: { to: "mobil-sport-3d" },
  truk: { to: "truk-monster-3d" },
  "bus-sekolah": { to: "truk-monster-3d" },
  roket: { to: "roket-3d" },
  "kapal-selam": { to: "kapal-bajak-laut-3d" },
};

/** Alihkan proyek dari template yang sudah dihapus; ukuran default pengganti yang dipakai. */
export function migrateProjectData<T extends ProjectData>(d: T): T {
  if (d.source.kind !== "template") return d;
  const r = RETIRED[d.source.templateId];
  const t = r && templateById(r.to);
  if (!r || !t) return d;
  const params = Object.fromEntries(t.params.map((q) => [q.key, r.params?.[q.key] ?? q.default]));
  // id panel berubah, jadi ubahan tab/sudut lama tidak berlaku lagi
  return { ...d, source: { kind: "template", templateId: r.to, params }, mods: emptyMods() };
}

export function newProjectData(templateId: string, params?: Params): ProjectData {
  const t = templateById(templateId);
  if (!t) throw new Error(`Template ${templateId} tidak ada`);
  return {
    title: t.title,
    source: { kind: "template", templateId, params: { ...defaultParams(t), ...params } },
    material: defaultMaterial(),
    compensate: true,
    mods: emptyMods(),
    sketches: [],
  };
}

export function netProjectData(title: string, net: NetBase, origin: string, thickness = 3): ProjectData {
  return {
    title,
    source: { kind: "net", net, origin },
    material: { ...defaultMaterial(), thickness },
    compensate: false,
    mods: emptyMods(),
    sketches: [],
  };
}

export function wrapProject(data: ProjectData, extra?: Partial<Project>): Project {
  const now = Date.now();
  return { ...data, id: uid("p_"), createdAt: now, updatedAt: now, folder: "", visibility: "private", versions: [], ...extra };
}

/* --------- cache: pola dasar jarang berubah dibanding mods/sketsa --------- */

const baseCache = new Map<string, NetBase>();

export function baseNet(d: Pick<ProjectData, "source" | "material" | "compensate">): NetBase {
  if (d.source.kind === "net") return d.source.net;
  const key = JSON.stringify([d.source.templateId, d.source.params, d.material.thickness, d.compensate]);
  const hit = baseCache.get(key);
  if (hit) return hit;
  const t = templateById(d.source.templateId);
  if (!t) return { panels: [] };
  const net = t.build(d.source.params, { t: d.material.thickness, compensate: d.compensate });
  if (baseCache.size > 60) baseCache.delete(baseCache.keys().next().value!);
  baseCache.set(key, net);
  return net;
}

export function resolveProject(d: ProjectData): ResolvedNet {
  return resolveNet(baseNet(d), d.mods, d.sketches, d.material.thickness);
}

export const templateOf = (d: ProjectData) => (d.source.kind === "template" ? templateById(d.source.templateId) : undefined);
