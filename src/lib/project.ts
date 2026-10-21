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

/** Template yang dihapus karena kembar dengan template lain: proyek lama dialihkan ke penggantinya. */
const RETIRED: Record<string, { to: string; params?: Params }> = {
  "prisma-segitiga": { to: "prisma-segi-n", params: { n: 3 } },
  "limas-segiempat": { to: "limas-segi-n", params: { n: 4 } },
  tenda: { to: "prisma-segi-n", params: { n: 3 } },
  lampion: { to: "lentera-ramadan" },
  "helm-robot": { to: "helm-ksatria" },
  topeng: { to: "topeng-pahlawan" },
  "kalender-meja": { to: "kartu-meja" },
  "parsel-lebaran": { to: "kotak-kue" },
};

/** Alihkan proyek dari template yang sudah dihapus; ukuran yang namanya sama tetap dipakai. */
export function migrateProjectData<T extends ProjectData>(d: T): T {
  if (d.source.kind !== "template") return d;
  const r = RETIRED[d.source.templateId];
  const t = r && templateById(r.to);
  if (!r || !t) return d;
  const old = d.source.params;
  const params = Object.fromEntries(t.params.map((q) => [q.key, r.params?.[q.key] ?? old[q.key] ?? q.default]));
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
