import { useId } from "react";
import type { ResolvedNet } from "@/lib/geometry/resolve";
import { pointsToPath } from "@/lib/geometry/sketch";
import type { DecalRender } from "@/lib/decals";

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Gambar logo pada panel, dipotong (clip) mengikuti bentuk panel. */
export function DecalLayer({ net, decals }: { net: ResolvedNet; decals: DecalRender[] }) {
  const uid = useId().replace(/:/g, "");
  if (!decals.length) return null;
  return (
    <g aria-hidden>
      <defs>
        {decals.map((d, i) => {
          const p = net.byId.get(d.panelId);
          if (!p) return null;
          return (
            <clipPath key={i} id={`${uid}-c${i}`}>
              <path d={pointsToPath(p.points, true) + (p.holes ?? []).map((h) => pointsToPath(h, true)).join("")} clipRule="evenodd" />
            </clipPath>
          );
        })}
      </defs>
      {decals.map((d, i) => (
        <g key={i} clipPath={`url(#${uid}-c${i})`}>
          {d.matrix ? (
            <image href={d.asset.src} x={0} y={0} width={d.asset.w} height={d.asset.h} preserveAspectRatio="none" transform={`matrix(${d.matrix.map((v) => Math.round(v * 1e5) / 1e5).join(" ")})`} />
          ) : (
          <image
            href={d.asset.src}
            x={r2(d.cx - d.w / 2)}
            y={r2(d.cy - d.h / 2)}
            width={r2(d.w)}
            height={r2(d.h)}
            preserveAspectRatio="none"
            transform={`rotate(${r2(d.rot)} ${r2(d.cx)} ${r2(d.cy)})`}
          />
          )}
        </g>
      ))}
    </g>
  );
}
