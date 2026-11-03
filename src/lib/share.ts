import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import { migrateProjectData, type ProjectData } from "./project";

/** Link publik tanpa server: data proyek dipadatkan ke fragmen URL (#), tidak dikirim ke server. */
export function encodeShare(d: ProjectData, author?: string) {
  return compressToEncodedURIComponent(JSON.stringify({ v: 1, d, a: author }));
}

export function decodeShare(s: string): { d: ProjectData; a?: string } | null {
  try {
    const raw = decompressFromEncodedURIComponent(s);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (obj?.v !== 1 || !obj.d?.source) return null;
    return { d: migrateProjectData(obj.d as ProjectData), a: obj.a };
  } catch {
    return null;
  }
}

export function shareUrl(d: ProjectData) {
  // GitHub Pages menyajikan situs di bawah basePath (/lipatin), jadi sertakan saat membuat tautan
  const origin = typeof window !== "undefined" ? window.location.origin : "https://farishiddiq.github.io";
  return `${origin}${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/lihat/#${encodeShare(d)}`;
}
