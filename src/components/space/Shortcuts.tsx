"use client";
import { Dialog } from "@/components/ui/Dialog";

const ROWS: Array<[string, string]> = [
  ["Ctrl/⌘ + V", "Beam the clipboard into this Space"],
  ["C", "Copy the latest Drop"],
  ["J / K  or  ↓ / ↑", "Move between Drops"],
  ["Enter", "Copy the focused Drop"],
  ["D", "Download the focused Drop"],
  ["P", "Pin / unpin the focused Drop"],
  ["Delete", "Delete the focused Drop (5s to undo)"],
  ["/", "Focus the Dock"],
  ["Ctrl/⌘ + K", "Command palette"],
  ["Ctrl/⌘ + L", "Lock this Space"],
  ["Shift + C", "Toggle Calm mode"],
  ["?", "This cheat-sheet"],
];

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Keyboard shortcuts" className="max-w-lg">
      <dl className="space-y-2">
        {ROWS.map(([k, d]) => (
          <div key={k} className="flex items-center justify-between gap-4 text-sm">
            <dt><kbd className="font-mono-cargo rounded-md border border-line bg-hull px-2 py-1 text-xs">{k}</kbd></dt>
            <dd className="text-right text-moondust">{d}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs text-dim">Single-key shortcuts pause while you&apos;re typing in a field.</p>
    </Dialog>
  );
}
