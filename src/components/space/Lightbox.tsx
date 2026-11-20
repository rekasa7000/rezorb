"use client";
import { Download } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import type { DropDTO } from "@/lib/dto";

export function Lightbox({ drop, onClose, onDownload }: { drop: DropDTO | null; onClose: () => void; onDownload: (d: DropDTO) => void }) {
  return (
    <Dialog open={!!drop} onClose={onClose} title={drop?.fileName ?? "Image"} className="max-w-4xl">
      {drop && (
        <div className="space-y-4">
          <div className="checker grid place-items-center overflow-hidden rounded-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/drops/${drop.id}/download?inline=1`} alt={drop.fileName ?? "Image"} className="max-h-[70dvh] w-auto object-contain" />
          </div>
          <Button onClick={() => onDownload(drop)}>
            <Download size={16} /> Download
          </Button>
        </div>
      )}
    </Dialog>
  );
}
