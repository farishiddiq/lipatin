"use client";

import { Toolbar } from "@base-ui/react/toolbar";
import { Circle, Hand, MousePointer2, Ruler, Spline, Square, Slash, Waypoints, PenTool, Scissors, Hash, Pointer, Tally2, type LucideIcon } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { LINE_ORDER, LINE_STYLES } from "@/lib/line-styles";
import { useEditor, type Tool } from "@/lib/store/editor";
import { cn } from "@/lib/utils";

interface ToolDef {
  id: Tool;
  label: string;
  key: string;
  icon: LucideIcon;
  advanced?: boolean;
}

const GROUPS: { label: string; tools: ToolDef[] }[] = [
  {
    label: "Navigasi",
    tools: [
      { id: "select", label: "Pilih", key: "V", icon: MousePointer2 },
      { id: "pan", label: "Geser kanvas", key: "H", icon: Hand },
    ],
  },
  {
    label: "Gambar",
    tools: [
      { id: "line", label: "Garis", key: "L", icon: Slash },
      { id: "polyline", label: "Polyline", key: "P", icon: Waypoints },
      { id: "rect", label: "Persegi", key: "R", icon: Square },
      { id: "circle", label: "Lingkaran", key: "C", icon: Circle },
      { id: "arc", label: "Busur", key: "A", icon: Spline },
      { id: "bezier", label: "Kurva bezier", key: "B", icon: PenTool, advanced: true },
    ],
  },
  {
    label: "Alat kardus",
    tools: [
      { id: "tab", label: "Tab lem otomatis", key: "T", icon: Hash },
      { id: "slot", label: "Slot sambungan", key: "S", icon: Tally2 },
      { id: "finger", label: "Lubang jari", key: "F", icon: Pointer },
      { id: "tear", label: "Sobekan (perforasi)", key: "G", icon: Scissors },
      { id: "measure", label: "Ukur jarak", key: "M", icon: Ruler },
    ],
  },
];

export const TOOL_KEYS: Record<string, Tool> = Object.fromEntries(GROUPS.flatMap((g) => g.tools.map((t) => [t.key.toLowerCase(), t.id])));
export const isAdvancedTool = (t: Tool) => GROUPS.some((g) => g.tools.some((x) => x.id === t && x.advanced));

export function StudioToolbar({ orientation = "vertical" }: { orientation?: "vertical" | "horizontal" }) {
  const tool = useEditor((s) => s.tool);
  const lineType = useEditor((s) => s.lineType);
  const easy = useEditor((s) => s.easy);
  const set = useEditor((s) => s.set);
  const vertical = orientation === "vertical";
  const drawing = ["line", "polyline", "rect", "circle", "arc", "bezier"].includes(tool);

  return (
    <Toolbar.Root
      orientation={orientation}
      aria-label="Alat"
      className={cn(
        "flex shrink-0 gap-1 border-stone-200 bg-white p-1.5",
        vertical ? "w-14 flex-col items-center overflow-y-auto border-r" : "w-full items-center overflow-x-auto border-b",
      )}
    >
      {GROUPS.map((g, gi) => (
        <Toolbar.Group key={g.label} aria-label={g.label} className={cn("flex gap-1", vertical ? "flex-col" : "flex-row")}>
          {gi > 0 && <Toolbar.Separator className={cn("bg-stone-200", vertical ? "mx-auto my-1 h-px w-8" : "mx-1 h-8 w-px")} />}
          {g.tools
            .filter((t) => !(easy && t.advanced))
            .map((t) => (
              <Tooltip key={t.id} side={vertical ? "right" : "bottom"} content={`${t.label} (${t.key})`}>
                <Toolbar.Button
                  aria-label={t.label}
                  aria-pressed={tool === t.id}
                  onClick={() => set({ tool: t.id })}
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-lg text-stone-600 hover:bg-stone-100 hover:text-stone-900",
                    tool === t.id && "bg-orange-100 text-orange-800 hover:bg-orange-100 hover:text-orange-800",
                  )}
                >
                  <t.icon className="size-5" strokeWidth={2.4} aria-hidden />
                </Toolbar.Button>
              </Tooltip>
            ))}
        </Toolbar.Group>
      ))}
      <Toolbar.Group aria-label="Jenis garis untuk alat gambar" className={cn("flex gap-1", vertical ? "mt-auto flex-col pt-2" : "ml-2 flex-row")}>
        {LINE_ORDER.map((lt) => {
          const st = LINE_STYLES[lt];
          return (
            <Tooltip key={lt} side={vertical ? "right" : "bottom"} content={`${st.label} — ${st.hint}`}>
              <Toolbar.Button
                aria-label={`Jenis garis: ${st.label}`}
                aria-pressed={lineType === lt}
                onClick={() => set({ lineType: lt })}
                className={cn(
                  "flex h-8 w-10 shrink-0 items-center justify-center rounded-md border-2 border-transparent hover:bg-stone-100",
                  lineType === lt && "border-stone-900",
                  !drawing && "opacity-60",
                )}
              >
                <svg width="26" height="6" aria-hidden>
                  <line x1="1" y1="3" x2="25" y2="3" stroke={st.cssVar} strokeWidth="2.4" strokeDasharray={st.dash?.map((d) => d * 0.9).join(" ")} strokeLinecap={lt === "perforation" ? "round" : "butt"} />
                </svg>
              </Toolbar.Button>
            </Tooltip>
          );
        })}
      </Toolbar.Group>
    </Toolbar.Root>
  );
}
