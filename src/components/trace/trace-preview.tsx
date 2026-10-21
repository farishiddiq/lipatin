"use client";

import { motion, useReducedMotion } from "motion/react";
import { pointsToPath } from "@/lib/geometry/sketch";
import type { Analysis } from "@/lib/trace";

/** Potongan foto hasil segmentasi + kontur poligon & lubang yang "tergambar sendiri". */
export function TracePreview({ result, label, showPhoto = true }: { result: Analysis; label: string; showPhoto?: boolean }) {
  const reduced = useReducedMotion();
  const { w, h, cutout, region } = result;
  const key = region.outer.length + ":" + region.outer[0]?.join();
  const draw = (delay = 0) => ({
    initial: reduced ? false : ({ pathLength: 0, opacity: 0 } as const),
    animate: { pathLength: 1, opacity: 1 },
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const, delay },
  });
  return (
    <svg viewBox={`-4 -4 ${w + 8} ${h + 8}`} className="size-full" role="img" aria-label={label}>
      <defs>
        <pattern id="chk" width="12" height="12" patternUnits="userSpaceOnUse">
          <rect width="12" height="12" fill="#faf6ef" />
          <rect width="6" height="6" fill="#efe6d6" />
          <rect x="6" y="6" width="6" height="6" fill="#efe6d6" />
        </pattern>
      </defs>
      <rect x={-4} y={-4} width={w + 8} height={h + 8} fill="url(#chk)" />
      {showPhoto && (
        <image href={cutout.src} x={cutout.x0} y={cutout.y0} width={cutout.w / cutout.k} height={cutout.h / cutout.k} preserveAspectRatio="none" />
      )}
      <motion.path key={key} d={pointsToPath(region.outer, true)} fill="none" stroke="var(--color-orange-500)" strokeWidth={2} strokeLinejoin="round" {...draw()} />
      {region.holes.map((hp, i) => (
        <motion.path key={`${key}-h${i}`} d={pointsToPath(hp, true)} fill="none" stroke="var(--color-orange-500)" strokeWidth={2} strokeDasharray="5 3" {...draw(0.3)} />
      ))}
      {region.outer.map((p, i) => (
        <motion.circle
          key={`${key}-${i}`}
          cx={p[0]}
          cy={p[1]}
          r={2.6}
          fill="#fff"
          stroke="var(--color-orange-500)"
          strokeWidth={1.4}
          initial={reduced ? false : { scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: reduced ? 0 : 0.35 + i * 0.015, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        />
      ))}
    </svg>
  );
}
