import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
export type ButtonSize = "sm" | "md" | "lg" | "icon" | "icon-sm";

const base =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-semibold whitespace-nowrap select-none transition-colors duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:shrink-0";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-orange-600 text-white hover:bg-orange-700 active:bg-orange-800",
  secondary:
    "bg-stone-900 text-stone-50 hover:bg-stone-800 active:bg-stone-700",
  outline:
    "border border-stone-300 bg-white text-stone-900 hover:bg-stone-100 active:bg-stone-200",
  ghost: "text-stone-700 hover:bg-stone-200/70 active:bg-stone-300/70",
  danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm [&_svg]:size-4",
  md: "h-10 px-4 text-sm [&_svg]:size-4",
  lg: "h-12 px-6 text-base [&_svg]:size-5",
  icon: "size-10 [&_svg]:size-5",
  "icon-sm": "size-8 [&_svg]:size-4",
};

export function buttonClass(variant: ButtonVariant = "outline", size: ButtonSize = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = "outline", size = "md", className, type = "button", ...props }, ref) {
  return <button ref={ref} type={type} className={buttonClass(variant, size, className)} {...props} />;
});
