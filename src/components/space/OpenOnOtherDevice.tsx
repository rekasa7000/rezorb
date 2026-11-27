"use client";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { copyText } from "@/lib/clipboard";

/**
 * Getting the second device into a Space is where new users stall: it has to find the site, sign in
 * and type the name. This hands over a link that does the first two. The PIN is never in the link;
 * the other device still has to know it.
 */
export function OpenOnOtherDevice({ open, onClose, spaceName }: { open: boolean; onClose: () => void; spaceName: string }) {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const url = `${origin}/spaces?space=${encodeURIComponent(spaceName)}`;

  return (
    <Dialog open={open} onClose={onClose} title="Open on another device">
      <div className="space-y-5">
        <div className="flex items-start gap-5">
          <div className="shrink-0 rounded-md bg-paper p-3" data-testid="other-device-qr">
            {origin ? <QRCodeSVG value={url} size={132} bgColor="#fffcf5" fgColor="#14101f" level="M" role="img" aria-label={`QR code for ${url}`} /> : <div className="size-[132px]" />}
          </div>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-moondust">
            <li>Scan this with the other device, or open the link below.</li>
            <li>Sign in with the same account.</li>
            <li>
              Enter this Space&apos;s <strong className="text-starlight">PIN</strong>. It is never part of the link.
            </li>
          </ol>
        </div>

        <div>
          <p className="fs-micro mb-2 text-moondust">Link</p>
          <div className="flex items-center gap-2">
            <code className="font-mono-cargo min-w-0 flex-1 truncate rounded-md border border-line bg-hull px-3 py-2 text-sm" data-testid="other-device-url" title={url}>
              {url}
            </code>
            <Button
              variant="secondary"
              size="md"
              onClick={async () => ((await copyText(url)) ? toast.success("Link copied.") : toast.error("Couldn't reach the clipboard."))}
              aria-label="Copy link"
            >
              <Copy size={16} aria-hidden /> Copy
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
