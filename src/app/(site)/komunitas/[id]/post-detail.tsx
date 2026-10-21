"use client";

import { ArrowLeft, Heart, Repeat2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { usePostNet } from "@/components/community/post-card";
import { NetSvg } from "@/components/net/net-svg";
import { LazyFoldViewer } from "@/components/three/lazy";
import { Button, buttonClass } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { postById } from "@/lib/community";
import { defaultMaterial } from "@/lib/materials";
import { templateById } from "@/lib/templates";

export function PostDetail({ id }: { id: string }) {
  const post = postById(id)!;
  const net = usePostNet(post);
  const t = templateById(post.templateId)!;
  const material = useMemo(() => ({ ...defaultMaterial(), color: post.color }), [post.color]);
  const [fold, setFold] = useState(100);
  const [liked, setLiked] = useState(false);
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Link href="/komunitas" className="inline-flex items-center gap-1 text-sm font-semibold text-stone-600 hover:text-stone-900">
        <ArrowLeft className="size-4" aria-hidden />
        Semua karya
      </Link>
      <div className="mt-4 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-4">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-stone-200 bg-stone-100">
            <LazyFoldViewer net={net} material={material} progress={fold / 100} label={`Model 3D ${post.title}. Seret untuk memutar.`} />
          </div>
          <Slider label="Tingkat lipatan" valueText={`${fold}%`} value={fold} min={0} max={100} onChange={setFold} />
        </div>
        <div className="flex flex-col gap-4">
          <p className="text-sm font-semibold text-orange-700">Berdasarkan template {t.title}</p>
          <h1 className="text-3xl font-extrabold text-balance">{post.title}</h1>
          <p className="text-stone-600">
            oleh <span className="font-semibold text-stone-900">{post.author}</span> · @{post.handle} · {post.days} hari lalu
          </p>
          <p className="text-pretty text-stone-700">{post.description}</p>
          <ul className="flex flex-wrap gap-2" aria-label="Tag">
            {post.tags.map((tag) => (
              <li key={tag} className="rounded-full bg-stone-200/70 px-3 py-1 text-sm font-semibold text-stone-700">
                #{tag}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href={`/studio?remix=${post.id}`} className={buttonClass("primary", "lg")}>
              <Repeat2 aria-hidden />
              Remix ke Studio
            </Link>
            <Button size="lg" variant="outline" aria-pressed={liked} onClick={() => setLiked((v) => !v)}>
              <Heart aria-hidden className={liked ? "fill-red-500 text-red-500" : undefined} />
              <span className="tabular-nums">{post.likes + (liked ? 1 : 0)}</span>
              <span className="sr-only">suka</span>
            </Button>
          </div>
          <p className="text-sm text-stone-500 tabular-nums">{post.remixes} orang sudah me-remix karya ini. Remix-mu akan mencantumkan {post.author} sebagai pembuat asli.</p>
          <div className="mt-2 rounded-2xl border border-stone-200 bg-white p-4">
            <h2 className="text-sm font-bold">Pola datar</h2>
            <NetSvg net={net} seams className="mt-3 max-h-80 w-full" title={`Pola datar ${post.title}`} />
          </div>
        </div>
      </div>
    </div>
  );
}
