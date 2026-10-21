"use client";

import { useMemo, useState } from "react";
import { PostCard } from "@/components/community/post-card";
import { Segmented } from "@/components/ui/segmented";
import { COMMUNITY } from "@/lib/community";
import { cn } from "@/lib/utils";

export function Feed() {
  const [sort, setSort] = useState<"baru" | "populer" | "remix">("baru");
  const [tag, setTag] = useState<string | null>(null);
  const tags = useMemo(() => [...new Set(COMMUNITY.flatMap((p) => p.tags))].slice(0, 12), []);
  const list = useMemo(() => {
    const l = COMMUNITY.filter((p) => !tag || p.tags.includes(tag));
    return [...l].sort((a, b) => (sort === "baru" ? a.days - b.days : sort === "populer" ? b.likes - a.likes : b.remixes - a.remixes));
  }, [sort, tag]);
  return (
    <div className="mt-8 flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div role="group" aria-label="Saring berdasarkan tag" className="flex flex-wrap gap-2">
          {[null, ...tags].map((t) => (
            <button
              key={t ?? "semua"}
              type="button"
              aria-pressed={tag === t}
              onClick={() => setTag(t)}
              className={cn(
                "h-8 rounded-full border px-3 text-sm font-semibold",
                tag === t ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 text-stone-700 hover:bg-stone-100",
              )}
            >
              {t ? `#${t}` : "Semua"}
            </button>
          ))}
        </div>
        <Segmented
          label="Urutkan"
          value={sort}
          onChange={setSort}
          options={[
            { value: "baru", label: "Terbaru" },
            { value: "populer", label: "Terpopuler" },
            { value: "remix", label: "Paling diremix" },
          ]}
        />
      </div>
      <h2 className="sr-only">Daftar karya</h2>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((p) => (
          <li key={p.id}>
            <PostCard post={p} />
          </li>
        ))}
      </ul>
    </div>
  );
}
