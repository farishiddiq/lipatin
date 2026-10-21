"use client";

import { useCallback, useRef, useState } from "react";
import { loadImage } from "@/lib/decals";
import { analyzeImage, TraceError, traceTip, type Analysis, type AnalyzeOpts } from "@/lib/trace";

export const TRACE_STEPS = ["Membaca foto", "Memisahkan objek dari latar", "Melacak kontur & lubang", "Membuat pola & cetakan"] as const;

export interface TraceState {
  status: "idle" | "loading" | "error" | "success";
  step: number;
  error?: string;
  result?: Analysis;
  preview?: string;
  name?: string;
}

const pause = () => new Promise((r) => setTimeout(r, 120));

/** Alur foto → analisis (segmentasi, kontur, lubang, potongan foto) dengan tahapan progres. */
export function useTrace() {
  const [state, setState] = useState<TraceState>({ status: "idle", step: 0 });
  const src = useRef<{ canvas: HTMLCanvasElement; preview: string; name: string } | null>(null);
  const runId = useRef(0);

  const run = useCallback(async (opts: AnalyzeOpts) => {
    const s = src.current;
    if (!s) return;
    const id = ++runId.current;
    setState({ status: "loading", step: 0, preview: s.preview, name: s.name });
    try {
      for (let step = 1; step <= 2; step++) {
        await pause();
        if (id !== runId.current) return;
        setState((p) => ({ ...p, step }));
      }
      await pause();
      const result = analyzeImage(s.canvas, opts);
      if (id !== runId.current) return;
      setState((p) => ({ ...p, step: 3 }));
      await pause();
      if (id !== runId.current) return;
      setState({ status: "success", step: 4, result, preview: s.preview, name: s.name });
    } catch (e) {
      if (id !== runId.current) return;
      setState({ status: "error", step: 0, preview: s.preview, name: s.name, error: e instanceof TraceError ? traceTip(e.code) : "Foto tidak bisa diproses. Coba foto lain dengan latar polos." });
    }
  }, []);

  const fromFile = useCallback(
    async (file: File, opts: AnalyzeOpts) => {
      if (!/^image\/(png|jpeg|svg\+xml|webp)$/.test(file.type)) {
        setState({ status: "error", step: 0, error: "Format belum didukung. Gunakan PNG, JPG, WEBP, atau SVG." });
        return;
      }
      if (file.size > 12 * 1024 * 1024) {
        setState({ status: "error", step: 0, error: "Berkas lebih dari 12 MB. Perkecil dulu fotonya." });
        return;
      }
      const url = URL.createObjectURL(file);
      try {
        const img = await loadImage(url);
        const k = Math.min(1, 900 / Math.max(img.naturalWidth || 512, img.naturalHeight || 512));
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round((img.naturalWidth || 512) * k));
        c.height = Math.max(1, Math.round((img.naturalHeight || 512) * k));
        c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
        src.current = { canvas: c, preview: c.toDataURL("image/jpeg", 0.85), name: file.name.replace(/\.[^.]+$/, "") };
      } catch {
        setState({ status: "error", step: 0, error: traceTip("unreadable") });
        return;
      } finally {
        URL.revokeObjectURL(url);
      }
      await run(opts);
    },
    [run],
  );

  const fromCanvas = useCallback(
    async (c: HTMLCanvasElement, name: string, opts: AnalyzeOpts) => {
      src.current = { canvas: c, preview: c.toDataURL("image/png"), name };
      await run(opts);
    },
    [run],
  );

  const reset = useCallback(() => {
    runId.current++;
    src.current = null;
    setState({ status: "idle", step: 0 });
  }, []);

  return { state, run, fromFile, fromCanvas, reset };
}

/**
 * Contoh "foto" bawaan: objek berwarna dengan detail, bayangan, dan latar bertekstur
 * sehingga melewati jalur segmentasi yang sama dengan foto sungguhan.
 */
