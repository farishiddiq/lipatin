"use client";

import { Slider as BaseSlider } from "@base-ui/react/slider";
import { cn } from "@/lib/utils";

interface Props {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  onCommit?: (v: number) => void;
  label: string;
  /** Sembunyikan label visual tetapi tetap terbaca pembaca layar. */
  hideLabel?: boolean;
  valueText?: string;
  className?: string;
  size?: "md" | "lg";
}

export function Slider({ value, min, max, step = 1, onChange, onCommit, label, hideLabel, valueText, className, size = "md" }: Props) {
  return (
    <BaseSlider.Root
      value={value}
      min={min}
      max={max}
      step={step}
      onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
      onValueCommitted={(v) => onCommit?.(Array.isArray(v) ? v[0] : v)}
      className={cn("flex flex-col gap-1.5", className)}
    >
      {!hideLabel && (
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <BaseSlider.Label className="font-medium text-stone-700">{label}</BaseSlider.Label>
          {valueText && <span className="text-stone-500 tabular-nums">{valueText}</span>}
        </div>
      )}
      <BaseSlider.Control className={cn("flex w-full touch-none items-center select-none", size === "lg" ? "py-3" : "py-1.5")}>
        <BaseSlider.Track className={cn("w-full rounded-full bg-stone-200 select-none", size === "lg" ? "h-2" : "h-1.5")}>
          <BaseSlider.Indicator className="rounded-full bg-orange-500 select-none" />
          <BaseSlider.Thumb
            aria-label={hideLabel ? label : undefined}
            getAriaValueText={valueText ? () => valueText : undefined}
            className={cn(
              "rounded-full border-2 border-orange-600 bg-white shadow-sm select-none has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-orange-600",
              size === "lg" ? "size-6" : "size-4",
            )}
          />
        </BaseSlider.Track>
      </BaseSlider.Control>
    </BaseSlider.Root>
  );
}
