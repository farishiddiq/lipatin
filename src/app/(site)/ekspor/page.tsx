import type { Metadata } from "next";
import { Suspense } from "react";
import { ExportView } from "./export-view";

export const metadata: Metadata = { title: "Ekspor & cetak", robots: { index: false } };

export default function EksporPage() {
  return (
    <Suspense>
      <ExportView />
    </Suspense>
  );
}
