import { api } from "./api-client";
import type { DropDTO } from "./dto";
import { LIMITS } from "./limits";

export interface StartUploadResponse {
  drop: DropDTO;
  upload:
    | { method: "single"; url: string; headers: Record<string, string> }
    | { method: "multipart"; uploadId: string; partSize: number; parts: Array<{ partNumber: number; url: string }> };
  thumbUpload?: { url: string; headers: Record<string, string> };
}

/** PUT with progress. XHR, because fetch can't report upload progress. */
export function putBlob(
  url: string,
  body: Blob,
  headers: Record<string, string>,
  onProgress: (loaded: number) => void,
  signal?: AbortSignal,
): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve(xhr.getResponseHeader("ETag")) : reject(new Error(`Upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.onabort = () => reject(new DOMException("Aborted", "AbortError"));
    signal?.addEventListener("abort", () => xhr.abort());
    xhr.send(body);
  });
}

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export async function inspectImage(file: File): Promise<{ width: number; height: number; thumb: Blob | null } | null> {
  if (!IMAGE_TYPES.has(file.type)) return null;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 480 / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
    const out = { width: bmp.width, height: bmp.height };
    bmp.close();
    const thumb = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", 0.8));
    return { ...out, thumb };
  } catch {
    return null;
  }
}

export interface UploadHandlers {
  onProgress: (fraction: number) => void;
  onDrop: (drop: DropDTO) => void;
  signal?: AbortSignal;
}

export async function uploadFile(spaceId: string, file: File, name: string, h: UploadHandlers): Promise<DropDTO> {
  const img = await inspectImage(file);
  const start = await api<StartUploadResponse>(`/api/spaces/${spaceId}/uploads`, {
    body: {
      fileName: name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      kind: img ? "image" : "file",
      width: img?.width,
      height: img?.height,
      withThumb: !!img?.thumb,
    },
  });
  h.onDrop(start.drop); // visible (as uploading) to this device right away

  const total = file.size + (img?.thumb?.size ?? 0);
  let done = 0;
  const report = (extra: number) => h.onProgress(Math.min(0.99, (done + extra) / Math.max(total, 1)));

  const parts: Array<{ partNumber: number; etag: string }> = [];
  if (start.upload.method === "single") {
    await putBlob(start.upload.url, file, start.upload.headers, report, h.signal);
    done += file.size;
  } else {
    const { partSize, parts: urls } = start.upload;
    const inflight = new Map<number, number>();
    const sum = () => [...inflight.values()].reduce((a, b) => a + b, 0);
    let next = 0;
    const worker = async () => {
      while (next < urls.length) {
        const p = urls[next++]!;
        const blob = file.slice((p.partNumber - 1) * partSize, p.partNumber * partSize);
        const etag = await putBlob(p.url, blob, {}, (l) => {
          inflight.set(p.partNumber, l);
          report(sum());
        }, h.signal);
        done += blob.size;
        inflight.delete(p.partNumber);
        if (!etag) throw new Error("Storage didn't return an ETag. Check the bucket's CORS ExposeHeaders.");
        parts.push({ partNumber: p.partNumber, etag });
      }
    };
    await Promise.all(Array.from({ length: Math.min(3, urls.length) }, worker));
  }

  let thumbBytes: number | undefined;
  if (img?.thumb && start.thumbUpload) {
    try {
      await putBlob(start.thumbUpload.url, img.thumb, start.thumbUpload.headers, () => {}, h.signal);
      thumbBytes = img.thumb.size;
    } catch {
      /* the original is what matters */
    }
  }
  const { drop } = await api<{ drop: DropDTO }>(`/api/drops/${start.drop.id}/complete`, {
    body: { parts: parts.length ? parts : undefined, thumbBytes },
  });
  h.onProgress(1);
  return drop;
}

export function validateFile(file: File): string | null {
  if (file.size === 0) return "That file is empty.";
  if (file.size > LIMITS.maxFileBytes) return "Files can be up to 50 MB.";
  return null;
}
