"use client";

import { motion, useTransform, type MotionValue } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Face = "alas" | "depan" | "belakang" | "kiri" | "kanan" | "tutup";

export const FACES: { id: Face; label: string }[] = [
  { id: "depan", label: "Depan" },
  { id: "kanan", label: "Kanan" },
  { id: "belakang", label: "Belakang" },
  { id: "kiri", label: "Kiri" },
  { id: "tutup", label: "Tutup" },
  { id: "alas", label: "Alas" },
];

export interface FaceLogo {
  src: string;
  scale: number;
  rotation: number;
}

const OUT: Record<Face, string> = {
  alas: "#9c6e3e",
  depan: "#c69460",
  kanan: "#a97a47",
  belakang: "#b98955",
  kiri: "#b48350",
  tutup: "#d4a674",
};

interface Props {
  size: number;
  /** 0 = pola datar, 1 = dinding berdiri. */
  fold: MotionValue<number>;
  /** 0 = tutup terbuka, 1 = tertutup. */
  lid: MotionValue<number>;
  rotateX?: MotionValue<number> | number;
  rotateY?: MotionValue<number> | number;
  logos?: Partial<Record<Face, FaceLogo>>;
  selected?: Face[];
  onFace?: (f: Face) => void;
  className?: string;
  /** Putar terus (animasi CSS pada scene 3D, dijeda saat di luar layar). */
  spin?: boolean;
}

/**
 * Kotak kardus CSS 3D yang tersusun seperti jaring-jaring sungguhan:
 * alas sebagai akar, dinding berengsel di tepinya, tutup berengsel di dinding belakang.
 */
export function CardboardBox({ size: S, fold, lid, rotateX = -26, rotateY = -34, logos, selected, onFace, className, spin }: Props) {
  const a90 = useTransform(fold, (v) => v * 90);
  const n90 = useTransform(fold, (v) => -v * 90);
  const lidR = useTransform(lid, (v) => -v * 92);

  const face = (f: Face, extra?: ReactNode) => (
    <>
      <div className="absolute inset-0 [backface-visibility:hidden]" style={{ background: "#e4c6a1" }}>
        <div className="absolute inset-[6%] rounded-[2px] border border-dashed border-[#b0855880]" />
        {extra}
      </div>
      <div
        className={cn("absolute inset-0 overflow-hidden [backface-visibility:hidden]", onFace && "cursor-pointer")}
        style={{ background: OUT[f], transform: "rotateY(180deg) translateZ(0.5px)" }}
        onClick={onFace ? () => onFace(f) : undefined}
        data-cursor={onFace ? "grow" : undefined}
      >
        {logos?.[f] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logos[f]!.src}
            alt=""
            draggable={false}
            className="absolute top-1/2 left-1/2 max-h-[70%] max-w-[70%] object-contain"
            style={{ transform: `translate(-50%,-50%) rotate(${logos[f]!.rotation}deg) scale(${logos[f]!.scale})` }}
          />
        )}
        {selected?.includes(f) && <div className="absolute inset-[4%] rounded-sm ring-2 ring-[#ea2e00]" />}
      </div>
    </>
  );

  const wall = "absolute [transform-style:preserve-3d]";

  return (
    <div className={cn("relative [perspective:1400px]", className)} style={{ width: S * 1.6, height: S * 1.6 }}>
      <motion.div
        className={cn("absolute top-1/2 left-1/2 [transform-style:preserve-3d]", spin && "motion-safe:animate-[spin-y_9s_linear_infinite]")}
        style={{ width: S, height: S, marginLeft: -S / 2, marginTop: -S / 2, rotateX, rotateY }}
      >
        {/* alas */}
        <div className="absolute inset-0 [transform-style:preserve-3d]" style={{ transform: `translateY(${S / 2}px) rotateX(90deg)` }}>
          {face("alas")}
          {/* depan: di tepi bawah alas */}
          <motion.div className={wall} style={{ top: "100%", left: 0, width: S, height: S, transformOrigin: "top center", rotateX: a90 }}>
            {face("depan")}
          </motion.div>
          {/* belakang + tutup */}
          <motion.div className={wall} style={{ bottom: "100%", left: 0, width: S, height: S, transformOrigin: "bottom center", rotateX: n90 }}>
            {face("belakang")}
            <motion.div className={wall} style={{ bottom: "100%", left: 0, width: S, height: S, transformOrigin: "bottom center", rotateX: lidR }}>
              {face("tutup")}
            </motion.div>
          </motion.div>
          <motion.div className={wall} style={{ right: "100%", top: 0, width: S, height: S, transformOrigin: "right center", rotateY: a90 }}>
            {face("kiri")}
          </motion.div>
          <motion.div className={wall} style={{ left: "100%", top: 0, width: S, height: S, transformOrigin: "left center", rotateY: n90 }}>
            {face("kanan")}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
