"use client";

import { Select as BaseSelect } from "@base-ui/react/select";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  label: string;
  hideLabel?: boolean;
  className?: string;
  size?: "sm" | "md";
}

export function Select({ value, onChange, options, label, hideLabel, className, size = "md" }: Props) {
  return (
    <BaseSelect.Root items={options} value={value} onValueChange={(v) => v !== null && onChange(String(v))}>
      <div className={cn("flex flex-col gap-1.5", className)}>
        <BaseSelect.Label className={cn("text-sm font-medium text-stone-700", hideLabel && "sr-only")}>{label}</BaseSelect.Label>
        <BaseSelect.Trigger
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-lg border border-stone-300 bg-white pr-2 pl-3 text-left text-sm text-stone-900 select-none hover:bg-stone-50 data-popup-open:bg-stone-50",
            size === "sm" ? "h-8" : "h-10",
          )}
        >
          <BaseSelect.Value className="truncate" />
          <BaseSelect.Icon className="text-stone-500">
            <ChevronsUpDown className="size-4" aria-hidden />
          </BaseSelect.Icon>
        </BaseSelect.Trigger>
      </div>
      <BaseSelect.Portal>
        <BaseSelect.Positioner className="z-50 outline-hidden select-none" sideOffset={4} alignItemWithTrigger={false}>
          <BaseSelect.Popup className="min-w-[var(--anchor-width)] origin-[var(--transform-origin)] rounded-lg border border-stone-200 bg-white p-1 text-stone-900 shadow-lg transition-[scale,opacity] duration-100 ease-out data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            <BaseSelect.List className="max-h-[min(var(--available-height),20rem)] overflow-y-auto">
              {options.map((o) => (
                <BaseSelect.Item
                  key={o.value}
                  value={o.value}
                  className="grid cursor-default grid-cols-[1rem_1fr] items-center gap-2 rounded-md py-2 pr-4 pl-2 text-sm outline-hidden select-none data-highlighted:bg-orange-50 data-highlighted:text-orange-900"
                >
                  <BaseSelect.ItemIndicator className="col-start-1">
                    <Check className="size-4" aria-hidden />
                  </BaseSelect.ItemIndicator>
                  <BaseSelect.ItemText className="col-start-2">{o.label}</BaseSelect.ItemText>
                </BaseSelect.Item>
              ))}
            </BaseSelect.List>
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
}
