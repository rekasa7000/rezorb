"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiRequestError } from "@/lib/api-client";
import type { DropDTO, SpaceDTO } from "@/lib/dto";
import { removeDrops, upsertDrop } from "@/lib/drop-cache";

export interface PresenceDevice {
  id: string;
  label: string;
  kind: string;
  self: boolean;
}

interface TokenResponse {
  mode: "poll" | "ably";
  tokenRequest?: unknown;
  spaceIds?: string[];
  userChannel?: string;
  device?: { id: string; label: string; kind: string };
}

export type Connection = "live" | "connecting" | "polling";

interface Opts {
  spaceId: string;
  onRelocked: () => void;
  onDeleted: () => void;
  onSpaceUpdated: (s: Pick<SpaceDTO, "name" | "accent" | "defaultLifetime">) => void;
  onSealed: (until: string) => void;
  onArrived: (drop: DropDTO) => void;
  onDeviceRevoked: () => void;
}

export const dropsKey = (spaceId: string) => ["drops", spaceId] as const;

/** The live feed of a Space: initial list, realtime events, presence, and a polling fallback. */
export function useSpaceFeed(initial: DropDTO[], opts: Opts) {
  const { spaceId } = opts;
  const qc = useQueryClient();
  const [connection, setConnection] = useState<Connection>("connecting");
  const [presence, setPresence] = useState<PresenceDevice[]>([]);
  const [me, setMe] = useState<{ id: string; label: string; kind: string } | null>(null);
  const handlers = useRef(opts);
  useEffect(() => {
    handlers.current = opts;
  });
  const seen = useRef(new Set(initial.map((d) => d.id)));

  const query = useQuery({
    queryKey: dropsKey(spaceId),
    queryFn: async () => {
      try {
        return (await api<{ drops: DropDTO[] }>(`/api/spaces/${spaceId}/drops?limit=100`)).drops;
      } catch (e) {
        // Polling is how a device learns it lost access when realtime isn't connected.
        if (e instanceof ApiRequestError) {
          if (e.code === "SPACE_LOCKED") handlers.current.onRelocked();
          else if (e.status === 401) handlers.current.onDeviceRevoked();
          else if (e.status === 404) handlers.current.onDeleted();
        }
        throw e;
      }
    },
    initialData: initial,
    staleTime: 0,
    retry: false,
    // Poll only when realtime isn't carrying us; stop once access is gone.
    refetchInterval: (q) => (q.state.status === "error" ? false : connection === "live" ? false : 2500),
    refetchIntervalInBackground: false,
  });

  const upsert = useCallback(
    (drop: DropDTO, clientId?: string) => {
      qc.setQueryData<DropDTO[]>(dropsKey(spaceId), (prev) => upsertDrop(prev ?? [], drop, clientId));
    },
    [qc, spaceId],
  );

  // Announce arrivals from other devices (from either realtime or polling).
  useEffect(() => {
    for (const d of query.data ?? []) {
      if (seen.current.has(d.id)) continue;
      seen.current.add(d.id);
      if (d.status === "ready" && !d.id.startsWith("tmp_") && d.sourceDevice && d.sourceDevice.id !== me?.id && me) handlers.current.onArrived(d);
    }
  }, [query.data, me]);

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    let slowTimer: ReturnType<typeof setTimeout> | undefined;

    (async () => {
      let token: TokenResponse;
      try {
        token = await api<TokenResponse>("/api/realtime/token", { body: {} });
      } catch {
        if (!cancelled) setConnection("polling");
        return;
      }
      if (cancelled) return;
      if (token.device) setMe(token.device);
      if (token.mode !== "ably") return setConnection("polling");

      const Ably = await import("ably");
      if (cancelled) return;
      const client = new Ably.Realtime({
        authCallback: async (_params, cb) => {
          try {
            const t = await api<TokenResponse>("/api/realtime/token", { body: {} });
            cb(null, t.tokenRequest as never);
          } catch (e) {
            cb(e instanceof Error ? e.message : "token request failed", null);
          }
        },
      });
      const armSlow = () => {
        clearTimeout(slowTimer);
        slowTimer = setTimeout(() => !cancelled && setConnection("polling"), 10_000);
      };
      client.connection.on((c) => {
        if (c.current === "connected") {
          clearTimeout(slowTimer);
          setConnection("live");
          void qc.invalidateQueries({ queryKey: dropsKey(spaceId) }); // catch up after a gap
        } else if (["disconnected", "suspended", "failed"].includes(c.current)) armSlow();
      });

      const channel = client.channels.get(`space:${spaceId}`);
      const refreshPresence = async () => {
        const members = await channel.presence.get();
        if (cancelled) return;
        const byId = new Map<string, PresenceDevice>();
        for (const m of members) {
          const d = m.data as { label?: string; kind?: string } | undefined;
          byId.set(m.clientId, { id: m.clientId, label: d?.label ?? "Device", kind: d?.kind ?? "unknown", self: m.clientId === token.device?.id });
        }
        setPresence([...byId.values()]);
      };
      channel.subscribe((msg) => {
        const h = handlers.current;
        const data = msg.data as never as Record<string, any>;
        switch (msg.name) {
          case "drop.created": {
            const drop = data.drop as DropDTO;
            if (drop.textOmitted) void api<{ drops: DropDTO[] }>(`/api/spaces/${spaceId}/drops?limit=5`).then((r) => r.drops.forEach((d) => upsert(d)));
            else upsert(drop, data.clientId);
            break;
          }
          case "drop.updated":
            upsert(data.drop as DropDTO);
            break;
          case "drop.burned":
            qc.setQueryData<DropDTO[]>(dropsKey(spaceId), (prev) => removeDrops(prev ?? [], data.ids as string[]));
            break;
          case "space.updated":
            h.onSpaceUpdated(data.space);
            break;
          case "space.relocked":
            // The device that changed the PIN keeps its grant; everyone else is locked out.
            if (data.byDeviceId !== token.device?.id) h.onRelocked();
            break;
          case "space.deleted":
            h.onDeleted();
            break;
          case "space.sealed":
            h.onSealed(data.until as string);
            break;
        }
      });
      channel.presence.subscribe(() => void refreshPresence());
      await channel.presence.enter({ label: token.device?.label, kind: token.device?.kind });
      void refreshPresence();

      if (token.userChannel) {
        client.channels.get(token.userChannel).subscribe("device.revoked", (msg) => {
          if ((msg.data as { deviceId?: string })?.deviceId === token.device?.id) handlers.current.onDeviceRevoked();
        });
      }
      cleanup = () => {
        try {
          void channel.presence.leave();
        } catch {
          /* closing */
        }
        client.close();
      };
    })();

    return () => {
      cancelled = true;
      clearTimeout(slowTimer);
      cleanup?.();
    };
  }, [spaceId, qc, upsert]);

  return { drops: query.data ?? [], connection, presence, me, upsert };
}
