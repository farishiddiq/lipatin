import type { NetBase } from "./geometry/types";
import { MAINAN3D } from "./templates-3d";
import { MESIR3D, NUSANTARA3D } from "./templates-budaya";
import { CITACITA } from "./templates-citacita";
import { HOBI } from "./templates-hobi";

export type Category =
  | "kendaraan"
  | "figur"
  | "replika"
  | "nusantara"
  | "mesir"
  | "dokter"
  | "pilot"
  | "chef"
  | "pemadam"
  | "arsitek"
  | "ilmuwan"
  | "dokterhewan"
  | "gaming"
  | "musik"
  | "kreator"
  | "fashion"
  | "rumahboneka"
  | "olahraga"
  | "kebun"
  | "koleksi"
  | "cosplay";
export type Difficulty = "mudah" | "sedang" | "sulit";

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: "kendaraan", label: "Kendaraan" },
  { id: "figur", label: "Figur & senjata" },
  { id: "replika", label: "Replika" },
  { id: "nusantara", label: "Nusantara" },
  { id: "mesir", label: "Mesir kuno" },
  { id: "dokter", label: "Dokter & perawat" },
  { id: "pilot", label: "Pilot & astronot" },
  { id: "chef", label: "Chef & barista" },
  { id: "pemadam", label: "Pemadam & polisi" },
  { id: "arsitek", label: "Arsitek & insinyur" },
  { id: "ilmuwan", label: "Ilmuwan" },
  { id: "dokterhewan", label: "Dokter hewan" },
  { id: "gaming", label: "Gaming" },
  { id: "musik", label: "Musik" },
  { id: "kreator", label: "Konten kreator" },
  { id: "fashion", label: "Fashion & kecantikan" },
  { id: "rumahboneka", label: "Rumah boneka" },
  { id: "olahraga", label: "Olahraga meja" },
  { id: "kebun", label: "Berkebun" },
  { id: "koleksi", label: "Koleksi & display" },
  { id: "cosplay", label: "Cosplay" },
];

/** Kelompok kategori untuk galeri (baris chip pertama). */
export const CATEGORY_GROUPS: { id: string; label: string; emoji: string; cats: Category[] }[] = [
  { id: "mainan", label: "Mainan 3D", emoji: "🚀", cats: ["kendaraan", "figur", "replika"] },
  { id: "budaya", label: "Budaya", emoji: "🛕", cats: ["nusantara", "mesir"] },
  { id: "citacita", label: "Cita-cita", emoji: "🎯", cats: ["dokter", "pilot", "chef", "pemadam", "arsitek", "ilmuwan", "dokterhewan"] },
  { id: "hobi", label: "Hobi", emoji: "🎨", cats: ["gaming", "musik", "kreator", "fashion", "rumahboneka", "olahraga", "kebun", "koleksi", "cosplay"] },
];

export interface ParamDef {
  key: string;
  label: string;
  kind: "mm" | "count" | "deg" | "choice";
  min?: number;
  max?: number;
  step?: number;
  default: number | string;
  options?: { value: string; label: string }[];
  /** Disembunyikan di Mode Mudah. */
  advanced?: boolean;
}

export type Params = Record<string, number | string>;

export interface BuildCtx {
  t: number;
  compensate: boolean;
}

export interface Template {
  id: string;
  title: string;
  category: Category;
  description: string;
  difficulty: Difficulty;
  minutes: number;
  age: number;
  tags: string[];
  params: ParamDef[];
  build: (p: Params, ctx: BuildCtx) => NetBase;
  featured?: boolean;
}

export const TEMPLATES: Template[] = [...MAINAN3D, ...NUSANTARA3D, ...MESIR3D, ...CITACITA, ...HOBI];

export const templateById = (id: string) => TEMPLATES.find((t) => t.id === id);

export function defaultParams(t: Template): Params {
  return Object.fromEntries(t.params.map((p) => [p.key, p.default]));
}
