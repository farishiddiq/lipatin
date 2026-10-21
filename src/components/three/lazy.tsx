"use client";

import dynamic from "next/dynamic";

export const LazyFoldViewer = dynamic(() => import("./fold-viewer").then((m) => m.FoldViewer), {
  ssr: false,
  loading: () => (
    <div className="flex size-full items-center justify-center" aria-busy="true">
      <div className="size-16 animate-pulse rounded-xl bg-stone-200" />
      <span className="sr-only">Memuat pratinjau 3D</span>
    </div>
  ),
});
