import type { Metadata } from "next";
import { Pricing } from "./pricing";

export const metadata: Metadata = {
  title: "Paket & harga",
  description: "Gratis untuk merancang dan mencetak. Pro, Bisnis, dan Edukasi untuk produksi, UMKM, dan sekolah.",
};

export default function HargaPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-extrabold text-balance sm:text-4xl">Paket & harga</h1>
      <p className="mt-2 max-w-2xl text-pretty text-stone-600">Semua orang bisa merancang dan mencetak gratis. Fitur produksi dan bisnis masuk paket berbayar. Harga masih usulan awal.</p>
      <Pricing />
    </div>
  );
}
