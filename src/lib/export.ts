import type { Bom } from "./bom";
import { seamLabelPos, type ResolvedNet } from "./geometry/resolve";
import { shapeToPolyline } from "./geometry/sketch";
import type { LineType, Vec2 } from "./geometry/types";
import { LINE_ORDER, LINE_STYLES } from "./line-styles";
import { loadImage, type DecalRender } from "./decals";
import { bbox } from "./geometry/polygon";

export type Paper = "A4" | "A3" | "F4" | "Letter";

export const PAPERS: Record<Paper, { w: number; h: number; label: string }> = {
  A4: { w: 210, h: 297, label: "A4 (210 × 297 mm)" },
  A3: { w: 297, h: 420, label: "A3 (297 × 420 mm)" },
  F4: { w: 215, h: 330, label: "F4 / Folio (215 × 330 mm)" },
  Letter: { w: 215.9, h: 279.4, label: "Letter (216 × 279 mm)" },
};

export const PAGE_MARGIN = 8;

interface Seg {
  a: Vec2;
  b: Vec2;
  type: LineType;
}

/** Semua segmen garis (panel + sketsa) dalam mm. */
export function allSegments(net: ResolvedNet): Seg[] {
  const out: Seg[] = net.lines.map((l) => ({ a: l.a, b: l.b, type: l.type }));
  for (const s of net.sketches) {
    const pl = shapeToPolyline(s.shape);
    if (!pl) continue;
    const n = pl.pts.length;
    for (let i = 0; i < (pl.closed ? n : n - 1); i++) out.push({ a: pl.pts[i], b: pl.pts[(i + 1) % n], type: s.lineType });
  }
  return out;
}

export interface Tiling {
  paper: Paper;
  landscape: boolean;
  pageW: number;
  pageH: number;
  cols: number;
  rows: number;
  origin: Vec2;
  printW: number;
  printH: number;
  step: Vec2;
}

export function computeTiling(net: ResolvedNet, paper: Paper, orientation: "auto" | "portrait" | "landscape", overlap: number): Tiling {
  const pad = 4;
  const W = net.bbox.maxX - net.bbox.minX + pad * 2;
  const H = net.bbox.maxY - net.bbox.minY + pad * 2;
  const make = (landscape: boolean): Tiling => {
    const p = PAPERS[paper];
    const pageW = landscape ? p.h : p.w;
    const pageH = landscape ? p.w : p.h;
    const printW = pageW - PAGE_MARGIN * 2;
    const printH = pageH - PAGE_MARGIN * 2 - 8; // ruang label bawah
    const single = W <= printW && H <= printH;
    const stepX = printW - overlap;
    const stepY = printH - overlap;
    const cols = single ? 1 : Math.max(1, Math.ceil((W - overlap) / stepX));
    const rows = single ? 1 : Math.max(1, Math.ceil((H - overlap) / stepY));
    // pusatkan pola di area total
    const totalW = single ? printW : cols * stepX + overlap;
    const totalH = single ? printH : rows * stepY + overlap;
    const origin: Vec2 = [net.bbox.minX - pad - (totalW - W) / 2, net.bbox.minY - pad - (totalH - H) / 2];
    return { paper, landscape, pageW, pageH, cols, rows, origin, printW, printH, step: [stepX, stepY] };
  };
  if (orientation === "portrait") return make(false);
  if (orientation === "landscape") return make(true);
  const a = make(false);
  const b = make(true);
  return b.cols * b.rows < a.cols * a.rows ? b : a;
}

export const tileName = (r: number, c: number) => `${String.fromCharCode(65 + r)}${c + 1}`;

/** Klip segmen ke persegi (Liang–Barsky). */
function clip(a: Vec2, b: Vec2, x0: number, y0: number, x1: number, y1: number): [Vec2, Vec2] | null {
  let t0 = 0,
    t1 = 1;
  const dx = b[0] - a[0],
    dy = b[1] - a[1];
  const p = [-dx, dx, -dy, dy];
  const q = [a[0] - x0, x1 - a[0], a[1] - y0, y1 - a[1]];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return null;
    } else {
      const r = q[i] / p[i];
      if (p[i] < 0) {
        if (r > t1) return null;
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return null;
        if (r < t1) t1 = r;
      }
    }
  }
  return [
    [a[0] + t0 * dx, a[1] + t0 * dy],
    [a[0] + t1 * dx, a[1] + t1 * dy],
  ];
}

