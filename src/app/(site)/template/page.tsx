import type { Metadata } from "next";
import { Suspense } from "react";
import { Gallery } from "./gallery";

export const metadata: Metadata = {
  title: "Galeri template",
  description: "Model 3D dari kardus: mainan seperti controller PS4 dan tank, ikon Nusantara seperti Borobudur dan Rumah Gadang, serta Mesir kuno seperti Sphinx dan piramida, dibongkar otomatis jadi pola siap potong.",
};

export default function TemplatePage() {
  return (
    <div className="mx-auto max-w-[1440px] px-6 pt-12 pb-24 md:px-16">
      <Suspense>
        <Gallery />
      </Suspense>
    </div>
  );
}
