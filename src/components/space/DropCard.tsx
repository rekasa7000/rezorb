"use client";
import { forwardRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Check, Clock, Download, Link2, Code2, Copy, FileIcon, ImageIcon, MoreHorizontal, Pin, PinOff, Trash2, Type } from "lucide-react";
import type { DropDTO } from "@/lib/dto";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import { BurnRing } from "./BurnRing";
import { FileBody, ImageBody, TextBody } from "./DropBody";
import { Button } from "@/components/ui/Button";
import { usePrefs } from "@/stores/prefs";
import type { Lifetime } from "@/lib/limits";

const KIND = {
  text: { label: "Text", icon: Type, color: "var(--moondust)" },
  code: { label: "Code", icon: Code2, color: "var(--ion)" },
  link: { label: "Link", icon: Link2, color: "var(--plasma)" },
  image: { label: "Img", icon: ImageIcon, color: "var(--nebula)" },
  file: { label: "File", icon: FileIcon, color: "var(--flare)" },
} as const;

export interface DropActions {
  copy: (d: DropDTO) => Promise<boolean>;
  download: (d: DropDTO) => void;
  pin: (d: DropDTO) => void;
  extend: (d: DropDTO, l: Lifetime) => void;
  remove: (d: DropDTO) => void;
  open: (d: DropDTO) => void;
}