const hex = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

export interface PdfOptions {
  paper: Paper;
  orientation: "auto" | "portrait" | "landscape";
  overlap: number;
  seams: boolean;
  watermark: boolean;
  title: string;
  bom: Bom;
  steps: string[];
  decals?: DecalRender[];
}

/** Rasterisasi logo per panel (dipotong mengikuti bentuk panel) untuk PDF. */
async function decalBitmaps(net: ResolvedNet, decals: DecalRender[], pxPerMm = 8) {
  const out: { x: number; y: number; w: number; h: number; src: string }[] = [];
  for (const d of decals) {
    const p = net.byId.get(d.panelId);
    if (!p) continue;
    const b = bbox(p.points);
    const W = b.maxX - b.minX;
    const H = b.maxY - b.minY;
    const k = Math.min(pxPerMm, 2400 / Math.max(W, H));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(W * k));
    c.height = Math.max(1, Math.round(H * k));
    const g = c.getContext("2d")!;
    g.scale(k, k);
    g.translate(-b.minX, -b.minY);
    g.beginPath();
    for (const poly of [p.points, ...(p.holes ?? [])]) {
      poly.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])));
      g.closePath();
    }
    g.clip("evenodd");
    const img = await loadImage(d.asset.src);
    g.translate(d.cx, d.cy);
    g.rotate((d.rot * Math.PI) / 180);
    g.drawImage(img, -d.w / 2, -d.h / 2, d.w, d.h);
    out.push({ x: b.minX, y: b.minY, w: W, h: H, src: c.toDataURL("image/png") });
  }
  return out;
}

