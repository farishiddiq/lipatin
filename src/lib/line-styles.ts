import type { LineType } from "./geometry/types";

export const LINE_STYLES: Record<LineType, { label: string; short: string; cssVar: string; print: string; dash: number[] | null; hint: string }> = {
  cut: { label: "Garis potong", short: "Potong", cssVar: "var(--line-cut)", print: "#1c1917", dash: null, hint: "Hitam utuh" },
  mountain: { label: "Lipat gunung", short: "Gunung", cssVar: "var(--line-mountain)", print: "#dc2626", dash: [6, 3], hint: "Merah putus-putus" },
  valley: { label: "Lipat lembah", short: "Lembah", cssVar: "var(--line-valley)", print: "#2563eb", dash: [6, 2.5, 1.5, 2.5], hint: "Biru putus-titik" },
  perforation: { label: "Perforasi", short: "Perforasi", cssVar: "var(--line-perforation)", print: "#047857", dash: [1, 2], hint: "Hijau titik-titik" },
  score: { label: "Score / gores", short: "Score", cssVar: "var(--line-score)", print: "#78716c", dash: [10, 3], hint: "Abu putus panjang" },
};

export const LINE_ORDER: LineType[] = ["cut", "mountain", "valley", "perforation", "score"];
