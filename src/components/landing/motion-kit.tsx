"use client";

import Lenis from "lenis";
import { animate, motion, useInView, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export const OIL = [0.22, 1, 0.36, 1] as const;

/** Smooth scroll (Lenis); dimatikan untuk prefers-reduced-motion. */
export function SmoothScroll() {
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    const lenis = new Lenis({ autoRaf: true, lerp: 0.09, smoothWheel: true });
    return () => lenis.destroy();
  }, [reduced]);
  return null;
}

/** Kursor kecil yang membesar di elemen interaktif (desktop saja). */
export function CustomCursor() {
  const reduced = useReducedMotion();
  const [on, setOn] = useState(false);
  const [hover, setHover] = useState(false);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 600, damping: 40, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 600, damping: 40, mass: 0.4 });

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!mq.matches || reduced) return;
    setOn(true);
    document.documentElement.classList.add("lp-cursor");
    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      const t = e.target as HTMLElement | null;
      setHover(!!t?.closest("a,button,label,[role=slider],[data-cursor=grow]"));
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      document.documentElement.classList.remove("lp-cursor");
    };
  }, [reduced, x, y]);

  if (!on) return null;
  return (
    <motion.div aria-hidden className="pointer-events-none fixed top-0 left-0 z-50 mix-blend-multiply" style={{ x: sx, y: sy }}>
      <motion.div
        className="-mt-2 -ml-2 size-4 rounded-full bg-orange-500"
        animate={{ scale: hover ? 3.2 : 1, opacity: hover ? 0.35 : 1 }}
        transition={{ duration: 0.4, ease: OIL }}
      />
    </motion.div>
  );
}

