"use client";

import { Heart, Repeat2 } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { NetSvg } from "@/components/net/net-svg";
import type { CommunityPost } from "@/lib/community";
import { resolveNet } from "@/lib/geometry/resolve";
import { emptyMods } from "@/lib/geometry/types";
import { templateById } from "@/lib/templates";

export function usePostNet(p: CommunityPost) {
  return useMemo(() => {
    const t = templateById(p.templateId)!;
    return resolveNet(t.build(p.params, { t: 3, compensate: true }), emptyMods(), [], 3);
  }, [p]);
}

export function PostCard({ post }: { post: CommunityPost }) {
  const net = usePostNet(post);
  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <div className="flex aspect-[16/10] items-center justify-center bg-stone-100 p-5">
        <NetSvg net={net} className="max-h-full max-w-full" title={`Pola ${post.title}`} />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="font-bold text-balance">
          <Link href={`/komunitas/${post.id}`} className="after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-orange-600">
            {post.title}
          </Link>
        </h3>
        <p className="text-sm text-stone-500">oleh {post.author}</p>
        <div className="mt-auto flex items-center gap-4 pt-2 text-sm text-stone-600">
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Heart className="size-4" aria-hidden />
            <span className="sr-only">Suka:</span>
            {post.likes}
          </span>
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Repeat2 className="size-4" aria-hidden />
            <span className="sr-only">Remix:</span>
            {post.remixes}
          </span>
        </div>
      </div>
    </article>
  );
}
