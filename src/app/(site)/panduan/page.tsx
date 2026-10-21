import type { Metadata } from "next";
import { Suspense } from "react";
import { GuideView } from "./guide-view";

export const metadata: Metadata = { title: "Panduan rakit", description: "Langkah rakit bergambar dengan animasi 3D per langkah." };

export default function PanduanPage() {
  return (
    <Suspense>
      <GuideView />
    </Suspense>
  );
}
