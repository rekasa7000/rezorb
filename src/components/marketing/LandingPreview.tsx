"use client";
import { useEffect, useMemo, useState } from "react";
import { DropCard, type DropActions } from "@/components/space/DropCard";
import { copyText } from "@/lib/clipboard";
import type { DropDTO } from "@/lib/dto";
import { LIFETIME_MS } from "@/lib/limits";
import { toast } from "sonner";

const HOUR = 3_600_000;

/** Example content only. Nothing here is sent anywhere; the cards work locally so the product can be tried. */
function samples(now: number): DropDTO[] {
  const mk = (id: string, minsAgo: number, device: string, kind: DropDTO["kind"], extra: Partial<DropDTO>): DropDTO => {
    const createdAt = new Date(now - minsAgo * 60_000);
    return {
      id,
      spaceId: "example",
      kind,
      status: "ready",
      sizeBytes: 0,
      sourceDevice: { id: device, label: device, kind: "laptop" },
      pinned: false,
      createdAt: createdAt.toISOString(),
      expiresAt: new Date(createdAt.getTime() + LIFETIME_MS["24h"]).toISOString(),
      ...extra,
    };
  };
  return [
    mk("ex-3", 1, "Personal laptop", "text", {
      text: "Use Array.prototype.flatMap here. It maps and flattens in one pass, so you can drop the extra .filter(Boolean).",
    }),
    mk("ex-2", 4, "Phone", "link", { text: "https://example.com/reports/q3-summary" }),
    mk("ex-1", 9, "Personal laptop", "code", {
      language: "typescript",
      text: "const ids = items.flatMap((i) => (i.active ? [i.id] : []));",
    }),
  ];
}

export function LandingPreview() {
  const [drops, setDrops] = useState<DropDTO[] | null>(null);
  useEffect(() => setDrops(samples(Date.now())), []);

  const actions: DropActions = useMemo(
    () => ({
      copy: async (d) => {
        const ok = await copyText(d.text ?? "");
        toast[ok ? "success" : "error"](ok ? "Copied. Go paste it." : "Couldn't reach the clipboard.");
        return ok;
      },
      download: () => {},
      open: () => {},
      pin: (d) => setDrops((cur) => cur?.map((x) => (x.id === d.id ? { ...x, pinned: !x.pinned, expiresAt: new Date(new Date(x.createdAt).getTime() + (x.pinned ? HOUR * 24 : HOUR * 24 * 7)).toISOString() } : x)) ?? cur),
      extend: (d, l) => setDrops((cur) => cur?.map((x) => (x.id === d.id ? { ...x, expiresAt: new Date(Date.now() + LIFETIME_MS[l]).toISOString() } : x)) ?? cur),
      remove: (d) => setDrops((cur) => cur?.filter((x) => x.id !== d.id) ?? cur),
    }),
    [],
  );

  return (
    <div data-accent="nebula" className="min-h-[19rem]">
      {drops && (
        <div className="grid items-start gap-6 md:grid-cols-3" role="group" aria-label="Example Drops">
          {drops.map((d) => (
            <DropCard key={d.id} drop={d} actions={actions} />
          ))}
        </div>
      )}
    </div>
  );
}
