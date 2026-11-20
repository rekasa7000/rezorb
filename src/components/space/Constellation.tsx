import { Laptop, Monitor, Smartphone, Tablet } from "lucide-react";
import type { PresenceDevice } from "@/hooks/useSpaceFeed";
import type { Connection } from "@/hooks/useSpaceFeed";

const ICONS = { laptop: Laptop, desktop: Monitor, phone: Smartphone, tablet: Tablet } as const;

function hue(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

/** Presence (DESIGN §9.5): overlapping device avatars; online ones get a rotating ion ring. */
export function Constellation({ devices, connection, meLabel }: { devices: PresenceDevice[]; connection: Connection; meLabel?: string }) {
  const online = devices.length;
  const text =
    connection === "live"
      ? `${online} device${online === 1 ? "" : "s"} in this Space: ${devices.map((d) => d.label + (d.self ? " (this one)" : "")).join(", ") || "just you"}`
      : "Live presence is unavailable. Updates arrive every few seconds.";
  return (
    <div className="flex items-center gap-2" role="group" aria-label={text} title={text}>
      <div className="flex -space-x-2">
        {devices.length === 0 && (
          <span className="grid size-8 place-items-center rounded-full border-2 border-void bg-hull text-moondust">
            <Laptop size={14} strokeWidth={1.75} aria-hidden />
          </span>
        )}
        {devices.slice(0, 5).map((d) => {
          const Icon = ICONS[d.kind as keyof typeof ICONS] ?? Laptop;
          return (
            <span key={d.id} className="relative grid size-8 place-items-center rounded-full border-2 border-void" style={{ background: `hsl(${hue(d.id)} 55% 38%)` }}>
              <span className="absolute -inset-[3px] rounded-full border-2 border-ion" aria-hidden />
              <Icon size={14} strokeWidth={1.75} className="relative text-white" aria-hidden />
            </span>
          );
        })}
      </div>
      <span className="fs-micro hidden text-moondust sm:inline" data-testid="presence-count">
        {connection === "live" ? (
          <>
            <span className="mr-1 inline-block size-2 rounded-full bg-ion align-middle" aria-hidden /> {online} here
          </>
        ) : (
          <>{meLabel ?? "Polling"}</>
        )}
      </span>
    </div>
  );
}
