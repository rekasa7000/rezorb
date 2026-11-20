"use client";
import { useEffect, useState } from "react";
import { isEditable, readPaste } from "@/lib/clipboard";

/**
 * Page-wide paste (DESIGN §2: paste is the primary verb) and drag-and-drop.
 * - Ctrl/⌘+V anywhere beams the clipboard, unless focus is in another input.
 * - Inside the Dock, text pastes normally (press Enter to beam) but files still upload.
 */
export function usePasteAndDrop({
  enabled,
  dockEl,
  onText,
  onFiles,
}: {
  enabled: boolean;
  dockEl: React.RefObject<HTMLElement | null>;
  onText: (text: string) => void;
  onFiles: (files: File[], opts: { pasted: boolean }) => void;
}) {
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const onPaste = (e: ClipboardEvent) => {
      const { text, files } = readPaste(e);
      const inDock = e.target === dockEl.current;
      if (files.length) {
        e.preventDefault();
        onFiles(files, { pasted: true });
        return;
      }
      if (!text) return;
      if (isEditable(e.target) && !inDock) return; // someone is typing in a dialog/form
      if (inDock) return; // let the textarea take it
      e.preventDefault();
      onText(text);
    };

    let depth = 0;
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth++;
      setDragging(true);
    };
    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const onOver = (e: DragEvent) => hasFiles(e) && e.preventDefault();
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setDragging(false);
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length) onFiles(files, { pasted: false });
    };

    document.addEventListener("paste", onPaste);
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("dragover", onOver);
    window.addEventListener("drop", onDrop);
    return () => {
      document.removeEventListener("paste", onPaste);
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("drop", onDrop);
    };
  }, [enabled, dockEl, onText, onFiles]);

  return { dragging };
}