export async function exportPdf(net: ResolvedNet, o: PdfOptions): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const t = computeTiling(net, o.paper, o.orientation, o.overlap);
  const doc = new jsPDF({ unit: "mm", format: [t.pageW, t.pageH], orientation: t.landscape ? "landscape" : "portrait" });
  const segs = allSegments(net);
  const bitmaps = o.decals?.length ? await decalBitmaps(net, o.decals) : [];

  const footer = (label: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(120);
    doc.text(label, PAGE_MARGIN, t.pageH - 4);
    if (o.watermark) doc.text("Dibuat dengan Lipatin · paket Gratis", t.pageW - PAGE_MARGIN, t.pageH - 4, { align: "right" });
  };

  /* ---------- halaman sampul: kalibrasi, cara cetak, peta halaman, bahan ---------- */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(28, 25, 23);
  doc.text(o.title, PAGE_MARGIN, PAGE_MARGIN + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(87, 83, 78);
  doc.text(["Cetak dengan skala 100% / \"Ukuran sebenarnya\" (Actual size). Jangan pilih \"Fit to page\".", "Ukur kotak kalibrasi: sisinya harus tepat 10 cm. Jika tidak, periksa pengaturan printer."], PAGE_MARGIN, PAGE_MARGIN + 13);

  // kotak kalibrasi 10 cm
  const cx = PAGE_MARGIN;
  const cy = PAGE_MARGIN + 24;
  doc.setDrawColor(28, 25, 23);
  doc.setLineWidth(0.35);
  doc.setLineDashPattern([], 0);
  doc.rect(cx, cy, 100, 100);
  for (let i = 1; i < 10; i++) {
    doc.setLineWidth(0.15);
    doc.line(cx + i * 10, cy, cx + i * 10, cy + 3);
    doc.line(cx, cy + i * 10, cx + 3, cy + i * 10);
  }
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("10 cm × 10 cm", cx + 50, cy + 50, { align: "center", baseline: "middle" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Kotak kalibrasi", cx + 50, cy + 56, { align: "center", baseline: "middle" });

  // legenda garis
  let ly = cy + 110;
  doc.setFontSize(9);
  doc.setTextColor(28, 25, 23);
  for (const k of LINE_ORDER) {
    const st = LINE_STYLES[k];
    doc.setDrawColor(...hex(st.print));
    doc.setLineWidth(0.5);
    doc.setLineDashPattern(st.dash ?? [], 0);
    doc.line(cx, ly, cx + 18, ly);
    doc.setLineDashPattern([], 0);
    doc.text(`${st.label} (${st.hint.toLowerCase()})`, cx + 22, ly + 1);
    ly += 6;
  }

  // kolom kanan: peta halaman + bahan
  const rx = cx + 110;
  const rw = t.pageW - rx - PAGE_MARGIN;
  if (rw > 50) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`Peta halaman (${t.cols * t.rows} lembar ${o.paper})`, rx, cy + 3);
    const mapW = rw;
    const scale = Math.min(mapW / (t.cols * t.step[0] + o.overlap), 70 / (t.rows * t.step[1] + o.overlap));
    doc.setLineWidth(0.2);
    doc.setDrawColor(120);
    for (let r = 0; r < t.rows; r++)
      for (let c = 0; c < t.cols; c++) {
        const x = rx + c * t.step[0] * scale;
        const y = cy + 6 + r * t.step[1] * scale;
        doc.rect(x, y, t.printW * scale, t.printH * scale);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.text(tileName(r, c), x + 1.5, y + 3.5);
      }
    doc.setDrawColor(28, 25, 23);
    doc.setLineWidth(0.15);
    for (const s of segs) {
      if (s.type !== "cut") continue;
      const a = [rx + (s.a[0] - t.origin[0]) * scale, cy + 6 + (s.a[1] - t.origin[1]) * scale];
      const b = [rx + (s.b[0] - t.origin[0]) * scale, cy + 6 + (s.b[1] - t.origin[1]) * scale];
      doc.line(a[0], a[1], b[0], b[1]);
    }
    let by = cy + 6 + t.rows * t.step[1] * scale + 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Daftar bahan", rx, by);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    const items = [
      `Pola datar: ${Math.round(o.bom.net.w)} × ${Math.round(o.bom.net.h)} mm`,
      `Kardus minimum: ${Math.round(o.bom.minSheet.w)} × ${Math.round(o.bom.minSheet.h)} mm`,
      o.bom.material,
      o.bom.glue,
      ...o.bom.tools,
    ];
    by += 5;
    for (const it of items) {
      const lines = doc.splitTextToSize(`• ${it}`, rw);
      doc.text(lines, rx, by);
      by += lines.length * 4;
    }
    by += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Langkah singkat", rx, by);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    by += 5;
    o.steps.forEach((s, i) => {
      const lines = doc.splitTextToSize(`${i + 1}. ${s}`, rw);
      if (by + lines.length * 4 > t.pageH - 12) return;
      doc.text(lines, rx, by);
      by += lines.length * 4;
    });
  }
  footer("Halaman sampul · ukur kotak kalibrasi sebelum memotong");

  /* ---------- halaman pola ---------- */
  for (let r = 0; r < t.rows; r++) {
    for (let c = 0; c < t.cols; c++) {
      doc.addPage([t.pageW, t.pageH], t.landscape ? "landscape" : "portrait");
      const x0 = t.origin[0] + c * t.step[0];
      const y0 = t.origin[1] + r * t.step[1];
      const x1 = x0 + t.printW;
      const y1 = y0 + t.printH;
      const tx = (p: Vec2): Vec2 => [PAGE_MARGIN + p[0] - x0, PAGE_MARGIN + p[1] - y0];

      for (const bm of bitmaps) {
        if (bm.x > x1 || bm.y > y1 || bm.x + bm.w < x0 || bm.y + bm.h < y0) continue;
        const q = tx([bm.x, bm.y]);
        doc.addImage(bm.src, "PNG", q[0], q[1], bm.w, bm.h);
      }

      for (const k of [...LINE_ORDER].reverse()) {
        const st = LINE_STYLES[k];
        doc.setDrawColor(...hex(st.print));
        doc.setLineWidth(k === "cut" ? 0.35 : 0.3);
        doc.setLineDashPattern(st.dash ?? [], 0);
        for (const s of segs) {
          if (s.type !== k) continue;
          const cl = clip(s.a, s.b, x0, y0, x1, y1);
          if (!cl) continue;
          const a = tx(cl[0]);
          const b = tx(cl[1]);
          doc.line(a[0], a[1], b[0], b[1]);
        }
      }
      doc.setLineDashPattern([], 0);

      if (o.seams) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(68, 64, 60);
        for (const s of net.seams) {
          for (const side of s.sides) {
            const p = seamLabelPos(net, side.panelId, side.a, side.b, 4);
            if (p[0] < x0 || p[0] > x1 || p[1] < y0 || p[1] > y1) continue;
            const q = tx(p);
            doc.text(String(s.n), q[0], q[1], { align: "center", baseline: "middle" });
          }
        }
      }

      // tanda sambung antarhalaman
      doc.setDrawColor(150);
      doc.setLineWidth(0.2);
      doc.setLineDashPattern([1, 1], 0);
      if (t.cols > 1 || t.rows > 1) {
        if (c < t.cols - 1) doc.line(PAGE_MARGIN + t.printW - o.overlap, PAGE_MARGIN, PAGE_MARGIN + t.printW - o.overlap, PAGE_MARGIN + t.printH);
        if (r < t.rows - 1) doc.line(PAGE_MARGIN, PAGE_MARGIN + t.printH - o.overlap, PAGE_MARGIN + t.printW, PAGE_MARGIN + t.printH - o.overlap);
      }
      doc.setLineDashPattern([], 0);
      doc.setDrawColor(28, 25, 23);
      const cross = (x: number, y: number) => {
        doc.line(x - 3, y, x + 3, y);
        doc.line(x, y - 3, x, y + 3);
      };
      cross(PAGE_MARGIN, PAGE_MARGIN);
      cross(PAGE_MARGIN + t.printW, PAGE_MARGIN);
      cross(PAGE_MARGIN, PAGE_MARGIN + t.printH);
      cross(PAGE_MARGIN + t.printW, PAGE_MARGIN + t.printH);

      // penggaris 5 cm di tepi bawah
      const ry = t.pageH - 10;
      doc.setLineWidth(0.25);
      doc.line(PAGE_MARGIN, ry, PAGE_MARGIN + 50, ry);
      for (let i = 0; i <= 5; i++) doc.line(PAGE_MARGIN + i * 10, ry - (i % 5 === 0 ? 2 : 1), PAGE_MARGIN + i * 10, ry);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(120);
      doc.text("5 cm", PAGE_MARGIN + 52, ry + 0.8);

      const neighbors = [c < t.cols - 1 ? `kanan: ${tileName(r, c + 1)}` : "", r < t.rows - 1 ? `bawah: ${tileName(r + 1, c)}` : ""].filter(Boolean).join(", ");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(28, 25, 23);
      doc.text(tileName(r, c), t.pageW - PAGE_MARGIN, PAGE_MARGIN - 2.5, { align: "right" });
      footer(`${o.title} · halaman ${tileName(r, c)}${neighbors ? ` · sambung ${neighbors} (tumpang ${o.overlap} mm)` : ""}`);
    }
  }
  return doc.output("blob");
}

