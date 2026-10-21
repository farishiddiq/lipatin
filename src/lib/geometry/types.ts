/** Satuan internal selalu milimeter. Sumbu y pada pola 2D mengarah ke bawah (seperti SVG). */
export type Vec2 = [number, number];

export type LineType = "cut" | "mountain" | "valley" | "perforation" | "score";

export type PanelKind = "face" | "tab" | "flap";

export interface Panel {
  id: string;
  label?: string;
  kind: PanelKind;
  /** Poligon panel di ruang pola (mm). */
  points: Vec2[];
  /** Lubang potong di dalam panel (jendela, pintu, lubang jari). */
  holes?: Vec2[][];
  parent?: string;
  /** Segmen engsel pada tepi panel induk. */
  hinge?: [Vec2, Vec2];
  /** Sudut lipat target (derajat). Positif = lipat gunung, negatif = lipat lembah. */
  angle?: number;
  /** Tab lem: sudut dihitung otomatis dari tepi pasangannya. */
  autoAngle?: boolean;
  /** Pose akhir (Matrix4 column-major) untuk akar bagian terpisah saat terlipat 100%. */
  rootPose?: number[];
}

export interface DimAnnotation {
  a: Vec2;
  b: Vec2;
  /** Jarak garis ukur dari segmen (mm, tegak lurus, tanda menentukan sisi). */
  offset: number;
  param?: string;
}

export interface NetBase {
  panels: Panel[];
  dims?: DimAnnotation[];
  /** Bangun tertutup: setiap tepi potong wajib punya pasangan. */
  closed?: boolean;
  /** Lapisan ditumpuk (relief), bukan dilipat: tidak ada pasangan tepi. */
  stacked?: boolean;
}

export type SketchShape =
  | { kind: "line"; a: Vec2; b: Vec2 }
  | { kind: "polyline"; pts: Vec2[]; closed: boolean }
  | { kind: "rect"; x: number; y: number; w: number; h: number; r?: number }
  | { kind: "circle"; c: Vec2; r: number }
  | { kind: "arc"; c: Vec2; r: number; start: number; end: number }
  | { kind: "bezier"; pts: [Vec2, Vec2, Vec2, Vec2] }
  | { kind: "text"; at: Vec2; text: string; size: number };

export interface Sketch {
  id: string;
  lineType: LineType;
  shape: SketchShape;
  /** Penanda asal alat kardus agar mudah dikenali di panel properti. */
  tool?: "slot" | "finger" | "tear";
}

export interface Line {
  a: Vec2;
  b: Vec2;
  type: LineType;
  /** Tepi panel asal (untuk seleksi & penomoran pasangan). */
  panelId?: string;
  edge?: number;
  /** Garis lipat: id panel anak yang berengsel di sini. */
  hingeOf?: string;
  sketchId?: string;
}

export interface Mods {
  tabs: { panelId: string; edge: number; width: number }[];
  removed: string[];
  angles: Record<string, number>;
}

export const emptyMods = (): Mods => ({ tabs: [], removed: [], angles: {} });

export type IssueLevel = "error" | "warning" | "info";

export interface Issue {
  level: IssueLevel;
  code: string;
  message: string;
  panelIds?: string[];
  at?: Vec2;
}
