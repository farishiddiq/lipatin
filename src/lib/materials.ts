export type MaterialType = "single" | "double" | "duplex" | "board";

export interface MaterialSettings {
  type: MaterialType;
  thickness: number;
  flute: "horizontal" | "vertical";
  color: "kraft" | "white";
  /** Ukuran lembar kardus yang dimiliki pengguna (mm). */
  sheet: { w: number; h: number };
}

export const MATERIALS: { type: MaterialType; label: string; short: string; thickness: number; flute?: string; pitch: number }[] = [
  { type: "single", label: "Kardus single wall", short: "Single wall", thickness: 3, flute: "B-flute", pitch: 6.5 },
  { type: "double", label: "Kardus double wall", short: "Double wall", thickness: 6.5, flute: "BC-flute", pitch: 8 },
  { type: "duplex", label: "Karton dupleks", short: "Dupleks", thickness: 0.6, pitch: 0 },
  { type: "board", label: "Karton tebal (greyboard)", short: "Karton tebal", thickness: 2, pitch: 0 },
];

export const materialInfo = (t: MaterialType) => MATERIALS.find((m) => m.type === t)!;

export const defaultMaterial = (): MaterialSettings => ({
  type: "single",
  thickness: 3,
  flute: "vertical",
  color: "kraft",
  sheet: { w: 600, h: 400 },
});
