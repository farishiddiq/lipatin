"use client";

import { decalRenders } from "@/lib/decals";
import { Menu } from "@base-ui/react/menu";
import { Copy, Download, FolderInput, History, MoreHorizontal, Plus, Search, Trash2, BookOpen } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { NetSvg } from "@/components/net/net-svg";
import { Button, buttonClass } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { resolveProject, templateOf, type Project } from "@/lib/project";
import { FREE_PROJECT_LIMIT, projectData, useProjects } from "@/lib/store/projects";
import { cn } from "@/lib/utils";

function ago(t: number) {
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return "baru saja";
  if (s < 3600) return `${Math.round(s / 60)} menit lalu`;
  if (s < 86400) return `${Math.round(s / 3600)} jam lalu`;
  return new Date(t).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function Projects() {
  const [mounted, setMounted] = useState(false);
  const projects = useProjects((s) => s.projects);
  const plan = useProjects((s) => s.plan);
  const [folder, setFolder] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [toDelete, setToDelete] = useState<Project | null>(null);
  const [toMove, setToMove] = useState<Project | null>(null);
  const remove = useProjects((s) => s.remove);
  useEffect(() => setMounted(true), []);

  const all = useMemo(() => Object.values(projects).sort((a, b) => b.updatedAt - a.updatedAt), [projects]);
  const folders = useMemo(() => [...new Set(all.map((p) => p.folder).filter(Boolean))].sort(), [all]);
  const list = all.filter((p) => (folder === null || p.folder === folder) && (!q.trim() || p.title.toLowerCase().includes(q.trim().toLowerCase())));
  const used = all.length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-balance sm:text-4xl">Proyek saya</h1>
          <p className="mt-1 text-stone-600">Tersimpan otomatis di browser perangkat ini.</p>
        </div>
        <Link href="/template" className={buttonClass("primary", "md")}>
          <Plus aria-hidden />
          Proyek baru
        </Link>
      </div>

      <section aria-label="Status paket" className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-stone-200 bg-white p-4">
        <div className="flex min-w-48 flex-1 flex-col gap-1.5">
          <p className="text-sm font-bold">
            Paket {plan === "pro" ? "Pro" : "Gratis"}
            <span className="ml-2 font-normal text-stone-500 tabular-nums">{plan === "pro" ? `${mounted ? used : 0} proyek` : `${mounted ? used : 0} dari ${FREE_PROJECT_LIMIT} proyek`}</span>
          </p>
          {plan === "free" && (
            <div className="h-2 overflow-hidden rounded-full bg-stone-200" role="meter" aria-label="Kuota proyek" aria-valuenow={mounted ? used : 0} aria-valuemin={0} aria-valuemax={FREE_PROJECT_LIMIT}>
              <div className="h-full origin-left rounded-full bg-orange-500" style={{ transform: `scaleX(${Math.min(1, (mounted ? used : 0) / FREE_PROJECT_LIMIT)})` }} />
            </div>
          )}
        </div>
        <Link href="/harga" className={buttonClass("outline", "sm")}>
          {plan === "pro" ? "Kelola paket" : "Tingkatkan ke Pro"}
        </Link>
      </section>

      {!mounted ? (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="h-64 rounded-2xl bg-stone-200/60" />
          ))}
        </ul>
      ) : all.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-stone-300 px-6 py-16 text-center">
          <p className="text-lg font-bold">Belum ada proyek</p>
          <p className="max-w-sm text-sm text-pretty text-stone-600">Pilih template, ubah ukurannya, dan proyekmu tersimpan di sini secara otomatis.</p>
          <Link href="/template" className={buttonClass("primary", "md")}>
            Mulai dari template
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-72">
              <label htmlFor="cari-proyek" className="sr-only">
                Cari proyek
              </label>
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400" aria-hidden />
              <input id="cari-proyek" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari judul proyek" className="h-10 w-full rounded-xl border border-stone-300 bg-white pr-3 pl-9 text-sm" />
            </div>
            <div role="group" aria-label="Folder" className="flex flex-wrap gap-2">
              {[null, ...folders].map((f) => (
                <button
                  key={f ?? "semua"}
                  type="button"
                  aria-pressed={folder === f}
                  onClick={() => setFolder(f)}
                  className={cn(
                    "h-8 rounded-full border px-3 text-sm font-semibold",
                    folder === f ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 text-stone-700 hover:bg-stone-100",
                  )}
                >
                  {f ?? "Semua"}
                </button>
              ))}
            </div>
          </div>
          {list.length === 0 ? (
            <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-stone-300 px-6 py-12 text-center">
              <p className="font-bold">Tidak ada proyek yang cocok.</p>
              <Button
                variant="secondary"
                onClick={() => {
                  setQ("");
                  setFolder(null);
                }}
              >
                Tampilkan semua proyek
              </Button>
            </div>
          ) : (
            <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {list.map((p) => (
                <li key={p.id}>
                  <ProjectCard p={p} onDelete={() => setToDelete(p)} onMove={() => setToMove(p)} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Hapus "${toDelete?.title}"?`}
        description="Proyek beserta riwayat versinya akan dihapus permanen dari browser ini. Tindakan ini tidak bisa dibatalkan."
        confirmLabel="Hapus proyek"
        onConfirm={() => toDelete && remove(toDelete.id)}
      />
      <MoveDialog key={toMove?.id ?? "none"} project={toMove} folders={folders} onClose={() => setToMove(null)} />
    </div>
  );
}

function ProjectCard({ p, onDelete, onMove }: { p: Project; onDelete: () => void; onMove: () => void }) {
  const net = useMemo(() => resolveProject(projectData(p)), [p]);
  const t = templateOf(p);
  const duplicate = useProjects((s) => s.duplicate);
  const itemCls = "flex cursor-default items-center gap-2 rounded-md px-2.5 py-2 text-sm outline-none select-none data-highlighted:bg-stone-100 [&_svg]:size-4";
  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <div className="flex aspect-[4/3] items-center justify-center bg-stone-100 p-5">
        <NetSvg net={net} decals={decalRenders(net, p.design)} className="max-h-full max-w-full" title={`Pola ${p.title}`} />
      </div>
      <div className="flex flex-1 items-start gap-2 p-4">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="truncate font-bold">
            <Link href={`/studio?id=${p.id}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-2xl focus-visible:after:outline-2 focus-visible:after:outline-orange-600">
              {p.title}
            </Link>
          </h2>
          <p className="truncate text-sm text-stone-500">{t ? t.title : "Hasil bongkar 3D"}</p>
          <p className="text-xs text-stone-500 tabular-nums">
            Diubah {ago(p.updatedAt)}
            {p.versions.length > 0 && ` · ${p.versions.length} versi`}
            {p.folder && ` · ${p.folder}`}
          </p>
          {p.remixOf && <p className="truncate text-xs text-stone-500">Remix dari {p.remixOf.author}</p>}
        </div>
        <Menu.Root>
          <Menu.Trigger aria-label={`Aksi untuk ${p.title}`} className={buttonClass("ghost", "icon-sm", "relative z-10")}>
            <MoreHorizontal aria-hidden />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner className="z-50" align="end" sideOffset={4}>
              <Menu.Popup className="min-w-48 origin-[var(--transform-origin)] rounded-xl border border-stone-200 bg-white p-1 shadow-lg transition-[scale,opacity] duration-100 ease-out data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
                <Menu.LinkItem className={itemCls} render={<Link href={`/ekspor?id=${p.id}`} />}>
                  <Download aria-hidden />
                  Ekspor
                </Menu.LinkItem>
                <Menu.LinkItem className={itemCls} render={<Link href={`/panduan?id=${p.id}`} />}>
                  <BookOpen aria-hidden />
                  Panduan rakit
                </Menu.LinkItem>
                <Menu.Item className={itemCls} onClick={() => duplicate(p.id)}>
                  <Copy aria-hidden />
                  Duplikat
                </Menu.Item>
                <Menu.Item className={itemCls} onClick={onMove}>
                  <FolderInput aria-hidden />
                  Pindah ke folder
                </Menu.Item>
                <Menu.LinkItem className={itemCls} render={<Link href={`/studio?id=${p.id}`} />}>
                  <History aria-hidden />
                  Riwayat versi (di Studio)
                </Menu.LinkItem>
                <Menu.Separator className="my-1 h-px bg-stone-200" />
                <Menu.Item className={cn(itemCls, "text-red-700 data-highlighted:bg-red-50")} onClick={onDelete}>
                  <Trash2 aria-hidden />
                  Hapus
                </Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </div>
    </article>
  );
}

function MoveDialog({ project, folders, onClose }: { project: Project | null; folders: string[]; onClose: () => void }) {
  const update = useProjects((s) => s.update);
  const [name, setName] = useState(project?.folder ?? "");
  return (
    <Dialog open={!!project} onOpenChange={(o) => !o && onClose()} title="Pindah ke folder" description="Ketik nama folder baru atau pilih yang sudah ada. Kosongkan untuk mengeluarkan dari folder.">
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (project) update(project.id, { folder: name.trim() });
          onClose();
        }}
      >
        <label htmlFor="folder" className="text-sm font-medium">
          Nama folder
        </label>
        <input id="folder" list="folder-list" value={name} onChange={(e) => setName(e.target.value)} className="h-10 rounded-lg border border-stone-300 bg-white px-3 text-sm" />
        <datalist id="folder-list">
          {folders.map((f) => (
            <option key={f} value={f} />
          ))}
        </datalist>
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Batal</Button>
          <Button type="submit" variant="secondary">
            Simpan
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
