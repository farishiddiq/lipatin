"use client";

import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Magnetic } from "./motion-kit";

/** Satu-satunya CTA landing: teks dan tujuan sama di hero dan penutup. */
export const CTA = { href: "/template", label: "Mulai mendesain" };

export function Cta({ className, onDark }: { className?: string; onDark?: boolean }) {
  return (
    <Magnetic className={className}>
      <Link
        href={CTA.href}
        className={cn(
          "group relative inline-flex h-16 items-center gap-4 rounded-full pr-4 pl-8 text-xl font-bold transition-[background-color,transform] duration-300 ease-[var(--ease-oil)] active:scale-[0.97]",
          onDark ? "bg-cream text-ink hover:bg-white" : "bg-flame text-white hover:bg-orange-600",
        )}
      >
        <span aria-hidden className={cn("absolute inset-0 -z-10 rounded-full motion-safe:animate-[pulse-soft_2.8s_var(--ease-oil)_infinite]", onDark ? "bg-cream/40" : "bg-flame/25")} />
        {CTA.label}
        <span className={cn("relative flex size-10 items-center justify-center overflow-hidden rounded-full", onDark ? "bg-flame text-white" : "bg-white text-flame")}>
          <ArrowRight className="size-5 transition-transform duration-300 ease-[var(--ease-oil)] group-hover:translate-x-8" aria-hidden />
          <ArrowUpRight className="absolute size-5 -translate-x-8 transition-transform duration-300 ease-[var(--ease-oil)] group-hover:translate-x-0" aria-hidden />
        </span>
      </Link>
    </Magnetic>
  );
}
