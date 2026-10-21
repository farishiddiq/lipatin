export type Unit = "mm" | "cm" | "in";

export const UNITS: { value: Unit; label: string }[] = [
  { value: "mm", label: "mm" },
  { value: "cm", label: "cm" },
  { value: "in", label: "inci" },
];

const factor: Record<Unit, number> = { mm: 1, cm: 10, in: 25.4 };
const digits: Record<Unit, number> = { mm: 0, cm: 1, in: 2 };

export const toUnit = (mm: number, u: Unit) => mm / factor[u];
export const fromUnit = (v: number, u: Unit) => v * factor[u];

export function fmt(mm: number, u: Unit, withUnit = true) {
  const v = toUnit(mm, u);
  const s = v.toLocaleString("id-ID", { maximumFractionDigits: digits[u], minimumFractionDigits: 0 });
  return withUnit ? `${s} ${u === "in" ? "in" : u}` : s;
}

export const unitStep = (u: Unit) => (u === "mm" ? 1 : u === "cm" ? 0.1 : 0.05);
