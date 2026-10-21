"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { buttonClass } from "./button";

const backdrop = "fixed inset-0 z-40 min-h-dvh bg-stone-950/40 transition-opacity duration-150 ease-out data-ending-style:opacity-0 data-starting-style:opacity-0";
const popup =
  "fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-2xl border border-stone-200 bg-white p-6 text-stone-900 shadow-xl transition-[scale,opacity] duration-150 ease-out data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function Dialog({ open, onOpenChange, title, description, children, className }: DialogProps) {
  return (
    <BaseDialog.Root open={open} onOpenChange={(o) => onOpenChange(o)}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className={backdrop} />
        <BaseDialog.Popup className={cn(popup, className)}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <BaseDialog.Title className="text-lg font-bold text-balance">{title}</BaseDialog.Title>
              {description && <BaseDialog.Description className="text-sm text-pretty text-stone-600">{description}</BaseDialog.Description>}
            </div>
            <BaseDialog.Close aria-label="Tutup" className={buttonClass("ghost", "icon-sm", "-mt-1 -mr-2")}>
              <X aria-hidden />
            </BaseDialog.Close>
          </div>
          {children}
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}

interface ConfirmProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
}

/** Konfirmasi untuk aksi merusak/tidak bisa dibatalkan. */
export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, onConfirm }: ConfirmProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={(o) => onOpenChange(o)}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className={backdrop} />
        <AlertDialog.Popup className={cn(popup, "w-[min(26rem,calc(100vw-2rem))]")}>
          <div className="flex flex-col gap-1">
            <AlertDialog.Title className="text-lg font-bold text-balance">{title}</AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-pretty text-stone-600">{description}</AlertDialog.Description>
          </div>
          <div className="flex justify-end gap-2">
            <AlertDialog.Close className={buttonClass("outline", "md")}>Batal</AlertDialog.Close>
            <AlertDialog.Close
              className={buttonClass("danger", "md")}
              onClick={() => {
                onConfirm();
              }}
            >
              {confirmLabel}
            </AlertDialog.Close>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
