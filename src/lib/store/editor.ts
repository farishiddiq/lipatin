"use client";

import { create } from "zustand";
import type { LineType, Vec2 } from "../geometry/types";
import type { ProjectData } from "../project";
import type { Unit } from "../units";

export type Tool =
  | "select"
  | "pan"
  | "line"
  | "polyline"
  | "rect"
  | "circle"
  | "arc"
  | "bezier"
  | "tab"
  | "slot"
  | "finger"
  | "tear"
  | "measure";

export type Selection =
  | { kind: "panel"; id: string }
  | { kind: "edge"; panelId: string; edge: number; a: Vec2; b: Vec2 }
  | { kind: "hinge"; id: string }
  | { kind: "sketch"; id: string }
  | null;

interface EditorState {
  projectId: string | null;
  data: ProjectData | null;
  past: ProjectData[];
  future: ProjectData[];
  lastKey: string | null;
  lastAt: number;
  dirtyAt: number;

  tool: Tool;
  lineType: LineType;
  selection: Selection;
  hover: Selection;
  fold: number;
  playing: boolean;
  easy: boolean;
  unit: Unit;
  grid: boolean;
  snap: boolean;
  showSeams: boolean;
  showLabels: boolean;
  slotLength: number;

  load: (id: string, data: ProjectData) => void;
  commit: (fn: (d: ProjectData) => ProjectData, key?: string) => void;
  undo: () => void;
  redo: () => void;
  set: (patch: Partial<Pick<EditorState, "tool" | "lineType" | "selection" | "hover" | "fold" | "playing" | "easy" | "unit" | "grid" | "snap" | "showSeams" | "showLabels" | "slotLength">>) => void;
}

const HISTORY = 200;

export const useEditor = create<EditorState>()((set, get) => ({
  projectId: null,
  data: null,
  past: [],
  future: [],
  lastKey: null,
  lastAt: 0,
  dirtyAt: 0,

  tool: "select",
  lineType: "cut",
  selection: null,
  hover: null,
  fold: 0.85,
  playing: false,
  easy: true,
  unit: "mm",
  grid: true,
  snap: true,
  showSeams: true,
  showLabels: false,
  slotLength: 30,

  load: (id, data) => set({ projectId: id, data, past: [], future: [], selection: null, hover: null, lastKey: null, dirtyAt: 0 }),

  commit: (fn, key) => {
    const { data, past, lastKey, lastAt } = get();
    if (!data) return;
    const next = fn(data);
    if (next === data) return;
    const now = Date.now();
    // perubahan beruntun dengan kunci sama (mis. menggeser slider) digabung jadi satu langkah undo
    const coalesce = key && key === lastKey && now - lastAt < 1200;
    set({
      data: next,
      past: coalesce ? past : [...past, data].slice(-HISTORY),
      future: [],
      lastKey: key ?? null,
      lastAt: now,
      dirtyAt: now,
    });
  },

  undo: () => {
    const { past, data, future } = get();
    if (!past.length || !data) return;
    set({ data: past[past.length - 1], past: past.slice(0, -1), future: [data, ...future], lastKey: null, dirtyAt: Date.now(), selection: null });
  },

  redo: () => {
    const { past, data, future } = get();
    if (!future.length || !data) return;
    set({ data: future[0], past: [...past, data], future: future.slice(1), lastKey: null, dirtyAt: Date.now(), selection: null });
  },

  set: (patch) => set(patch),
}));
