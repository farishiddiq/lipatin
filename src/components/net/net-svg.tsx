import { interiorPoint } from "@/lib/geometry/polygon";
import { seamLabelPos, type ResolvedNet } from "@/lib/geometry/resolve";
import { pointsToPath, shapeToPath } from "@/lib/geometry/sketch";
import { LINE_STYLES } from "@/lib/line-styles";
import { cn } from "@/lib/utils";
import type { DecalRender } from "@/lib/decals";
import { DecalLayer } from "./decal-layer";

interface Props {
  net: ResolvedNet;
  className?: string;
  /** Lebar garis dalam mm. */
  stroke?: number;
  seams?: boolean;
  labels?: boolean;
  pad?: number;
  title?: string;
  selectedId?: string | null;
  decals?: DecalRender[];
}

export { seamLabelPos };

// bulatkan agar render server & browser identik (hindari hydration mismatch presisi float)
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Gambar statis pola 2D (thumbnail, pratinjau ekspor, hasil unfold). */
export function NetSvg({ net, className, stroke, seams = false, labels = false, pad = 6, title, selectedId, decals }: Props) {
  const { minX, minY, maxX, maxY } = net.bbox;
  const w = maxX - minX + pad * 2;
  const h = maxY - minY + pad * 2;
  const sw = r2(stroke ?? Math.max(0.5, Math.max(w, h) / 320));
  const dashK = sw / 0.6;
  return (
    <svg viewBox={`${r2(minX - pad)} ${r2(minY - pad)} ${r2(w)} ${r2(h)}`} className={cn("block", className)} role="img" aria-label={title ?? "Pola potong 2D"}>
      {title && <title>{title}</title>}
      {net.panels.map((p) => (
        <path
          key={p.id}
          d={pointsToPath(p.points, true) + (p.holes ?? []).map((hole) => pointsToPath(hole, true)).join("")}
          fillRule="evenodd"
          fill={p.id === selectedId ? "var(--panel-fill-selected)" : p.kind === "tab" ? "var(--panel-fill-tab)" : "var(--panel-fill)"}
        />
      ))}
      {decals && <DecalLayer net={net} decals={decals} />}
      {net.lines.map((l, i) => {
        const st = LINE_STYLES[l.type];
        return (
          <line
            key={i}
            x1={r2(l.a[0])}
            y1={r2(l.a[1])}
            x2={r2(l.b[0])}
            y2={r2(l.b[1])}
            stroke={st.cssVar}
            strokeWidth={sw}
            strokeDasharray={st.dash?.map((d) => r2(d * dashK)).join(" ")}
            strokeLinecap={l.type === "perforation" ? "round" : "butt"}
          />
        );
      })}
      {net.sketches.map((s) =>
        s.shape.kind === "text" ? (
          <text key={s.id} x={s.shape.at[0]} y={s.shape.at[1]} fontSize={s.shape.size} fill="var(--line-cut)">
            {s.shape.text}
          </text>
        ) : (
          <path
            key={s.id}
            d={shapeToPath(s.shape)}
            fill="none"
            stroke={LINE_STYLES[s.lineType].cssVar}
            strokeWidth={sw}
            strokeDasharray={LINE_STYLES[s.lineType].dash?.map((d) => r2(d * dashK)).join(" ")}
          />
        ),
      )}
      {seams &&
        net.seams.flatMap((s) =>
          s.sides.map((side, k) => {
            const [x, y] = seamLabelPos(net, side.panelId, side.a, side.b, Math.max(3.5, sw * 6));
            return (
              <text key={`${s.n}-${k}`} x={r2(x)} y={r2(y)} fontSize={r2(Math.max(4, sw * 9))} textAnchor="middle" dominantBaseline="central" className="fill-stone-700 font-bold tabular-nums">
                {s.n}
              </text>
            );
          }),
        )}
      {labels &&
        net.panels
          .filter((p) => p.kind === "face")
          .map((p) => {
            const [x, y] = interiorPoint(p.points, p.holes);
            return (
              <text key={p.id} x={r2(x)} y={r2(y)} fontSize={r2(Math.max(4, sw * 8))} textAnchor="middle" dominantBaseline="central" className="fill-stone-500">
                {p.label}
              </text>
            );
          })}
    </svg>
  );
}