/** Tombol/tautan magnetik: tertarik mengikuti pointer. */
export function Magnetic({ children, className, strength = 0.35 }: { children: ReactNode; className?: string; strength?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const x = useSpring(0, { stiffness: 220, damping: 18 });
  const y = useSpring(0, { stiffness: 220, damping: 18 });
  return (
    <motion.div
      ref={ref}
      className={cn("inline-block", className)}
      style={{ x, y }}
      onPointerMove={(e) => {
        if (reduced || e.pointerType !== "mouse") return;
        const r = ref.current!.getBoundingClientRect();
        x.set((e.clientX - r.left - r.width / 2) * strength);
        y.set((e.clientY - r.top - r.height / 2) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

/** Teks muncul per kata. Pembaca layar menerima kalimat utuh. */
export function SplitReveal({
  text,
  className,
  wordClassName,
  delay = 0,
  play,
  as: Tag = "span",
}: {
  text: string;
  className?: string;
  wordClassName?: string;
  delay?: number;
  /** Bila diisi, animasi dikendalikan manual (mis. setelah preloader), bukan saat masuk layar. */
  play?: boolean;
  as?: "span" | "h1" | "h2" | "p";
}) {
  const reduced = useReducedMotion();
  const words = text.split(" ");
  return (
    <Tag className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {words.map((w, i) => (
          <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
            <motion.span
              className={cn("inline-block", wordClassName)}
              initial={reduced ? false : { y: "105%", opacity: 0 }}
              {...(play === undefined
                ? { whileInView: { y: "0%", opacity: 1 }, viewport: { once: true, margin: "-10% 0px" } }
                : { animate: play || reduced ? { y: "0%", opacity: 1 } : { y: "105%", opacity: 0 } })}
              transition={{ duration: 0.6, ease: OIL, delay: delay + i * 0.06 }}
            >
              {w}
              {i < words.length - 1 ? " " : ""}
            </motion.span>
          </span>
        ))}
      </span>
    </Tag>
  );
}

/** Angka naik saat masuk layar (tanpa render ulang tiap frame). */
export function CountUp({ to, prefix = "", suffix = "", className }: { to: number; prefix?: string; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20% 0px" });
  const reduced = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el || !inView) return;
    if (reduced) {
      el.textContent = `${prefix}${to.toLocaleString("id-ID")}${suffix}`;
      return;
    }
    const c = animate(0, to, {
      duration: 1.4,
      ease: OIL,
      onUpdate: (v) => {
        el.textContent = `${prefix}${Math.round(v).toLocaleString("id-ID")}${suffix}`;
      },
    });
    return () => c.stop();
  }, [inView, to, prefix, suffix, reduced]);
  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {prefix}0{suffix}
    </span>
  );
}

/** Jeda animasi CSS anak-anaknya saat di luar layar. */
export function PauseOffscreen({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "100px" });
  return (
    <div ref={ref} className={className} data-paused={!inView}>
      {children}
    </div>
  );
}

export function Marquee({ children, className, seconds = 40 }: { children: ReactNode; className?: string; seconds?: number }) {
  return (
    <PauseOffscreen className={cn("overflow-hidden", className)}>
      <div className="flex w-max motion-safe:animate-[marquee_var(--d)_linear_infinite]" style={{ ["--d" as string]: `${seconds}s` }}>
        <div className="flex shrink-0 gap-4 pr-4">{children}</div>
        <div className="flex shrink-0 gap-4 pr-4" aria-hidden>
          {children}
        </div>
      </div>
    </PauseOffscreen>
  );
}

/** Kartu yang miring halus mengikuti pointer. */
export function TiltCard({ children, className, disabled }: { children: ReactNode; className?: string; disabled?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const rx = useSpring(0, { stiffness: 200, damping: 20 });
  const ry = useSpring(0, { stiffness: 200, damping: 20 });
  return (
    <motion.div
      ref={ref}
      className={cn("[transform-style:preserve-3d]", className)}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      whileHover={disabled || reduced ? undefined : { y: -4 }}
      transition={{ duration: 0.4, ease: OIL }}
      onPointerMove={(e) => {
        if (disabled || reduced || e.pointerType !== "mouse") return;
        const r = ref.current!.getBoundingClientRect();
        ry.set(((e.clientX - r.left) / r.width - 0.5) * 8);
        rx.set(-((e.clientY - r.top) / r.height - 0.5) * 8);
      }}
      onPointerLeave={() => {
        rx.set(0);
        ry.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

/** Bagian 1 layar: konten bergeser & memudar saat masuk/keluar layar. */
export function Section({ children, className, id, label }: { children: ReactNode; className?: string; id?: string; label: string }) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const opacity = useTransform(scrollYProgress, [0, 0.18, 0.82, 1], [0, 1, 1, 0]);
  const y = useTransform(scrollYProgress, [0, 0.18, 0.82, 1], [64, 0, 0, -64]);
  return (
    <section ref={ref} id={id} aria-label={label} className={cn("relative flex min-h-dvh flex-col justify-center", className)}>
      <motion.div style={reduced ? undefined : { opacity, y }} className="relative w-full">
        {children}
      </motion.div>
    </section>
  );
}

/** Tepi "tinta mengalir": gumpalan bergabung (filter gooey) yang naik mengikuti scroll. */
export function InkEdge({ color, id }: { color: string; id: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end center"] });
  const blobs = [
    { x: 80, r: 46, from: 70, to: -10 },
    { x: 260, r: 64, from: 90, to: 0 },
    { x: 470, r: 52, from: 80, to: -24 },
    { x: 650, r: 72, from: 100, to: 6 },
    { x: 860, r: 50, from: 76, to: -18 },
    { x: 1030, r: 66, from: 96, to: 2 },
    { x: 1180, r: 44, from: 70, to: -6 },
  ];
  return (
    <div ref={ref} aria-hidden className="pointer-events-none absolute inset-x-0 -top-[119px] h-[120px] overflow-hidden">
      <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="size-full">
        <defs>
          <filter id={id} x="-10%" y="-50%" width="120%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="b" />
            <feColorMatrix in="b" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -10" />
          </filter>
        </defs>
        <g filter={`url(#${id})`} fill={color}>
          <rect x="-40" y="104" width="1280" height="60" />
          {blobs.map((b, i) => (
            <Blob key={i} b={b} p={scrollYProgress} reduced={!!reduced} />
          ))}
        </g>
      </svg>
    </div>
  );
}

function Blob({ b, p, reduced }: { b: { x: number; r: number; from: number; to: number }; p: MotionValue<number>; reduced: boolean }) {
  const y = useTransform(p, [0, 1], [b.from, b.to]);
  return <motion.circle cx={b.x} cy={110} r={b.r} style={reduced ? { y: b.to } : { y }} />;
}

/** Bentuk geometri yang bergerak pelan mengikuti scroll. */
export function Drift({ children, className, speed = 80, rotate = 40 }: { children: ReactNode; className?: string; speed?: number; rotate?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [speed, -speed]);
  const r = useTransform(scrollYProgress, [0, 1], [-rotate / 2, rotate / 2]);
  return (
    <motion.div ref={ref} aria-hidden className={cn("pointer-events-none absolute", className)} style={reduced ? undefined : { y, rotate: r }}>
      {children}
    </motion.div>
  );
}