export const DropCard = forwardRef<HTMLElement, { drop: DropDTO; actions: DropActions; float?: boolean; index?: number; arrived?: boolean; uploadProgress?: number }>(
  function DropCard({ drop, actions, float, index = 0, arrived, uploadProgress }, ref) {
    const [copied, setCopied] = useState(false);
    const [menu, setMenu] = useState(false);
    const reduce = useReducedMotion();
    const calm = usePrefs((s) => s.calm);
    const still = reduce || calm;
    const k = KIND[drop.kind];
    const paper = drop.kind === "text" || drop.kind === "code" || drop.kind === "link";
    const uploading = drop.status === "uploading";
    const isCopyable = drop.kind !== "file";
    const rot = float ? ((hash(drop.id) % 7) - 3) * 0.8 : 0;

    async function doCopy() {
      if (!(await actions.copy(drop))) return;
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }

    return (
      <motion.article
        ref={ref}
        layout={!still}
        data-drop-card
        data-drop-id={drop.id}
        data-testid="drop-card"
        tabIndex={0}
        aria-label={`${k.label} drop from ${drop.sourceDevice?.label ?? "this device"}, ${relativeTime(drop.createdAt)}`}
        initial={still ? false : { y: -40, scale: 0.9, rotate: -3, opacity: 0 }}
        animate={{ y: 0, scale: 1, rotate: rot, opacity: 1 }}
        exit={still ? { opacity: 0 } : { scale: 0.85, y: -30, opacity: 0, filter: "grayscale(1) brightness(1.2)" }}
        transition={still ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 28, mass: 0.9 }}
        className={cn(
          "cargo relative flex flex-col gap-3 p-4 outline-offset-4",
          paper ? "cargo-paper" : "cargo-hull",
          arrived && "anim-ring-pulse",
          float && "[animation:bob_7s_ease-in-out_infinite]",
        )}
        style={float ? { animationDelay: `${-(hash(drop.id) % 7)}s` } : undefined}
      >
        <header className={cn("space-y-1.5 text-xs", paper ? "text-ink/70" : "text-moondust")}>
          <div className="flex items-center gap-2">
            <span className="tag" style={{ background: k.color }}>
              <k.icon size={12} strokeWidth={2.25} aria-hidden /> {k.label}
            </span>
            {drop.kind === "code" && drop.language && drop.language !== "text" && (
              <span className="font-mono-cargo rounded bg-ink/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase">{drop.language}</span>
            )}
            <span className="ml-auto flex items-center gap-2">
              {drop.pinned && (
                <span className="tag" style={{ background: "var(--flare)" }} title="Pinned: kept for up to 7 days">
                  <Pin size={11} aria-hidden /> Pinned
                </span>
              )}
              <BurnRing createdAt={drop.createdAt} expiresAt={drop.expiresAt} />
            </span>
          </div>
          <p className="truncate">
            {relativeTime(drop.createdAt)} · {drop.sourceDevice?.label ?? "This device"}
          </p>
        </header>

        <div className="min-w-0">
          {(drop.kind === "text" || drop.kind === "code" || drop.kind === "link") && <TextBody drop={drop} />}
          {drop.kind === "image" && !uploading && <ImageBody drop={drop} onOpen={() => actions.open(drop)} />}
          {drop.kind === "image" && uploading && <FileBody drop={drop} />}
          {drop.kind === "file" && <FileBody drop={drop} />}
        </div>

        {uploading ? (
          <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((uploadProgress ?? 0) * 100)} className="h-2 overflow-hidden rounded-full bg-void/30">
            <div className="h-full bg-nebula transition-[width]" style={{ width: `${Math.round((uploadProgress ?? 0) * 100)}%` }} />
          </div>
        ) : (
          <footer className="flex items-center gap-2">
            {isCopyable ? (
              <Button
                size="md"
                onClick={doCopy}
                className={cn("flex-1 border-2 border-ink font-display uppercase", paper ? "bg-ink text-paper hover:bg-ink/90" : "bg-starlight text-void", copied && "!bg-aurora !text-void")}
                aria-live="polite"
                data-testid="copy-btn"
              >
                {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />} {copied ? "Copied" : "Copy"}
              </Button>
            ) : (
              <Button size="md" className="flex-1 border-2 border-void font-display uppercase" onClick={() => actions.download(drop)} data-testid="download-btn">
                <Download size={16} aria-hidden /> Download
              </Button>
            )}
            {drop.kind === "image" && (
              <Button size="md" variant="secondary" onClick={() => actions.download(drop)} aria-label="Download image" className={paper ? "" : ""}>
                <Download size={16} aria-hidden />
              </Button>
            )}
            <div className="relative">
              <Button size="md" variant="ghost" onClick={() => setMenu((m) => !m)} aria-label="More actions" aria-expanded={menu} className={paper ? "text-ink hover:bg-ink/10 hover:text-ink" : ""}>
                <MoreHorizontal size={18} aria-hidden />
              </Button>
              {menu && (
                <div role="menu" className="absolute bottom-full right-0 z-20 mb-2 w-52 overflow-hidden rounded-md border-2 border-void bg-abyss py-1 text-sm text-starlight shadow-[4px_4px_0_var(--void)]" onMouseLeave={() => setMenu(false)}>
                  <MenuItem onClick={() => (setMenu(false), actions.pin(drop))} icon={drop.pinned ? PinOff : Pin}>{drop.pinned ? "Unpin" : "Pin (keep up to 7d)"}</MenuItem>
                  {(["1h", "24h", "7d"] as const).map((l) => (
                    <MenuItem key={l} onClick={() => (setMenu(false), actions.extend(drop, l))} icon={Clock}>Keep for {l} from now</MenuItem>
                  ))}
                  <MenuItem onClick={() => (setMenu(false), actions.download(drop))} icon={Download}>Download</MenuItem>
                  <MenuItem danger onClick={() => (setMenu(false), actions.remove(drop))} icon={Trash2}>Delete</MenuItem>
                </div>
              )}
            </div>
          </footer>
        )}
      </motion.article>
    );
  },
);

function MenuItem({ children, onClick, icon: Icon, danger }: { children: React.ReactNode; onClick: () => void; icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>; danger?: boolean }) {
  return (
    <button role="menuitem" onClick={onClick} className={cn("flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-hull-2", danger && "text-redshift")}>
      <Icon size={15} aria-hidden /> {children}
    </button>
  );
}

function hash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}
