/** Clipboard helpers. Everything here must be called from a user gesture. */

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers / insecure contexts.
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

async function toPng(blob: Blob): Promise<Blob> {
  if (blob.type === "image/png") return blob;
  const bmp = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0);
  bmp.close();
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("png"))), "image/png"));
}

/** Copies an image as an image. Returns false where unsupported so callers can fall back to Download. */
export async function copyImageFromUrl(url: string): Promise<boolean> {
  try {
    if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) return false;
    // Safari needs the promise handed to ClipboardItem synchronously within the gesture.
    const pngPromise = fetch(url, { credentials: "same-origin" })
      .then((r) => {
        if (!r.ok) throw new Error("fetch");
        return r.blob();
      })
      .then(toPng);
    await navigator.clipboard.write([new ClipboardItem({ "image/png": pngPromise })]);
    return true;
  } catch {
    return false;
  }
}

export interface PastePayload {
  text: string;
  files: File[];
}

export function readPaste(e: ClipboardEvent): PastePayload {
  const files: File[] = [];
  for (const item of Array.from(e.clipboardData?.items ?? [])) {
    if (item.kind === "file") {
      const f = item.getAsFile();
      if (f) files.push(f);
    }
  }
  return { text: e.clipboardData?.getData("text/plain") ?? "", files };
}

export function isEditable(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT";
}

/** Pasted screenshots arrive as "image.png"; give them a human name. */
export function nameForPasted(f: File, index: number): string {
  if (f.name && f.name !== "image.png" && f.name !== "image.jpeg") return f.name;
  const ext = f.type.split("/")[1]?.replace("jpeg", "jpg") ?? "bin";
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `Screenshot ${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}.${pad(d.getMinutes())}.${pad(d.getSeconds())}${index ? ` (${index + 1})` : ""}.${ext}`;
}
