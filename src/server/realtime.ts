import "server-only";
import * as Ably from "ably";
import { env } from "./env";
import { log } from "./log";

/**
 * Realtime (ADR-0004). Only the server publishes. Clients get subscribe/presence
 * tokens scoped per Space. Without ABLY_API_KEY (local dev) publishing is a no-op
 * and the client falls back to polling `?since=`.
 */

export const spaceChannel = (id: string) => `space:${id}`;
export const userChannel = (id: string) => `user:${id}`;

let rest: Ably.Rest | null = null;
function client(): Ably.Rest | null {
  const key = env.ablyKey;
  if (!key) return null;
  return (rest ??= new Ably.Rest({ key }));
}

export const realtimeEnabled = () => !!env.ablyKey;

/** Publishes with a short timeout; realtime must never fail or slow a write. */
export async function publish(channel: string, event: string, data: unknown): Promise<void> {
  const c = client();
  if (!c) return;
  try {
    await Promise.race([
      c.channels.get(channel).publish(event, data),
      new Promise((_, rej) => setTimeout(() => rej(new Error("publish timeout")), 2000)),
    ]);
  } catch (err) {
    log.warn({ channel, event, err: err instanceof Error ? err.message : "unknown" }, "realtime publish failed");
  }
}

export async function createTokenRequest(opts: {
  clientId: string;
  spaceIds: string[];
  userId: string;
}): Promise<Ably.TokenRequest | null> {
  const c = client();
  if (!c) return null;
  const capability: Record<string, string[]> = {
    [userChannel(opts.userId)]: ["subscribe"],
  };
  for (const id of opts.spaceIds) capability[spaceChannel(id)] = ["subscribe", "presence"];
  return c.auth.createTokenRequest({
    clientId: opts.clientId,
    capability: JSON.stringify(capability),
    ttl: 60 * 60 * 1000,
  });
}
