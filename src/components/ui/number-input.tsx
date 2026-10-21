"use client";

import { NumberField } from "@base-ui/react/number-field";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: number;
  onChange: (v: number) => void;
  onCommit?: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
  hideLabel?: boolean;
  suffix?: string;
  className?: string;
  decimals?: number;
}

export function NumberInput({ value, onChange, onCommit, min, max, step = 1, label, hideLabel, suffix, className, decimals = 2 }: Props) {
  return (
    <NumberField.Root
      value={value}
      min={min}
      max={max}
      step={step}
      format={{ maximumFractionDigits: decimals }}
      onValueChange={(v) => v !== null && onChange(v)}
      onValueCommitted={(v) => v !== null && onCommit?.(v)}
      className={cn("flex flex-col gap-1.5", className)}
    >
      <NumberField.ScrubArea className={cn("cursor-ew-resize text-sm font-medium text-stone-700", hideLabel && "sr-only")}>
        <label>{label}</label>
      </NumberField.ScrubArea>
      <NumberField.Group className="flex h-9 items-stretch overflow-hidden rounded-lg border border-stone-300 bg-white">
        <NumberField.Decrement aria-label={`Kurangi ${label}`} className="flex w-8 items-center justify-center text-stone-500 hover:bg-stone-100">
          <Minus className="size-3.5" aria-hidden />
        </NumberField.Decrement>
        <div className="flex min-w-0 flex-1 items-center">
          <NumberField.Input aria-label={hideLabel ? label : undefined} className="w-full min-w-0 bg-transparent px-1 text-center text-sm tabular-nums outline-none" />
          {suffix && <span className="pr-1 text-xs text-stone-500">{suffix}</span>}
        </div>
        <NumberField.Increment aria-label={`Tambah ${label}`} className="flex w-8 items-center justify-center text-stone-500 hover:bg-stone-100">
          <Plus className="size-3.5" aria-hidden />
        </NumberField.Increment>
      </NumberField.Group>
    </NumberField.Root>
  );
}
