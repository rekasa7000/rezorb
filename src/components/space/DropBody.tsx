"use client";
import { memo, useEffect, useState } from "react";
import { File as FileIcon, FileArchive, FileText, Image as ImageIcon, Music, Video } from "lucide-react";
import type { DropDTO } from "@/lib/dto";
import { formatBytes, middleTruncate } from "@/lib/format";

const URL_SPLIT = /(https?:\/\/[^\s<>"']+)/g;

/** Plain-text rendering with safe http(s) linkification. Never HTML. */
export function Linkified({ text }: { text: string }) {
  const parts = text.split(URL_SPLIT);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <a key={i} href={p} target="_blank" rel="noopener noreferrer nofollow" className="underline decoration-plasma decoration-2 underline-offset-2 hover:decoration-nebula">
            {p}
          </a>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

const SHIKI_LANGS = new Set(["typescript", "javascript", "tsx", "python", "sql", "bash", "json", "html", "css", "go", "rust", "java", "c"]);

function useHighlighted(code: string, language?: string) {
  const [html, setHtml] = useState<string | null>(null);
  useEffect(() => {
    if (!language || !SHIKI_LANGS.has(language) || code.length > 20_000) return;
    let live = true;
    import("shiki")
      .then(({ codeToHtml }) => codeToHtml(code, { lang: language, theme: "github-light-high-contrast" }))
      .then((h) => live && setHtml(h))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [code, language]);
  return html;
}

const CLAMP_LINES = 12;

export const TextBody = memo(function TextBody({ drop }: { drop: DropDTO }) {
  const text = drop.text ?? "";
  const [open, setOpen] = useState(false);
  const html = useHighlighted(text, drop.kind === "code" ? drop.language : undefined);
  const lines = text.split("\n").length;
  const long = lines > CLAMP_LINES || text.length > 900;

  return (
    <div>
      {html ? (
        <div
          className={`font-mono-cargo text-[13px] leading-relaxed [&_pre]:!bg-transparent [&_pre]:whitespace-pre-wrap [&_pre]:break-words ${!open && long ? "max-h-[19rem] overflow-hidden" : ""}`}
          // Shiki escapes the source; this is its generated markup, not user HTML.
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre
          className={`font-mono-cargo whitespace-pre-wrap break-words text-[0.9375rem] leading-relaxed ${!open && long ? "max-h-[19rem] overflow-hidden" : ""}`}
          data-testid="drop-text"
        >
          <Linkified text={text} />
        </pre>
      )}
      {long && (
        <button onClick={() => setOpen((o) => !o)} className="mt-2 text-sm font-bold underline decoration-2 underline-offset-2">
          {open ? "Show less" : "Show all"}
        </button>
      )}
    </div>
  );
});

/** Picks the icon by file type. A component (not a lookup) so no component is created during render. */
function FileTypeIcon({ mime, name, ...props }: { mime?: string; name?: string; size?: number; strokeWidth?: number; className?: string; "aria-hidden"?: boolean }) {
  if (mime?.startsWith("image/")) return <ImageIcon {...props} />;
  if (mime?.startsWith("video/")) return <Video {...props} />;
  if (mime?.startsWith("audio/")) return <Music {...props} />;
  if (/zip|tar|gzip|rar|7z/.test(mime ?? "") || /\.(zip|tar|gz|rar|7z)$/i.test(name ?? "")) return <FileArchive {...props} />;
  if (mime?.startsWith("text/") || /pdf|word|document|sheet|presentation/.test(mime ?? "")) return <FileText {...props} />;
  return <FileIcon {...props} />;
}

export function FileBody({ drop }: { drop: DropDTO }) {
  return (
    <div className="flex items-center gap-4">
      <span className="grid size-14 shrink-0 place-items-center rounded-lg border border-line bg-hull-2">
        <FileTypeIcon mime={drop.mimeType} name={drop.fileName} size={28} strokeWidth={1.5} className="text-ion" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="truncate font-bold" title={drop.fileName}>
          {middleTruncate(drop.fileName ?? "file", 30)}
        </p>
        <p className="font-mono-cargo text-xs text-moondust">{formatBytes(drop.sizeBytes)}</p>
      </div>
    </div>
  );
}

export function ImageBody({ drop, onOpen }: { drop: DropDTO; onOpen: () => void }) {
  const src = drop.thumbUrl ?? `/api/drops/${drop.id}/download?inline=1`;
  return (
    <button onClick={onOpen} className="checker block w-full overflow-hidden rounded-md" aria-label={`Open ${drop.fileName ?? "image"}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={drop.fileName ?? "Image drop"} width={drop.width} height={drop.height} loading="lazy" className="mx-auto max-h-72 w-auto object-contain" />
    </button>
  );
}
