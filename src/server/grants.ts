import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq, gt, isNull, ne } from "drizzle-orm";
import type { NextRequest, NextResponse } from "next/server";
import { db } from "./db";
import { device, space, spaceGrant, type Space } from "./db/schema";
import { env, isProd } from "./env";
import { E } from "./http";
import { LIMITS } from "@/lib/limits";

/**
 * Space grants (docs/ARCHITECTURE.md §4.1, docs/SECURITY.md §3).
 * A grant is proof that THIS device unlocked THIS space. It lives in a signed,
 * HttpOnly cookie `rz_g_{spaceId}` that points at a revocable DB row.
 */

export const grantCookieName = (spaceId: string) => `rz_g_${spaceId}`;

const sign = (value: string, secret: string) =>
  createHmac("sha256", secret).update(value).digest("base64url");

export function signGrantCookie(grantId: string): string {
  return `${grantId}.${sign(grantId, env.grantSecret)}`;
}

/** Returns the grant id if the signature matches the current or previous secret. */
export function readGrantCookie(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const i = raw.lastIndexOf(".");
  if (i < 1) return null;
  const id = raw.slice(0, i);
  const sig = raw.slice(i + 1);
  const secrets = [env.grantSecret, env.grantSecretPrev].filter(Boolean) as string[];
  for (const secret of secrets) {
    const expected = Buffer.from(sign(id, secret));
    const got = Buffer.from(sig);
    if (expected.length === got.length && timingSafeEqual(expected, got)) return id;
  }
  return null;
}

export async function issueGrant(opts: {
  spaceId: string;
  userId: string;
  deviceId: string;
  pinVersion: number;
}) {
  const now = new Date();
  // One live grant per (space, device).
  await db
    .update(spaceGrant)
    .set({ revokedAt: now })
    .where(
      and(
        eq(spaceGrant.spaceId, opts.spaceId),
        eq(spaceGrant.deviceId, opts.deviceId),
        isNull(spaceGrant.revokedAt),
      ),
    );
  const expiresAt = new Date(now.getTime() + LIMITS.grantIdleMs);
  const [row] = await db
    .insert(spaceGrant)
    .values({ ...opts, expiresAt })
    .returning();
  return row!;
}

export function setGrantCookie(res: NextResponse, grant: { id: string; spaceId: string; expiresAt: Date }) {
  res.cookies.set(grantCookieName(grant.spaceId), signGrantCookie(grant.id), {
    httpOnly: true,
    secure: isProd(),
    sameSite: "lax",
    path: "/",
    expires: grant.expiresAt,
  });
}

export function clearGrantCookie(res: NextResponse, spaceId: string) {
  res.cookies.set(grantCookieName(spaceId), "", {
    httpOnly: true,
    secure: isProd(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function revokeGrantsForDevice(spaceId: string, deviceId: string) {
  await db
    .update(spaceGrant)
    .set({ revokedAt: new Date() })
    .where(and(eq(spaceGrant.spaceId, spaceId), eq(spaceGrant.deviceId, deviceId), isNull(spaceGrant.revokedAt)));
}

/** Revoke every grant on a space except (optionally) one device's. Used on PIN change. */
export async function revokeAllGrants(spaceId: string, exceptDeviceId?: string) {
  await db
    .update(spaceGrant)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(spaceGrant.spaceId, spaceId),
        isNull(spaceGrant.revokedAt),
        exceptDeviceId ? ne(spaceGrant.deviceId, exceptDeviceId) : undefined,
      ),
    );
}

export async function revokeGrantsForDeviceEverywhere(deviceId: string) {
  await db
    .update(spaceGrant)
    .set({ revokedAt: new Date() })
    .where(and(eq(spaceGrant.deviceId, deviceId), isNull(spaceGrant.revokedAt)));
}

/**
 * Validates the grant cookie for (user, device, space). Throws SPACE_LOCKED otherwise.
 * Slides the idle timeout, writing at most once a minute.
 */
export async function verifySpaceGrant(
  req: NextRequest,
  who: { userId: string; deviceId: string },
  spaceId: string,
): Promise<Space> {
  const grantId = readGrantCookie(req.cookies.get(grantCookieName(spaceId))?.value);
  if (!grantId) throw E.spaceLocked();

  const now = new Date();
  const rows = await db
    .select({ grant: spaceGrant, space })
    .from(spaceGrant)
    .innerJoin(space, eq(space.id, spaceGrant.spaceId))
    .innerJoin(device, eq(device.id, spaceGrant.deviceId))
    .where(
      and(
        eq(spaceGrant.id, grantId),
        eq(spaceGrant.spaceId, spaceId),
        eq(spaceGrant.userId, who.userId),
        eq(spaceGrant.deviceId, who.deviceId),
        isNull(spaceGrant.revokedAt),
        gt(spaceGrant.expiresAt, now),
        isNull(device.revokedAt),
        eq(space.ownerId, who.userId),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row || row.grant.pinVersion !== row.space.pinVersion) throw E.spaceLocked();

  const slideTo = new Date(now.getTime() + LIMITS.grantIdleMs);
  if (slideTo.getTime() - row.grant.expiresAt.getTime() > LIMITS.grantSlideDebounceMs) {
    await db.update(spaceGrant).set({ expiresAt: slideTo }).where(eq(spaceGrant.id, row.grant.id));
  }
  return row.space;
}

/** Spaces this device currently holds a valid grant for (used for realtime capabilities). */
export async function grantedSpaceIds(req: NextRequest, who: { userId: string; deviceId: string }) {
  const candidates: Array<{ spaceId: string; grantId: string }> = [];
  for (const c of req.cookies.getAll()) {
    if (!c.name.startsWith("rz_g_")) continue;
    const grantId = readGrantCookie(c.value);
    if (grantId) candidates.push({ spaceId: c.name.slice(5), grantId });
  }
  if (candidates.length === 0) return [];
  const now = new Date();
  const rows = await db
    .select({ id: spaceGrant.id, spaceId: spaceGrant.spaceId, pinVersion: spaceGrant.pinVersion, spacePin: space.pinVersion })
    .from(spaceGrant)
    .innerJoin(space, eq(space.id, spaceGrant.spaceId))
    .where(
      and(
        eq(spaceGrant.userId, who.userId),
        eq(spaceGrant.deviceId, who.deviceId),
        isNull(spaceGrant.revokedAt),
        gt(spaceGrant.expiresAt, now),
      ),
    );
  const ok = new Map(rows.filter((r) => r.pinVersion === r.spacePin).map((r) => [r.id, r.spaceId]));
  return candidates.filter((c) => ok.get(c.grantId) === c.spaceId).map((c) => c.spaceId);
}
