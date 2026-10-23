"use client";

import { BookOpen, Box, Boxes, CheckCheck, DoorOpen, FileDown, Hash, History, LayoutGrid, Link2, Lock, PenTool, Printer, Rotate3d, Ruler, Shapes, ShieldCheck, SlidersHorizontal, Smile, Sticker, Type, Users, Wallet } from "lucide-react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef, type ReactNode } from "react";
import { COMMUNITY } from "@/lib/community";
import { CATEGORIES, TEMPLATES } from "@/lib/templates";
import { cn } from "@/lib/utils";
import { Cta } from "./cta";
import { MiniCommunity, MiniCrate, MiniCube, MiniEditor, MiniExport, MiniGallery, MiniGuide, MiniModels } from "./minis";
import { CountUp, Drift, InkEdge, Marquee, OIL, PauseOffscreen, Section, SplitReveal, TiltCard } from "./motion-kit";

const H2 = "text-[clamp(40px,6vw,96px)] leading-[0.92] font-bold tracking-[-0.03em] text-balance";
const WRAP = "mx-auto grid max-w-[1440px] grid-cols-12 gap-x-6 px-6 md:px-16";

/* ----------------------------- Bentuk melayang ----------------------------- */

const Tri = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 40 40" className={className}>
    <path d="M20 4l16 30H4z" />
  </svg>
);
const Ring = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 40 40" className={className}>
    <circle cx="20" cy="20" r="14" fill="none" strokeWidth="6" />
  </svg>
);
const Sq = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 40 40" className={className}>
    <rect x="6" y="6" width="28" height="28" rx="4" />
  </svg>
);

/* ------------------------------- 2. Cara kerja ------------------------------- */

const STEPS = [
  { icon: SlidersHorizontal, title: "Pilih & atur ukuran" },
  { icon: Rotate3d, title: "Cek lipatan 3D" },
  { icon: Printer, title: "Cetak & rakit" },
];

