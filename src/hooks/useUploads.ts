"use client";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { nameForPasted } from "@/lib/clipboard";
import type { DropDTO } from "@/lib/dto";
import { uploadFile, validateFile } from "@/lib/upload";
import { ApiRequestError } from "@/lib/api-client";

export interface UploadItem {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: "uploading" | "failed";
  error?: string;
  file: File;
  displayName: string;
}

export function useUploads(spaceId: string, onDrop: (d: DropDTO) => void) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const controllers = useRef(new Map<string, AbortController>());
  const patch = useCallback((id: string, p: Partial<UploadItem>) => setItems((cur) => cur.map((i) => (i.id === id ? { ...i, ...p } : i))), []);
  const remove = useCallback((id: string) => setItems((cur) => cur.filter((i) => i.id !== id)), []);

  const run = useCallback(
    async (item: UploadItem) => {
      const ac = new AbortController();
      controllers.current.set(item.id, ac);
      patch(item.id, { status: "uploading", progress: 0, error: undefined });
      try {
        const drop = await uploadFile(spaceId, item.file, item.displayName, {
          onProgress: (f) => patch(item.id, { progress: f }),
          onDrop,
          signal: ac.signal,
        });
        onDrop(drop);
        remove(item.id);
      } catch (e) {
        if ((e as DOMException)?.name === "AbortError") return remove(item.id);
        const msg = e instanceof ApiRequestError ? e.message : e instanceof Error ? e.message : "Upload failed.";
        patch(item.id, { status: "failed", error: msg });
      } finally {
        controllers.current.delete(item.id);
      }
    },
    [spaceId, onDrop, patch, remove],
  );

  const addFiles = useCallback(
    (files: File[], opts: { pasted?: boolean } = {}) => {
      files.forEach((file, i) => {
        const problem = validateFile(file);
        const displayName = opts.pasted ? nameForPasted(file, i) : file.name || "file";
        if (problem) return void toast.error(`${displayName}: ${problem}`);
        const item: UploadItem = { id: crypto.randomUUID(), name: displayName, displayName, size: file.size, progress: 0, status: "uploading", file };
        setItems((cur) => [...cur, item]);
        void run(item);
      });
    },
    [run],
  );

  return {
    items,
    addFiles,
    retry: (id: string) => {
      const it = items.find((i) => i.id === id);
      if (it) void run(it);
    },
    cancel: (id: string) => {
      controllers.current.get(id)?.abort();
      remove(id);
    },
  };
}
