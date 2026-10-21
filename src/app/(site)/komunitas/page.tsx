import type { Metadata } from "next";
import { Feed } from "./feed";

export const metadata: Metadata = {
  title: "Komunitas",
  description: "Karya kardus dari komunitas Lipatin. Lihat 3D-nya, lalu remix ke Studio dengan atribusi otomatis.",
};

export default function KomunitasPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-extrabold text-balance sm:text-4xl">Karya komunitas</h1>
      <p className="mt-2 max-w-2xl text-pretty text-stone-600">Temukan ide dari pembuat lain. Setiap karya bisa diremix ke Studio-mu dengan atribusi otomatis ke pembuat aslinya.</p>
      <Feed />
    </div>
  );
}
