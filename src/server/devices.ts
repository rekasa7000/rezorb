import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { UAParser } from "ua-parser-js";
import { db } from "./db";
import { device } from "./db/schema";
import { LIMITS } from "@/lib/limits";

export type DeviceKind = "desktop" | "laptop" | "phone" | "tablet" | "unknown";

export function describeUserAgent(ua: string | null | undefined): { label: string; kind: DeviceKind } {
  if (!ua) return { label: "Unknown device", kind: "unknown" };
  const r = UAParser(ua);
  const browser = r.browser.name ?? "Browser";
  const os = r.os.name ?? "Unknown OS";
  const t = r.device.type;
  const kind: DeviceKind =
    t === "mobile" ? "phone" : t === "tablet" ? "tablet" : os.match(/Mac|Windows|Linux|Chrome OS/) ? "laptop" : "unknown";
  return { label: `${browser} on ${os}`, kind };
}

export class DeviceQuotaError extends Error {}

/**
 * Finds the device for (user, cookie id) or creates one. A forged cookie is
 * harmless: lookups always require the device to belong to the same user.
 */
export async function findOrCreateDevice(opts: {
  userId: string;
  cookieDeviceId: string | null | undefined;
  userAgent: string | null | undefined;
}): Promise<{ id: string; created: boolean }> {
  const { userId, cookieDeviceId, userAgent } = opts;
  if (cookieDeviceId && /^[0-9a-f-]{36}$/i.test(cookieDeviceId)) {
    const existing = await db
      .select({ id: device.id })
      .from(device)
      .where(and(eq(device.id, cookieDeviceId), eq(device.userId, userId), isNull(device.revokedAt)))
      .limit(1);
    if (existing[0]) {
      await db.update(device).set({ lastSeenAt: new Date() }).where(eq(device.id, existing[0].id));
      return { id: existing[0].id, created: false };
    }
  }
  const [{ n } = { n: 0 }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(device)
    .where(and(eq(device.userId, userId), isNull(device.revokedAt)));
  if (n >= LIMITS.maxDevicesPerUser) throw new DeviceQuotaError();
  const { label, kind } = describeUserAgent(userAgent);
  const [row] = await db.insert(device).values({ userId, label, kind }).returning({ id: device.id });
  return { id: row!.id, created: true };
}