export function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 80%", "end 50%"] });
  const draw = useTransform(scrollYProgress, [0, 1], [0, 1]);
  return (
    <div className="relative bg-sage">
      <InkEdge color="#9dbdb8" id="ink-sage" />
      <Drift className="top-24 left-[6%] size-16" speed={120}>
        <Tri className="fill-cream" />
      </Drift>
      <Drift className="right-[8%] bottom-32 size-24" speed={90} rotate={90}>
        <Ring className="stroke-flame" />
      </Drift>
      <Section label="Cara kerja">
        <div className={WRAP}>
          <SplitReveal as="h2" text="Tiga langkah. Satu kardus." className={cn(H2, "col-span-12 text-ink")} />
          <div ref={ref} className="relative col-span-12 mt-16 grid grid-cols-12 gap-6">
            <svg className="pointer-events-none absolute top-1/2 left-0 hidden h-8 w-full -translate-y-1/2 md:block" viewBox="0 0 1000 32" preserveAspectRatio="none" aria-hidden>
              <motion.path d="M40 16 C 260 -8, 420 40, 500 16 S 760 -8, 960 16" fill="none" stroke="#1f1a17" strokeWidth="2" strokeDasharray="6 6" style={reduced ? undefined : { pathLength: draw }} />
            </svg>
            {STEPS.map((s, i) => (
              <motion.div
                key={s.title}
                className="relative col-span-12 md:col-span-4"
                initial={reduced ? false : { opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10% 0px" }}
                transition={{ duration: 0.6, ease: OIL, delay: i * 0.12 }}
              >
                <TiltCard className="group flex aspect-[4/3] flex-col justify-between rounded-3xl bg-cream p-8 shadow-soft">
                  <span className="text-[clamp(56px,7vw,112px)] leading-none font-bold tracking-[-0.03em] text-flame tabular-nums">0{i + 1}</span>
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-2xl font-bold tracking-[-0.02em]">{s.title}</h3>
                    <span className="flex size-12 items-center justify-center rounded-2xl bg-ink text-cream transition-transform duration-500 ease-[var(--ease-oil)] group-hover:rotate-[-12deg] group-hover:scale-110">
                      <s.icon className="size-6" strokeWidth={2.4} aria-hidden />
                    </span>
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>
    </div>
  );
}

/* --------------------------------- 3. Fitur --------------------------------- */

interface Feat {
  icon: typeof Box;
  title: string;
  mini: ReactNode;
  span: string;
  isNew?: boolean;
  tone?: "cream" | "white" | "ink" | "sage";
}

const FEATS: Feat[] = [
  { icon: Sticker, title: "Logo di sisi kardus", mini: <MiniCube logo />, span: "md:col-span-5 md:row-span-2", isNew: true, tone: "ink" },
  { icon: Boxes, title: `${TEMPLATES.length} model 3D siap rakit`, mini: <MiniModels />, span: "md:col-span-4 md:row-span-2", isNew: true, tone: "white" },
  { icon: Rotate3d, title: "Preview 3D", mini: <MiniCube />, span: "md:col-span-3", tone: "sage" },
  { icon: LayoutGrid, title: "Galeri template", mini: <MiniGallery />, span: "md:col-span-3", tone: "white" },
  { icon: PenTool, title: "Editor pola 2D", mini: <MiniEditor />, span: "md:col-span-4", tone: "white" },
  { icon: DoorOpen, title: "Pintu, laci & sekat", mini: <MiniCrate />, span: "md:col-span-4", isNew: true, tone: "white" },
  { icon: FileDown, title: "Ekspor cetak 1:1", mini: <MiniExport />, span: "md:col-span-4", tone: "white" },
  { icon: BookOpen, title: "Panduan rakit", mini: <MiniGuide />, span: "md:col-span-4", tone: "white" },
  { icon: Users, title: "Komunitas & remix", mini: <MiniCommunity />, span: "md:col-span-4", tone: "white" },
];

const EXTRAS = [
  { icon: CheckCheck, label: "Validasi pola" },
  { icon: Hash, label: "Nomor pasangan tepi" },
  { icon: Ruler, label: "Kompensasi tebal" },
  { icon: Smile, label: "Mode Mudah" },
  { icon: History, label: "Riwayat versi" },
  { icon: Link2, label: "Link publik" },
  { icon: ShieldCheck, label: "Mode anak" },
  { icon: Wallet, label: "Gratis untuk mulai" },
];

const TONE = {
  white: "bg-white text-ink",
  cream: "bg-cream text-ink",
  sage: "bg-sage text-ink",
  ink: "bg-ink text-cream",
};

export function Features() {
  const reduced = useReducedMotion();
  return (
    <div className="relative bg-cream">
      <InkEdge color="#f0e7d6" id="ink-cream-1" />
      <Drift className="top-32 right-[4%] size-14" speed={140}>
        <Sq className="fill-sage" />
      </Drift>
      <Section label="Fitur" className="py-24">
        <div className={WRAP}>
          <SplitReveal as="h2" text="Semua alat, satu meja kerja." className={cn(H2, "col-span-12 md:col-span-10")} />
          <PauseOffscreen className="col-span-12 mt-16">
            <ul className="grid auto-rows-[208px] grid-cols-1 gap-4 md:grid-cols-12">
              {FEATS.map((f, i) => (
                <motion.li
                  key={f.title}
                  className={cn("col-span-1", f.span)}
                  initial={reduced ? false : { opacity: 0, y: 32 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-8% 0px" }}
                  transition={{ duration: 0.5, ease: OIL, delay: (i % 3) * 0.08 }}
                >
                  <TiltCard className={cn("group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl p-6 shadow-soft", TONE[f.tone ?? "white"])}>
                    <div className="flex items-start justify-between gap-4">
                      <span className={cn("flex size-10 items-center justify-center rounded-xl transition-transform duration-500 ease-[var(--ease-oil)] group-hover:-rotate-12", f.tone === "ink" ? "bg-flame text-white" : "bg-ink text-cream")}>
                        <f.icon className="size-5" strokeWidth={2.4} aria-hidden />
                      </span>
                      {f.isNew && <span className="rounded-full bg-flame px-2 py-1 text-xs font-bold text-white">Baru</span>}
                    </div>
                    <div className="flex flex-1 items-center justify-center py-2">{f.mini}</div>
                    <h3 className="text-xl font-bold tracking-[-0.02em]">{f.title}</h3>
                  </TiltCard>
                </motion.li>
              ))}
              <motion.li
                className="col-span-1 md:col-span-4"
                initial={reduced ? false : { opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, ease: OIL }}
              >
                <ProLockedCard />
              </motion.li>
              <li className="col-span-1 flex flex-wrap content-center items-center gap-2 rounded-3xl bg-sage-100 p-6 md:col-span-12" aria-label="Fitur lain">
                {EXTRAS.map((x) => (
                  <span key={x.label} className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold shadow-soft transition-transform duration-300 ease-[var(--ease-oil)] hover:-translate-y-0.5">
                    <x.icon className="size-4 text-flame" strokeWidth={2.6} aria-hidden />
                    {x.label}
                  </span>
                ))}
              </li>
            </ul>
          </PauseOffscreen>
        </div>
      </Section>
    </div>
  );
}

/** Editor desain bawaan (Pro · Segera): terkunci, dengan hover dan disabled yang rapi. */
export function ProLockedCard() {
  return (
    <div className="group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl bg-white p-6 shadow-soft" aria-disabled="true">
      <div className="flex items-start justify-between gap-4">
        <span className="flex size-10 items-center justify-center rounded-xl bg-stone-200 text-stone-600 transition-transform duration-500 ease-[var(--ease-oil)] group-hover:rotate-12">
          <Lock className="size-5" aria-hidden />
        </span>
        <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-bold text-orange-800">Pro · Segera</span>
      </div>
      <div className="flex items-center justify-center gap-4 text-stone-300 transition-colors duration-500 group-hover:text-stone-400" aria-hidden>
        <PenTool className="size-8" />
        <Type className="size-8" />
        <Shapes className="size-8" />
      </div>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xl font-bold tracking-[-0.02em] text-stone-500">Editor desain</h3>
        <button type="button" disabled className="h-8 cursor-not-allowed rounded-full bg-stone-100 px-4 text-xs font-semibold text-stone-500">
          Belum tersedia
        </button>
      </div>
    </div>
  );
}

/* --------------------------------- 5. Bukti --------------------------------- */

const PERSONAS = [
  { e: "🎮", l: "Gamer" },
  { e: "🩺", l: "Calon dokter" },
  { e: "🧑‍🏫", l: "Guru" },
  { e: "🎨", l: "Kreator" },
  { e: "🛠️", l: "Maker" },
  { e: "👧", l: "Anak" },
];

export function Proof() {
  const reduced = useReducedMotion();
  const stats = [
    { n: TEMPLATES.length, s: "", l: "model 3D" },
    { n: CATEGORIES.length, s: "", l: "kategori hobi & cita-cita" },
    { n: 10, s: " cm", l: "kalibrasi cetak" },
    { n: 0, p: "Rp", s: "", l: "untuk mulai" },
  ];
  return (
    <div className="relative bg-sage">
      <InkEdge color="#9dbdb8" id="ink-sage-2" />
      <Drift className="top-24 right-[10%] size-20" speed={110} rotate={120}>
        <Tri className="fill-flame" />
      </Drift>
      <Section label="Bukti">
        <div className={WRAP}>
          <SplitReveal as="h2" text="Dari mainan sampai cita-cita." className={cn(H2, "col-span-12 text-ink")} />
          <dl className="col-span-12 mt-16 grid grid-cols-2 gap-6 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.l} className="flex flex-col gap-2">
                <dt className="order-2 text-base font-semibold text-ink/80">{s.l}</dt>
                <dd className="order-1 text-[clamp(48px,7vw,112px)] leading-none font-bold tracking-[-0.04em] text-ink">
                  <CountUp to={s.n} prefix={s.p} suffix={s.s} />
                </dd>
              </div>
            ))}
          </dl>
          <ul className="col-span-12 mt-16 flex items-center" aria-label="Siapa yang memakai Lipatin">
            {PERSONAS.map((p, i) => (
              <motion.li
                key={p.l}
                title={p.l}
                className="-ml-4 flex size-16 items-center justify-center rounded-full bg-cream text-2xl ring-4 ring-sage first:ml-0"
                initial={reduced ? false : { opacity: 0, scale: 0.6 }}
                whileInView={{ opacity: 1, scale: 1 }}
                whileHover={{ y: -6 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, ease: OIL, delay: i * 0.06 }}
              >
                <span role="img" aria-label={p.l}>
                  {p.e}
                </span>
              </motion.li>
            ))}
            <li className="ml-6 text-base font-semibold text-ink/80">+ ribuan pembuat</li>
          </ul>
        </div>
        <Marquee className="mt-16" seconds={48}>
          {COMMUNITY.map((c) => (
            <span key={c.id} className="inline-flex h-14 items-center gap-4 rounded-full bg-cream pr-6 pl-2 text-base font-semibold whitespace-nowrap text-ink">
              <span className="flex size-10 items-center justify-center rounded-full bg-flame text-sm font-bold text-white">{c.author.slice(0, 1)}</span>
              {c.title}
              <span className="text-ink/70 tabular-nums">♥ {c.likes}</span>
            </span>
          ))}
        </Marquee>
      </Section>
    </div>
  );
}

/* -------------------------------- 6. Penutup -------------------------------- */

const SHARE = [
  {
    label: "Bagikan ke WhatsApp",
    href: "https://wa.me/?text=Lipatin%20%E2%80%94%20pola%20kardus%202D%20%E2%86%94%203D%20https%3A%2F%2Flipatin.id",
    d: "M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.6-.3.4c-.1.1-.2.3 0 .5.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.4.1.6-.1l.8-1c.2-.2.4-.2.6-.1l1.9.9c.3.1.4.2.5.3.1.2.1.7-.1 1.3z",
  },
  { label: "Bagikan ke X", href: "https://twitter.com/intent/tweet?text=Lipatin%20%E2%80%94%20pola%20kardus%202D%20%E2%86%94%203D&url=https%3A%2F%2Flipatin.id", d: "M17.8 3h3.1l-6.8 7.7 8 10.3h-6.3l-4.9-6.4L5.3 21H2.2l7.3-8.3L1.8 3h6.4l4.4 5.9zm-1.1 16.2h1.7L7.4 4.7H5.6z" },
  { label: "Bagikan ke Facebook", href: "https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Flipatin.id", d: "M14 8V6c0-.9.6-1.1 1-1.1h2.5V1H14c-3.6 0-4.4 2.7-4.4 4.4V8H7v4h2.6v11H14V12h3.1l.4-4z" },
  { label: "Bagikan ke Telegram", href: "https://t.me/share/url?url=https%3A%2F%2Flipatin.id&text=Lipatin", d: "M21.9 4.3 18.6 20c-.2 1.1-.9 1.4-1.8.9l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.1 9.3-8.4c.4-.4-.1-.6-.6-.2L5.9 13.5 1 12c-1.1-.3-1.1-1.1.2-1.6L20.5 3c.9-.3 1.7.2 1.4 1.3z" },
];

export function Closing() {
  return (
    <div className="relative bg-cream">
      <InkEdge color="#f0e7d6" id="ink-cream-2" />
      <Drift className="top-24 left-[8%] size-16" speed={100}>
        <Ring className="stroke-sage" />
      </Drift>
      <Section label="Penutup">
        <div className={cn(WRAP, "justify-items-start gap-y-12")}>
          <SplitReveal as="h2" text="Ayo mulai melipat." className="col-span-12 text-[clamp(56px,10vw,160px)] leading-[0.88] font-bold tracking-[-0.03em] text-flame" />
          <div className="col-span-12">
            <Cta />
          </div>
        </div>
      </Section>
      <footer className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-6 pb-[max(2rem,env(safe-area-inset-bottom))] md:px-16">
        <p className="text-sm font-semibold text-stone-600">© 2026 Lipatin · Pola kardus 2D ↔ 3D</p>
        <ul className="flex items-center gap-2">
          {SHARE.map((s) => (
            <li key={s.label}>
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="flex size-10 items-center justify-center rounded-full bg-white text-ink shadow-soft transition-[transform,background-color,color] duration-300 ease-[var(--ease-oil)] hover:-translate-y-1 hover:bg-ink hover:text-cream"
              >
                <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
                  <path d={s.d} />
                </svg>
              </a>
            </li>
          ))}
        </ul>
      </footer>
    </div>
  );
}
