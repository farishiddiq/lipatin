import type { Metadata } from "next";
import { Suspense } from "react";
import { Studio } from "@/components/studio/studio";

export const metadata: Metadata = {
  title: "Studio",
  description: "Editor pola kardus 2D dengan pratinjau lipatan 3D.",
  robots: { index: false },
};

export default function StudioPage() {
  return (
    <Suspense>
      <Studio />
    </Suspense>
  );
}
