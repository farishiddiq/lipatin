import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { COMMUNITY, postById } from "@/lib/community";
import { PostDetail } from "./post-detail";

export function generateStaticParams() {
  return COMMUNITY.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = postById(id);
  if (!p) return { title: "Karya tidak ditemukan" };
  return { title: p.title, description: p.description };
}

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = postById(id);
  if (!post) notFound();
  return <PostDetail id={post.id} />;
}