export function exportSvg(net: ResolvedNet, opts: { seams: boolean; watermark?: boolean; background?: boolean; decals?: DecalRender[] }): string {
  const pad = 5;
  const minX = net.bbox.minX - pad;
  const minY = net.bbox.minY - pad;
  const W = net.bbox.maxX - net.bbox.minX + pad * 2;
  const H = net.bbox.maxY - net.bbox.minY + pad * 2 + (opts.watermark ? 6 : 0);
  const f = (n: number) => (Math.round(n * 1000) / 1000).toString();
  const segs = allSegments(net);
  const layers = LINE_ORDER.map((k) => {
    const st = LINE_STYLES[k];
    const d = segs
      .filter((s) => s.type === k)
      .map((s) => `M${f(s.a[0] - minX)} ${f(s.a[1] - minY)}L${f(s.b[0] - minX)} ${f(s.b[1] - minY)}`)
      .join("");
    if (!d) return "";
    return `  <g inkscape:groupmode="layer" id="${k}" inkscape:label="${st.label}">\n    <path d="${d}" fill="none" stroke="${st.print}" stroke-width="${k === "cut" ? 0.35 : 0.3}"${st.dash ? ` stroke-dasharray="${st.dash.join(" ")}"` : ""} stroke-linecap="${k === "perforation" ? "round" : "butt"}"/>\n  </g>`;
  })
    .filter(Boolean)
    .join("\n");
  const seams = opts.seams
    ? `  <g inkscape:groupmode="layer" id="nomor" inkscape:label="Nomor pasangan" font-family="Helvetica, Arial, sans-serif" font-size="3" font-weight="700" fill="#44403c" text-anchor="middle" dominant-baseline="central">\n${net.seams
        .flatMap((s) =>
          s.sides.map((side) => {
            const p = seamLabelPos(net, side.panelId, side.a, side.b, 4);
            return `    <text x="${f(p[0] - minX)}" y="${f(p[1] - minY)}">${s.n}</text>`;
          }),
        )
        .join("\n")}\n  </g>`
    : "";
  const wm = opts.watermark ? `  <text x="${f(W - 2)}" y="${f(H - 2)}" font-family="Helvetica, Arial, sans-serif" font-size="3" fill="#a8a29e" text-anchor="end">Dibuat dengan Lipatin · paket Gratis</text>` : "";
  const bg = opts.background ? `  <rect width="100%" height="100%" fill="#ffffff"/>\n` : "";
  const decalEls = (opts.decals ?? [])
    .map((d, i) => {
      const p = net.byId.get(d.panelId);
      if (!p) return "";
      const path = [p.points, ...(p.holes ?? [])].map((poly) => "M" + poly.map((q) => `${f(q[0] - minX)} ${f(q[1] - minY)}`).join("L") + "Z").join("");
      const cx = d.cx - minX;
      const cy = d.cy - minY;
      return `    <clipPath id="dc${i}"><path d="${path}" clip-rule="evenodd"/></clipPath>\n    <image clip-path="url(#dc${i})" href="${d.asset.src}" x="${f(cx - d.w / 2)}" y="${f(cy - d.h / 2)}" width="${f(d.w)}" height="${f(d.h)}" preserveAspectRatio="none" transform="rotate(${f(d.rot)} ${f(cx)} ${f(cy)})"/>`;
    })
    .filter(Boolean)
    .join("\n");
  const decalLayer = decalEls ? `  <g inkscape:groupmode="layer" id="desain" inkscape:label="Desain cetak">\n${decalEls}\n  </g>\n` : "";
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="${f(W)}mm" height="${f(H)}mm" viewBox="0 0 ${f(W)} ${f(H)}">
${bg}${decalLayer}${layers}
${seams}
${wm}
</svg>`;
}

export async function exportPng(net: ResolvedNet, dpi: number, seams: boolean, watermark: boolean, decals?: DecalRender[]): Promise<Blob> {
  const svg = exportSvg(net, { seams, watermark, background: true, decals });
  const W = net.bbox.maxX - net.bbox.minX + 10;
  const H = net.bbox.maxY - net.bbox.minY + 10 + (watermark ? 6 : 0);
  let k = dpi / 25.4;
  const maxPx = 12000;
  if (Math.max(W, H) * k > maxPx) k = maxPx / Math.max(W, H);
  const img = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error("Gagal merender PNG"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(W * k);
    canvas.height = Math.round(H * k);
    const g = canvas.getContext("2d")!;
    g.fillStyle = "#fff";
    g.fillRect(0, 0, canvas.width, canvas.height);
    g.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("Gagal membuat PNG"))), "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const fileSlug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "lipatin";
