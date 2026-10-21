"use client";

import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Option<T extends string> {
  value: T;
  label: ReactNode;
  ariaLabel?: string;
}

interface Props<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: Option<T>[];
  label: string;
  className?: string;
  size?: "sm" | "md";
}

/** Pilihan tunggal berbentuk tombol bersebelahan. */
export function Segmented<T extends string>({ value, onChange, options, label, className, size = "md" }: Props<T>) {
  return (
    <ToggleGroup
      aria-label={label}
      value={[value]}
      onValueChange={(v) => v[0] && onChange(v[0] as T)}
      className={cn("inline-flex rounded-lg bg-stone-200/70 p-0.5", className)}
    >
      {options.map((o) => (
        <Toggle
          key={o.value}
          value={o.value}
          aria-label={o.ariaLabel}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 font-medium whitespace-nowrap text-stone-600 select-none hover:text-stone-900 data-pressed:bg-white data-pressed:text-stone-900 data-pressed:shadow-sm [&_svg]:size-4",
            size === "sm" ? "h-7 text-xs" : "h-8 text-sm",
          )}
        >
          {o.label}
        </Toggle>
      ))}
    </ToggleGroup>
  );
}
