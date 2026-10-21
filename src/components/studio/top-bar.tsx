"use client";

import { BookOpen, Check, Copy, Download, History, Redo2, Share2, Undo2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LogoMark } from "@/components/site/logo";
import { Button, buttonClass } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tooltip } from "@/components/ui/tooltip";
import { shareUrl } from "@/lib/share";
import { useEditor } from "@/lib/store/editor";
import { useProjects } from "@/lib/store/projects";

export function TopBar() {
  const data = useEditor((s) => s.data);
  const projectId = useEditor((s) => s.projectId);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const easy = useEditor((s) => s.easy);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const set = useEditor((s) => s.set);
  const commit = useEditor((s) => s.commit);
  const savedAt = useProjects((s) => (projectId ? s.projects[projectId]?.updatedAt : 0));
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  if (!data) return null;
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-stone-200 bg-white px-2 pt-[env(safe-area-inset-top)] sm:px-3">
      <Link href="/dashboard" aria-label="Kembali ke Proyek saya" className="rounded-lg">
        <LogoMark />
      </Link>
      <div className="flex min-w-0 flex-col">
        <label htmlFor="judul" className="sr-only">
          Judul proyek
        </label>
        <input
          id="judul"
          value={data.title}
          onChange={(e) => {
            const v = e.target.value;
            commit((d) => ({ ...d, title: v }), "title");
          }}
          className="w-32 min-w-0 truncate rounded-md bg-transparent px-1.5 py-0.5 text-sm font-bold hover:bg-stone-100 focus:bg-stone-100 sm:w-56"
        />
        <SavedLabel at={savedAt} />
      </div>
      <div className="ml-1 flex items-center">
        <Tooltip side="bottom" content="Urungkan (Ctrl+Z)">
          <Button variant="ghost" size="icon-sm" aria-label="Urungkan" disabled={!canUndo} onClick={undo}>
            <Undo2 aria-hidden />
          </Button>
        </Tooltip>
        <Tooltip side="bottom" content="Ulangi (Ctrl+Shift+Z)">
          <Button variant="ghost" size="icon-sm" aria-label="Ulangi" disabled={!canRedo} onClick={redo}>
            <Redo2 aria-hidden />
          </Button>
        </Tooltip>
      </div>
      <Switch className="ml-2 hidden items-center lg:flex" label="Mode Mudah" checked={easy} onChange={(v) => set({ easy: v, tool: "select" })} />
      <div className="ml-auto flex items-center gap-1.5">
        <Button variant="ghost" size="sm" className="hidden md:inline-flex" onClick={() => setVersionsOpen(true)}>
          <History aria-hidden />
          Versi
        </Button>
        <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={() => setShareOpen(true)}>
          <Share2 aria-hidden />
          Bagikan
        </Button>
        <Link href={`/panduan?id=${projectId}`} className={buttonClass("ghost", "sm", "hidden md:inline-flex")}>
          <BookOpen aria-hidden />
          Panduan
        </Link>
        <Link href={`/ekspor?id=${projectId}`} className={buttonClass("primary", "sm")}>
          <Download aria-hidden />
          Ekspor
        </Link>
      </div>
      <VersionsDialog open={versionsOpen} onOpenChange={setVersionsOpen} />
      <ShareDialog open={shareOpen} onOpenChange={setShareOpen} />
    </header>
  );
}

function SavedLabel({ at }: { at?: number }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => tick((n) => n + 1), 15_000);
    return () => clearInterval(iv);
  }, []);
  if (!at) return null;
  const s = Math.round((Date.now() - at) / 1000);
  const text = s < 10 ? "Tersimpan otomatis" : s < 60 ? `Disimpan ${s} detik lalu` : `Disimpan ${Math.round(s / 60)} menit lalu`;
  return (
    <span className="px-1.5 text-[11px] text-stone-500" aria-live="polite">
      {text}
    </span>
  );
}

function VersionsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const projectId = useEditor((s) => s.projectId);
  const data = useEditor((s) => s.data);
  const commit = useEditor((s) => s.commit);
  const project = useProjects((s) => (projectId ? s.projects[projectId] : undefined));
  const update = useProjects((s) => s.update);
  const saveVersion = useProjects((s) => s.saveVersion);
  const [note, setNote] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Riwayat versi" description="Simpan titik pemulihan sebelum mengubah banyak hal. Memulihkan versi tetap bisa diurungkan.">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!projectId || !data) return;
          update(projectId, { ...data });
          saveVersion(projectId, note.trim() || "Tanpa catatan");
          setNote("");
        }}
      >
        <label htmlFor="catatan" className="sr-only">
          Catatan versi
        </label>
        <input id="catatan" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Catatan, mis. sebelum ubah tutup" className="h-10 min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-3 text-sm" />
        <Button type="submit" variant="secondary">
          Simpan versi
        </Button>
      </form>
      {project?.versions.length ? (
        <ol className="flex max-h-72 flex-col gap-2 overflow-y-auto">
          {[...project.versions].reverse().map((v) => (
            <li key={v.id} className="flex items-center gap-3 rounded-lg border border-stone-200 p-3">
              <span className="text-sm font-bold tabular-nums">v{v.n}</span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm">{v.note}</span>
                <span className="text-xs text-stone-500 tabular-nums">{new Date(v.at).toLocaleString("id-ID")}</span>
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  commit(() => structuredClone(v.snapshot));
                  onOpenChange(false);
                }}
              >
                Pulihkan
              </Button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-stone-500">Belum ada versi tersimpan.</p>
      )}
    </Dialog>
  );
}

function ShareDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const data = useEditor((s) => s.data);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const url = open && data ? shareUrl(data) : "";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setError(null);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Browser menolak akses clipboard. Pilih teks link lalu salin manual.");
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Bagikan link publik" description="Siapa pun yang punya link bisa melihat model 3D dan pola tanpa login, lalu me-remix ke Studio mereka. Proyekmu sendiri tetap privat.">
      <div className="flex flex-col gap-2">
        <label htmlFor="share-url" className="text-sm font-medium">
          Link
        </label>
        <div className="flex gap-2">
          <input id="share-url" readOnly value={url} onFocus={(e) => e.currentTarget.select()} aria-describedby={error ? "share-err" : undefined} className="h-10 min-w-0 flex-1 rounded-lg border border-stone-300 bg-stone-50 px-3 font-mono text-xs" />
          <Button variant="secondary" onClick={copy}>
            {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
            {copied ? "Tersalin" : "Salin"}
          </Button>
        </div>
        {error && (
          <p id="share-err" role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <p className="text-xs text-pretty text-stone-500">Data desain disimpan di dalam link itu sendiri (setelah tanda #), jadi tidak diunggah ke server.</p>
      </div>
    </Dialog>
  );
}
