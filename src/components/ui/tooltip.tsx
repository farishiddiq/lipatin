"use client";

import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import type { ReactElement, ReactNode } from "react";

export function TooltipProvider({ children }: { children: ReactNode }) {
  return <BaseTooltip.Provider delay={350}>{children}</BaseTooltip.Provider>;
}

interface Props {
  content: ReactNode;
  children: ReactElement<Record<string, unknown>>;
  side?: "top" | "bottom" | "left" | "right";
}

/** Tooltip hanya pelengkap: pemicunya wajib sudah punya nama aksesibel sendiri. */
export function Tooltip({ content, children, side = "right" }: Props) {
  return (
    <BaseTooltip.Root>
      <BaseTooltip.Trigger render={children} />
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner side={side} sideOffset={8} className="z-50">
          <BaseTooltip.Popup className="origin-[var(--transform-origin)] rounded-md bg-stone-900 px-2 py-1 text-xs font-medium text-stone-50 shadow-md transition-[scale,opacity] duration-100 ease-out data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            {content}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}
