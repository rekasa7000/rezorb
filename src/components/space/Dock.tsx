"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/format";
import type { UploadItem } from "@/hooks/useUploads";
import { usePrefs } from "@/stores/prefs";

const DESKTOP_PLACEHOLDERS = ["Paste anything (Ctrl+V)…", "Drop a file…", "Type a note to your other device…"];
const TOUCH_PLACEHOLDERS = ["Type or paste a note…", "Attach a photo or file…"];

/** The Dock (DESIGN §9.3): sticky input that is also the page-wide paste/drop target's visible label. */
export function Dock({
  onBeamText,
  onFiles,
  uploads,
  onRetry,
  onCancel,
  textareaRef,
  busy,
}: {
  onBeamText: (text: string) => void;
  onFiles: (files: File[]) => void;
  uploads: UploadItem[];
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  busy?: boolean;
}) {
  const [text, setText] = useState("");
  const [ph, setPh] = useState(0);
  const [flash, setFlash] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const calm = usePrefs((s) => s.calm);
  const [touch, setTouch] = useState(false);
  useEffect(() => setTouch(window.matchMedia("(pointer: coarse)").matches), []);
  const PLACEHOLDERS = touch ? TOUCH_PLACEHOLDERS : DESKTOP_PLACEHOLDERS;

  useEffect(() => {
    if (calm) return;
    const id = setInterval(() => setPh((p) => p + 1), 4000);
    return () => clearInterval(id);
  }, [calm]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 8 * 24 + 24)}px`;
  }, [text, textareaRef]);

  function beam() {
    const t = text.trim() ? text : "";
    if (!t) return;
    onBeamText(t);
    setText("");
    setFlash(true);
    setTimeout(() => setFlash(false), 400);
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
      <div className="pointer-events-auto mx-auto max-w-4xl space-y-2">
        {uploads.length > 0 && (
          <ul className="panel !bg-abyss space-y-2 p-3" aria-label="Uploads">
            {uploads.map((u) => (
              <li key={u.id} className="flex items-center gap-3 text-sm">
                <span className="min-w-0 flex-1 truncate">{u.name}</span>
                <span className="font-mono-cargo text-xs text-moondust">{formatBytes(u.size)}</span>
                {u.status === "failed" ? (
                  <>
                    <span role="alert" className="text-xs text-redshift">{u.error}</span>
                    <Button size="sm" variant="secondary" onClick={() => onRetry(u.id)}>Retry</Button>
                  </>
                ) : (
                  <div className="h-2 w-28 overflow-hidden rounded-full bg-hull-2" role="progressbar" aria-valuenow={Math.round(u.progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`Uploading ${u.name}`}>
                    <div className="h-full bg-nebula transition-[width]" style={{ width: `${u.progress * 100}%` }} />
                  </div>
                )}
                <button onClick={() => onCancel(u.id)} aria-label={`Cancel ${u.name}`} className="text-moondust hover:text-starlight">
                  <X size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className={cn("panel !bg-abyss flex items-end gap-2 border-2 !border-line p-2 transition-shadow focus-within:!border-nebula focus-within:shadow-[0_0_0_4px_color-mix(in_srgb,var(--nebula)_20%,transparent)]", flash && "shadow-[0_0_0_3px_var(--nebula)]")}>
          <input ref={fileRef} type="file" multiple hidden onChange={(e) => (onFiles(Array.from(e.target.files ?? [])), (e.target.value = ""))} data-testid="file-input" />
          <Button variant="ghost" size="icon" onClick={() => fileRef.current?.click()} aria-label="Attach files or photos">
            <Paperclip size={20} strokeWidth={1.75} />
          </Button>
          <textarea
            ref={textareaRef}
            value={text}
            rows={1}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                beam();
              }
            }}
            placeholder={PLACEHOLDERS[calm ? 0 : ph % PLACEHOLDERS.length]}
            aria-label="Beam text into this Space"
            data-testid="dock-input"
            className="max-h-52 min-h-11 flex-1 resize-none bg-transparent px-2 py-2.5 leading-6 text-starlight placeholder:text-dim focus:outline-none focus-visible:outline-none"
          />
          <Button onClick={beam} disabled={!text.trim() || busy} size="lg" className="shrink-0" data-testid="beam-btn">
            Beam <ArrowUp size={18} aria-hidden />
          </Button>
        </div>
        <p className="sr-only" aria-live="polite">{flash ? "Beamed" : ""}</p>
      </div>
    </div>
  );
}