export const SAMPLES: { id: string; label: string; emoji: string; draw: (g: CanvasRenderingContext2D) => void }[] = [
  {
    id: "mobil",
    label: "Mobil",
    emoji: "🚗",
    draw: (g) => {
      g.fillStyle = "#d8352a";
      g.beginPath();
      g.moveTo(40, 300);
      g.lineTo(40, 230);
      g.bezierCurveTo(60, 210, 110, 205, 150, 200);
      g.lineTo(210, 130);
      g.bezierCurveTo(240, 115, 360, 112, 395, 130);
      g.lineTo(460, 195);
      g.bezierCurveTo(520, 200, 560, 215, 570, 240);
      g.lineTo(570, 300);
      g.closePath();
      g.fill();
      g.fillStyle = "#bfe0f2";
      g.beginPath();
      g.moveTo(225, 140);
      g.lineTo(300, 138);
      g.lineTo(300, 198);
      g.lineTo(175, 200);
      g.closePath();
      g.moveTo(315, 138);
      g.lineTo(385, 140);
      g.lineTo(435, 196);
      g.lineTo(315, 198);
      g.closePath();
      g.fill();
      g.fillStyle = "#222";
      for (const x of [150, 460]) {
        g.beginPath();
        g.arc(x, 300, 46, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = "#bbb";
      for (const x of [150, 460]) {
        g.beginPath();
        g.arc(x, 300, 20, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = "#ffd25a";
      g.fillRect(548, 240, 18, 14);
    },
  },
  {
    id: "rumah",
    label: "Rumah",
    emoji: "🏠",
    draw: (g) => {
      g.fillStyle = "#e9c46a";
      g.fillRect(150, 210, 300, 190);
      g.fillStyle = "#9c3d1f";
      g.beginPath();
      g.moveTo(120, 220);
      g.lineTo(300, 70);
      g.lineTo(480, 220);
      g.closePath();
      g.fill();
      g.fillStyle = "#7a4b2a";
      g.fillRect(270, 290, 64, 110);
      g.fillStyle = "#cfe8f5";
      g.fillRect(180, 250, 60, 50);
      g.fillRect(360, 250, 60, 50);
      g.fillStyle = "#9c3d1f";
      g.fillRect(380, 100, 36, 80);
    },
  },
  {
    id: "kucing",
    label: "Kucing",
    emoji: "🐱",
    draw: (g) => {
      g.fillStyle = "#f2a541";
      g.beginPath();
      g.ellipse(300, 290, 150, 120, 0, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.moveTo(175, 230);
      g.lineTo(190, 90);
      g.lineTo(270, 180);
      g.closePath();
      g.moveTo(425, 230);
      g.lineTo(410, 90);
      g.lineTo(330, 180);
      g.closePath();
      g.fill();
      g.fillStyle = "#2d2a26";
      g.beginPath();
      g.ellipse(250, 270, 14, 22, 0, 0, Math.PI * 2);
      g.ellipse(350, 270, 14, 22, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#e86f6f";
      g.beginPath();
      g.moveTo(285, 315);
      g.lineTo(315, 315);
      g.lineTo(300, 332);
      g.closePath();
      g.fill();
    },
  },
  {
    id: "donat",
    label: "Donat (berlubang)",
    emoji: "🍩",
    draw: (g) => {
      g.fillStyle = "#c98a4b";
      g.beginPath();
      g.arc(300, 250, 170, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#ef7aa8";
      g.beginPath();
      g.arc(300, 245, 150, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#f6f1e7";
      g.beginPath();
      g.arc(300, 250, 62, 0, Math.PI * 2);
      g.fill();
      const cols = ["#fff", "#5bc0eb", "#fde74c", "#9bc53d"];
      for (let i = 0; i < 40; i++) {
        const a = (i / 40) * Math.PI * 2;
        const r = 95 + (i % 3) * 18;
        g.fillStyle = cols[i % 4];
        g.fillRect(300 + Math.cos(a) * r, 245 + Math.sin(a) * r, 10, 4);
      }
    },
  },
];

export function sampleCanvas(id: string) {
  const s = SAMPLES.find((x) => x.id === id) ?? SAMPLES[0];
  const c = document.createElement("canvas");
  c.width = 600;
  c.height = 460;
  const g = c.getContext("2d")!;
  // latar "foto": krem dengan noise halus dan bayangan lembut
  g.fillStyle = "#f6f1e7";
  g.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < 2500; i++) {
    g.fillStyle = `rgba(120,100,80,${Math.random() * 0.05})`;
    g.fillRect(Math.random() * c.width, Math.random() * c.height, 2, 2);
  }
  g.fillStyle = "rgba(60,40,20,0.12)";
  g.beginPath();
  g.ellipse(305, 420, 230, 22, 0, 0, Math.PI * 2);
  g.fill();
  s.draw(g);
  return c;
}
