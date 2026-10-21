"use client";

import { useMotionValue } from "motion/react";
import { CardboardBox } from "./cardboard-box";
import { LOGO_SAMPLE } from "./logo-sample";

/* Animasi mini untuk kartu fitur: CSS keyframes (transform/opacity), dijeda saat di luar layar. */

export function MiniCube({ logo }: { logo?: boolean }) {
  const fold = useMotionValue(1);
  const lid = useMotionValue(1);
  return (
    <div className="motion-safe:animate-[float-y_4s_var(--ease-oil)_infinite]">
      <div>
        <CardboardBox
          spin
          size={logo ? 96 : 64}
          fold={fold}
          lid={lid}
          rotateX={0}
          rotateY={0}
          logos={logo ? { depan: { src: LOGO_SAMPLE, scale: 1, rotation: 0 }, kanan: { src: LOGO_SAMPLE, scale: 1, rotation: 0 }, kiri: { src: LOGO_SAMPLE, scale: 1, rotation: 0 }, belakang: { src: LOGO_SAMPLE, scale: 1, rotation: 0 } } : undefined}
        />
      </div>
    </div>
  );
}

export function MiniGallery() {
  const shapes = [
    <rect key="a" x="6" y="6" width="28" height="28" rx="4" />,
    <path key="b" d="M20 4l16 30H4z" />,
    <circle key="c" cx="20" cy="20" r="15" />,
    <path key="d" d="M6 34V16L20 6l14 10v18z" />,
    <path key="e" d="M20 4l14 8v16l-14 8-14-8V12z" />,
    <path key="f" d="M4 30l8-14h16l8 14z" />,
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {shapes.map((s, i) => (
        <svg key={i} viewBox="0 0 40 40" className="size-10 fill-sage-300 motion-safe:animate-[float-y_3s_var(--ease-oil)_infinite]" style={{ animationDelay: `${i * 0.18}s` }} aria-hidden>
          {s}
        </svg>
      ))}
    </div>
  );
}

export function MiniEditor() {
  return (
    <svg viewBox="0 0 160 100" className="h-24 w-auto" aria-hidden>
      <path d="M60 4h40v28h28v36h-28v28H60V68H32V32h28z" fill="#fbf7f0" stroke="#1f1a17" strokeWidth="1.6" />
      <path d="M60 32h40M60 68h40M60 32v36M100 32v36" stroke="#d42900" strokeWidth="1.6" strokeDasharray="5 3" />
      <path d="M32 50h28" stroke="#2457c5" strokeWidth="1.6" strokeDasharray="5 2 1.5 2" />
      <circle r="4" fill="#ea2e00" className="motion-safe:animate-[float-y_2.4s_var(--ease-oil)_infinite]" cx="100" cy="32" />
    </svg>
  );
}

export function MiniUnfold() {
  const faces = [
    { x: 40, y: 0 },
    { x: 0, y: 40 },
    { x: 40, y: 40 },
    { x: 80, y: 40 },
    { x: 40, y: 80 },
    { x: 120, y: 40 },
  ];
  return (
    <div className="relative h-24 w-40" aria-hidden>
      {faces.map((f, i) => (
        <div
          key={i}
          className="absolute size-9 rounded-[4px] border border-dashed border-orange-600/60 bg-[#d4a674] motion-safe:animate-[unfold_3.6s_var(--ease-oil)_infinite]"
          style={{ left: f.x * 0.75 + 8, top: f.y * 0.75, ["--tx" as string]: `${40 * 0.75 + 8 - (f.x * 0.75 + 8)}px`, ["--ty" as string]: `${40 * 0.75 - f.y * 0.75}px` }}
        />
      ))}
    </div>
  );
}

export function MiniExport() {
  return (
    <div className="relative h-24 w-32" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute top-2 left-6 h-20 w-16 rounded-md bg-white shadow-soft motion-safe:animate-[sheet_3.2s_var(--ease-oil)_infinite]"
          style={{ animationDelay: `${i * 0.25}s`, ["--r" as string]: `${(i - 1) * 8}deg` }}
        >
          <div className="m-2 size-6 border border-stone-900" />
          <div className="mx-2 h-px bg-orange-600" />
        </div>
      ))}
      <span className="absolute right-0 bottom-0 rounded-full bg-ink px-2 py-0.5 text-xs font-bold text-cream">1:1</span>
    </div>
  );
}

export function MiniGuide() {
  return (
    <div className="flex items-center gap-2" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="size-4 rounded-full bg-orange-500 motion-safe:animate-[fade-cycle_2.4s_var(--ease-oil)_infinite]" style={{ animationDelay: `${i * 0.3}s` }} />
      ))}
    </div>
  );
}

export function MiniCommunity() {
  const people = ["🎨", "🧑‍🏫", "🧁", "🛠️"];
  return (
    <div className="flex items-center" aria-hidden>
      {people.map((p, i) => (
        <span key={i} className="-ml-2 flex size-10 items-center justify-center rounded-full bg-cream text-lg ring-2 ring-white first:ml-0">
          {p}
        </span>
      ))}
      <span className="ml-2 text-xl text-flame motion-safe:animate-[pulse-soft_1.6s_var(--ease-oil)_infinite]">♥</span>
    </div>
  );
}

export function MiniTrace() {
  return (
    <svg viewBox="0 0 120 100" className="h-28 w-auto" aria-hidden>
      <path d="M60 8l13 32 35 2-27 22 9 33-30-19-30 19 9-33-27-22 35-2z" fill="none" stroke="#9dbdb8" strokeWidth="2" strokeDasharray="3 3" />
      <path
        d="M60 8l13 32 35 2-27 22 9 33-30-19-30 19 9-33-27-22 35-2z"
        fill="none"
        stroke="#ea2e00"
        strokeWidth="3"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray="1 1"
        className="motion-safe:animate-[draw_3s_var(--ease-oil)_infinite]"
      />
    </svg>
  );
}
