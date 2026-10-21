"use client";

import { ArrowDown } from "lucide-react";
import { animate, motion, useMotionValue, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CardboardBox } from "./cardboard-box";
import { Cta } from "./cta";
import { OIL, SplitReveal } from "./motion-kit";

const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Hero: preloader (≤ 1,5 dtk) yang berubah menjadi objek hero, judul raksasa, satu CTA, indikator scroll. */
export function Hero() {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLSpanElement>(null);
  const [phase, setPhase] = useState<"measure" | "load" | "done">("measure");
  const [boxSize, setBoxSize] = useState(220);

  const introFold = useMotionValue(0);
  const introLid = useMotionValue(0);
  const offX = useMotionValue(0);
  const offY = useMotionValue(0);
  const offS = useMotionValue(1);

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  // kotak membuka tutup lalu terbongkar kembali menjadi pola saat digulir
  const scrollLid = useTransform(scrollYProgress, [0, 0.35], [1, 0], { clamp: true });
  const scrollFold = useTransform(scrollYProgress, [0.3, 0.85], [1, 0.12], { clamp: true });
  const fold = useTransform(() => introFold.get() * (reduced ? 1 : scrollFold.get()));
  const lid = useTransform(() => introLid.get() * (reduced ? 1 : scrollLid.get()));
  const rotY = useTransform(scrollYProgress, [0, 1], [-34, 150]);
  const rotX = useTransform(scrollYProgress, [0, 1], [-26, -52]);
  const boxY = useTransform(scrollYProgress, [0, 1], [0, 160]);
  const weight = useTransform(scrollYProgress, [0, 0.6], [800, 380]);
  const hintOpacity = useTransform(scrollYProgress, [0, 0.12], [1, 0]);

  useEffect(() => {
    const set = () => setBoxSize(Math.round(Math.min(260, Math.max(150, window.innerWidth * 0.17))));
    set();
    window.addEventListener("resize", set);
    return () => window.removeEventListener("resize", set);
  }, []);

  // ukur posisi kotak supaya preloader bisa memulai dari tengah layar
  useIso(() => {
    if (reduced) {
      introFold.set(1);
      introLid.set(1);
      setPhase("done");
      return;
    }
    const r = boxRef.current?.getBoundingClientRect();
    if (r) {
      offX.set(window.innerWidth / 2 - (r.left + r.width / 2));
      offY.set(window.innerHeight / 2 - (r.top + r.height / 2));
      offS.set(0.9);
    }
    setPhase("load");
  }, [reduced]);

  useEffect(() => {
    if (phase !== "load") return;
    const a = animate(introFold, 1, { duration: 0.9, ease: OIL });
    const b = animate(introLid, 1, { duration: 0.6, delay: 0.55, ease: OIL });
    const c = animate(0, 100, {
      duration: 1.15,
      ease: OIL,
      onUpdate: (v) => {
        if (counter.current) counter.current.textContent = String(Math.round(v)).padStart(3, "0");
      },
    });
    const t = setTimeout(() => {
      setPhase("done");
      animate(offX, 0, { duration: 0.8, ease: OIL });
      animate(offY, 0, { duration: 0.8, ease: OIL });
      animate(offS, 1, { duration: 0.8, ease: OIL });
    }, 1250);
    return () => {
      a.stop();
      b.stop();
      c.stop();
      clearTimeout(t);
    };
  }, [phase, introFold, introLid, offX, offY, offS]);

  const ready = phase === "done";

  return (
    <section ref={ref} aria-label="Pembuka" className="relative min-h-dvh overflow-hidden bg-cream">
      {/* preloader */}
      <motion.div
        aria-hidden={ready}
        role={ready ? undefined : "status"}
        className="fixed inset-0 z-40 flex items-end justify-between bg-cream p-6 md:p-16"
        initial={false}
        animate={{ opacity: ready ? 0 : 1 }}
        transition={{ duration: 0.6, ease: OIL }}
        style={{ pointerEvents: ready ? "none" : "auto" }}
      >
        <span className="text-[clamp(48px,8vw,120px)] leading-none font-bold tracking-[-0.03em] text-flame tabular-nums">
          <span ref={counter}>000</span>
        </span>
        <span className="pb-2 text-sm font-semibold">Melipat kardus…</span>
      </motion.div>

      <div className="relative mx-auto grid min-h-dvh max-w-[1440px] grid-cols-12 content-center gap-x-6 gap-y-8 px-6 py-24 md:px-16">
        <motion.h1 className="relative z-10 col-span-12 text-[clamp(56px,10vw,160px)] leading-[0.88] tracking-[-0.03em] text-ink" style={reduced ? { fontWeight: 760 } : { fontWeight: weight }}>
          <SplitReveal text="Lipat ide" play={ready} wordClassName="transition-[font-weight] duration-500 ease-[var(--ease-oil)] hover:font-light" className="block" />
          <SplitReveal text="jadi kardus." play={ready} delay={0.12} wordClassName="transition-[font-weight] duration-500 ease-[var(--ease-oil)] hover:font-light" className="block md:pl-[16.6%]" />
        </motion.h1>

        <motion.div
          initial={false}
          animate={{ opacity: ready ? 1 : 0, y: ready ? 0 : 24 }}
          transition={{ duration: 0.6, ease: OIL, delay: ready ? 0.45 : 0 }}
          className="relative z-10 col-span-12 md:col-span-6"
        >
          <Cta />
        </motion.div>

        {/* objek hero */}
        <div className={`pointer-events-none relative col-span-12 flex justify-center md:absolute md:top-1/2 md:right-[6%] md:-translate-y-1/2 ${ready ? "z-0" : "z-50"}`}>
          <motion.div
            ref={boxRef}
            className="relative"
            style={{ x: offX, y: offY, scale: offS, opacity: phase === "measure" ? 0 : 1 }}
          >
            <motion.div style={reduced ? undefined : { y: boxY }}>
              <CardboardBox size={boxSize} fold={fold} lid={lid} rotateX={reduced ? -26 : rotX} rotateY={reduced ? -34 : rotY} />
            </motion.div>
          </motion.div>
        </div>
      </div>

      <motion.div style={reduced ? undefined : { opacity: hintOpacity }} className="absolute inset-x-0 bottom-8 flex flex-col items-center gap-2 text-xs font-semibold text-stone-600" aria-hidden>
        <span>Gulir</span>
        <ArrowDown className="size-5 motion-safe:animate-[nudge_1.6s_var(--ease-oil)_infinite]" />
      </motion.div>
    </section>
  );
}
