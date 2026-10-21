import type { Metadata } from "next";
import { Suspense } from "react";
import { Gallery } from "./gallery";

export const metadata: Metadata = {
  title: "Galeri template",
  description: "Template pola kardus parametrik: kemasan, bangun ruang, mainan, senjata & kostum jagoan, rumah mini, furnitur, dekorasi, dan origami kardus.",
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
