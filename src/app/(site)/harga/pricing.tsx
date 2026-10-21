"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import { useProjects } from "@/lib/store/projects";
import { cn } from "@/lib/utils";

const PLANS = [
  {
    id: "gratis",
    name: "Gratis",
    price: "Rp0",
    per: "",
    for: "Penghobi, siswa, dan coba-coba",
    items: ["10 proyek tersimpan", "Semua template dasar", "Ekspor PDF & PNG (watermark kecil)", "Unfold sampai 200 sisi", "Link publik & remix"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "Rp49.000",
    per: "/bulan",
    for: "Kreator dan maker serius",
    items: ["Proyek tanpa batas", "Tanpa watermark", "Ekspor SVG berlapis & DXF", "Nesting otomatis", "Unfold sampai 2.000 sisi", "Render HD & video 360°"],
    highlight: true,
  },
  {
    id: "bisnis",
    name: "Bisnis",
    price: "Rp149.000",
    per: "/bulan",
    for: "UMKM dan studio kemasan",
    items: ["Semua fitur Pro", "Template kemasan FEFCO/ECMA", "Cetak desain di permukaan", "Kolaborasi tim 5 orang", "Lisensi komersial"],
  },
  {
    id: "edukasi",
    name: "Edukasi",
    price: "Rp500.000",
    per: "/tahun per sekolah",
    for: "Guru dan sekolah",
    items: ["Ruang kelas & tugas", "Akun siswa tanpa batas", "Modul bangun ruang sesuai kurikulum", "Mode anak dengan tips keselamatan"],
  },
];

export function Pricing() {
  const plan = useProjects((s) => s.plan);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const current = mounted ? plan : "free";
  return (
    <>
      <ul className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((p) => (
          <li
            key={p.id}
            className={cn(
              "flex flex-col gap-4 rounded-2xl border bg-white p-6",
              p.highlight ? "border-orange-500 ring-1 ring-orange-500" : "border-stone-200",
            )}
          >
            <div>
              <h2 className="text-lg font-bold">{p.name}</h2>
              <p className="text-sm text-stone-500">{p.for}</p>
            </div>
            <p>
              <span className="text-3xl font-extrabold tabular-nums">{p.price}</span>
              <span className="text-sm text-stone-500">{p.per}</span>
            </p>
            <ul className="flex flex-1 flex-col gap-2 text-sm">
              {p.items.map((it) => (
                <li key={it} className="flex gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-orange-600" strokeWidth={3} aria-hidden />
                  {it}
                </li>
              ))}
            </ul>
            {p.id === "gratis" ? (
              <Link href="/template" className={buttonClass("outline", "md")}>
                {current === "free" ? "Paket kamu saat ini" : "Mulai gratis"}
              </Link>
            ) : (
              <Button variant={p.highlight ? "primary" : "outline"} disabled aria-describedby="belum-bayar">
                Segera hadir
              </Button>
            )}
          </li>
        ))}
      </ul>
      <p id="belum-bayar" className="mt-4 text-sm text-stone-500">
        Pembayaran belum tersedia di prototipe ini.
      </p>
      <section aria-labelledby="h-demo" className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-dashed border-stone-300 p-5">
        <div>
          <h2 id="h-demo" className="font-bold">
            Coba fitur Pro (demo lokal)
          </h2>
          <p className="text-sm text-pretty text-stone-600">Membuka ekspor SVG, menghapus watermark, dan menaikkan batas unfold di browser ini saja. Tidak ada tagihan.</p>
        </div>
        <Button variant={current === "pro" ? "outline" : "secondary"} onClick={() => useProjects.setState({ plan: current === "pro" ? "free" : "pro" })}>
          {current === "pro" ? "Kembali ke Gratis" : "Aktifkan Pro demo"}
        </Button>
      </section>
    </>
  );
}
