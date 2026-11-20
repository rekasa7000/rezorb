"use client";
import { Command } from "cmdk";
import { useEffect } from "react";
import { cn } from "@/lib/cn";

export interface PaletteAction {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
}

export function CommandPalette({ open, onClose, actions }: { open: boolean; onClose: () => void; actions: PaletteAction[] }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-start justify-items-center p-4 pt-[15vh]">
      <div className="absolute inset-0 bg-void/80 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <Command label="Command palette" className="panel relative w-full max-w-lg overflow-hidden">
        <Command.Input autoFocus placeholder="Do something…" className="h-14 w-full border-b border-line bg-transparent px-5 text-lg text-starlight placeholder:text-dim focus:outline-none" />
        <Command.List className="scroll-thin max-h-80 overflow-auto p-2">
          <Command.Empty className="px-4 py-6 text-center text-sm text-moondust">Nothing like that.</Command.Empty>
          {actions.map((a) => (
            <Command.Item key={a.id} value={a.label} onSelect={() => (onClose(), a.run())} className={cn("flex cursor-pointer items-center justify-between rounded-xl px-4 py-3 text-sm aria-selected:bg-hull-2")}>
              {a.label}
              {a.hint && <kbd className="font-mono-cargo rounded bg-hull px-1.5 py-0.5 text-[11px] text-moondust">{a.hint}</kbd>}
            </Command.Item>
          ))}
        </Command.List>
      </Command>
    </div>
  );
}
