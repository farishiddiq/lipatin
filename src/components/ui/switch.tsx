"use client";

import { Switch as BaseSwitch } from "@base-ui/react/switch";
import { useId } from "react";
import { cn } from "@/lib/utils";

interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  className?: string;
}

export function Switch({ checked, onChange, label, description, className }: Props) {
  const id = useId();
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <label htmlFor={id} className="flex flex-col gap-0.5 text-sm">
        <span className="font-medium text-stone-800">{label}</span>
        {description && (
          <span id={`${id}-d`} className="text-xs text-pretty text-stone-500">
            {description}
          </span>
        )}
      </label>
      <BaseSwitch.Root
        id={id}
        checked={checked}
        onCheckedChange={(v) => onChange(v)}
        aria-describedby={description ? `${id}-d` : undefined}
        className="relative flex h-6 w-10 shrink-0 rounded-full bg-stone-300 p-0.5 transition-colors duration-150 ease-out data-checked:bg-orange-600"
      >
        <BaseSwitch.Thumb className="size-5 rounded-full bg-white shadow-sm transition-transform duration-150 ease-out data-checked:translate-x-4" />
      </BaseSwitch.Root>
    </div>
  );
}
