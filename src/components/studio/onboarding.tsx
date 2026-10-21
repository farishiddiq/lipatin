"use client";

import { Check, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useEditor } from "@/lib/store/editor";
import { cn } from "@/lib/utils";

const KEY = "lipatin-onboarding-done";

/** Onboarding 60 detik: pilih template → ubah ukuran → lihat lipatan → ekspor. */
export function Onboarding() {
  const [hidden, setHidden] = useState(true);
  const [folded, setFolded] = useState(false);
  const changed = useEditor((s) => s.past.length > 0);
  const isTemplate = useEditor((s) => s.data?.source.kind === "template");
  const projectId = useEditor((s) => s.projectId);

  useEffect(() => {
    try {
      setHidden(localStorage.getItem(KEY) === "1");
    } catch {
      setHidden(false);
    }
  }, []);

  useEffect(
    () =>
      useEditor.subscribe((s, p) => {
        if (s.fold !== p.fold || s.playing) setFolded(true);
      }),
    [],
  );

  if (hidden || !isTemplate) return null;
  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
  };
  const steps = [
    { done: true, label: "Pilih template" },
    { done: changed, label: "Ubah ukurannya dengan slider" },
    { done: folded, label: "Geser slider lipatan atau tekan putar di 3D" },
    { done: false, label: "Ekspor PDF siap cetak", href: `/ekspor?id=${projectId}` },
  ];
  return (
    <section aria-labelledby="h-onb" className="relative rounded-xl border border-orange-200 bg-orange-50 p-4">
      <button type="button" onClick={dismiss} aria-label="Tutup panduan singkat" className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-md text-orange-900 hover:bg-orange-100">
        <X className="size-4" aria-hidden />
      </button>
      <h2 id="h-onb" className="pr-6 text-sm font-bold text-orange-950">
        Kenalan 60 detik
      </h2>
      <ol className="mt-2 flex flex-col gap-1.5 text-sm">
        {steps.map((s, i) => (
          <li key={s.label} className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums",
                s.done ? "bg-orange-600 text-white" : "border border-orange-300 text-orange-800",
              )}
            >
              {s.done ? <Check className="size-3.5" aria-hidden /> : i + 1}
            </span>
            {s.href ? (
              <Link href={s.href} className="font-semibold text-orange-900 underline underline-offset-2">
                {s.label}
              </Link>
            ) : (
              <span className={cn("text-orange-950", s.done && "line-through opacity-60")}>{s.label}</span>
            )}
            <span className="sr-only">{s.done ? "(selesai)" : "(belum)"}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
