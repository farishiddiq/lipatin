"use client";

import { unfoldMesh, type RawMesh, type UnfoldOptions, type UnfoldResult } from "./geometry/unfold";

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();

function getWorker(): Worker | null {
  if (worker) return worker;
  try {
    worker = new Worker(new URL("./unfold.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<{ id: number; ok: boolean; res?: unknown; error?: string }>) => {
      const p = pending.get(e.data.id);
      if (!p) return;
      pending.delete(e.data.id);
      if (e.data.ok) p.resolve(e.data.res);
      else p.reject(new Error(e.data.error ?? "Gagal memproses model"));
    };
    worker.onerror = () => {
      for (const p of pending.values()) p.reject(new Error("Web Worker berhenti tiba-tiba"));
      pending.clear();
      worker?.terminate();
      worker = null;
    };
    return worker;
  } catch {
    return null;
  }
}

function call<T>(msg: Record<string, unknown>): Promise<T> {
  const w = getWorker();
  if (!w) return Promise.reject(new Error("no-worker"));
  const id = ++seq;
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
    w.postMessage({ ...msg, id });
  });
}

/** Bongkar di Web Worker agar UI tetap responsif; jatuh ke main thread bila worker tidak tersedia. */
export async function unfoldInWorker(mesh: RawMesh, opts: UnfoldOptions): Promise<UnfoldResult> {
  try {
    return await call<UnfoldResult>({ type: "unfold", mesh, opts });
  } catch (e) {
    if ((e as Error).message !== "no-worker") throw e;
    return unfoldMesh(mesh, opts);
  }
}

export async function simplifyInWorker(mesh: RawMesh, targetTriangles: number): Promise<RawMesh> {
  return call<RawMesh>({ type: "simplify", mesh, targetTriangles });
}
