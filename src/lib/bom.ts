import { foldMatrices } from "./geometry/fold";
import { area, bbox } from "./geometry/polygon";
import { foldedBounds, type ResolvedNet } from "./geometry/resolve";
import { materialInfo, type MaterialSettings } from "./materials";

export interface Bom {
  net: { w: number; h: number };
  folded: { w: number; h: number; d: number };
  minSheet: { w: number; h: number };
  pieces: number;
  sheets: number;
  fitsSheet: boolean;
  tabs: number;
  seams: number;
  areaCm2: number;
  material: string;
  glue: string;
  tools: string[];
}

const MARGIN = 10;

function islands(net: ResolvedNet) {
  const rootOf = new Map<string, string>();
  for (const id of net.order) {
    const p = net.byId.get(id)!;
    rootOf.set(id, p.parent ? rootOf.get(p.parent)! : id);
  }
  const groups = new Map<string, string[]>();
  for (const [id, r] of rootOf) (groups.get(r) ?? groups.set(r, []).get(r)!).push(id);
  return [...groups.values()].map((ids) => bbox(ids.flatMap((i) => net.byId.get(i)!.points)));
}

/** Hitung kasar jumlah lembar dengan penataan rak (shelf packing). */
function sheetsNeeded(boxes: { w: number; h: number }[], W: number, H: number) {
  const items = boxes.map((b) => (b.w > b.h ? { w: b.w, h: b.h } : { w: b.h, h: b.w })).sort((a, b) => b.h - a.h);
  let sheets = 0;
  let x = 0,
    y = 0,
    rowH = 0;
  let open = false;
  for (const it of items) {
    let { w, h } = it;
    if (w > W || h > H) {
      if (h <= W && w <= H) [w, h] = [h, w];
      else return Infinity;
    }
    if (!open) {
      sheets++;
      open = true;
      x = y = rowH = 0;
    }
    if (x + w > W) {
      x = 0;
      y += rowH + MARGIN;
      rowH = 0;
    }
    if (y + h > H) {
      sheets++;
      x = y = rowH = 0;
    }
    x += w + MARGIN;
    rowH = Math.max(rowH, h);
  }
  return sheets;
}

export function billOfMaterials(net: ResolvedNet, m: MaterialSettings): Bom {
  const b = net.bbox;
  const w = b.maxX - b.minX;
  const h = b.maxY - b.minY;
  const fb = foldedBounds(net, foldMatrices(net, 1));
  const parts = islands(net).map((x) => ({ w: x.maxX - x.minX + MARGIN, h: x.maxY - x.minY + MARGIN }));
  const sheetW = Math.max(m.sheet.w, m.sheet.h);
  const sheetH = Math.min(m.sheet.w, m.sheet.h);
  const sheets = sheetsNeeded(parts, sheetW, sheetH);
  const tabs = net.panels.filter((p) => p.kind === "tab").length;
  const holes = net.panels.some((p) => p.holes?.length);
  const perf = net.sketches.some((s) => s.lineType === "perforation") || net.lines.some((l) => l.type === "perforation");
  const valley = net.lines.some((l) => l.type === "valley");
  const areaMm = net.panels.reduce((s, p) => s + area(p.points) - (p.holes ?? []).reduce((a, hh) => a + area(hh), 0), 0);
  const info = materialInfo(m.type);
  const tools = ["Cutter tajam dan alas potong", "Penggaris besi", "Alat score: pulpen habis tinta atau tulang lipat"];
  if (holes) tools.push("Cutter kecil untuk lubang dan jendela");
  if (perf) tools.push("Roda perforasi (opsional, bisa diganti tusukan jarum)");
  if (valley) tools.push("Score lipat lembah dari sisi belakang kardus");
  return {
    net: { w, h },
    folded: { w: fb.max.x - fb.min.x, h: fb.max.y - fb.min.y, d: fb.max.z - fb.min.z },
    minSheet: { w: w + MARGIN * 2, h: h + MARGIN * 2 },
    pieces: parts.length,
    sheets: Number.isFinite(sheets) ? sheets : 0,
    fitsSheet: Number.isFinite(sheets),
    tabs,
    seams: net.seams.length,
    areaCm2: areaMm / 100,
    material: `${info.label}, ${m.thickness.toLocaleString("id-ID")} mm${m.color === "white" ? " (putih)" : ""}`,
    glue: tabs > 0 ? `Lem putih/PVA atau lem tembak untuk ${tabs} tab` : net.seams.length ? "Selotip kertas untuk sambungan" : "Tidak perlu lem",
    tools,
  };
}
