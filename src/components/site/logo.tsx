import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden>
      <rect width="32" height="32" rx="8" className="fill-orange-600" />
      <path d="M16 6.5 25 11v10l-9 4.5L7 21V11z" fill="#fde7c8" />
      <path d="M16 15.5 25 11v10l-9 4.5z" fill="#e9b47c" />
      <path d="M16 15.5 7 11v10l9 4.5z" fill="#f6cf9f" />
      <path d="M16 6.5 25 11l-9 4.5L7 11z" fill="#fff4e4" />
      <path d="M16 15.5v10" stroke="#9a3412" strokeWidth="1.2" strokeDasharray="2 1.4" />
      <path d="M7 11l9 4.5 9-4.5" stroke="#9a3412" strokeWidth="1.2" strokeDasharray="2 1.4" fill="none" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-extrabold text-stone-900", className)}>
      <LogoMark />
      <span className="text-lg">Lipatin</span>
    </span>
  );
}
