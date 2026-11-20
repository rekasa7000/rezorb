import "server-only";
import { randomInt } from "node:crypto";
import { and, count, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "./db";
import { drop, space, spaceGrant, user, type Space } from "./db/schema";
import { E } from "./http";
import { dummyVerify, hashPin, verifyPin } from "./pin";
import { issueGrant, revokeAllGrants } from "./grants";
import { publish, spaceChannel, userChannel } from "./realtime";
import { getStorage, spacePrefix } from "./storage";
import { mails, sendMail } from "./email";
import { log } from "./log";
import { LIMITS, type Accent, type Lifetime } from "@/lib/limits";
import { effectiveLockoutCount, lockoutDurationMs } from "@/lib/pin-rules";
import type { SpaceDTO } from "@/lib/dto";

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
export function newSlug(len = 10): string {
  let s = "";
  for (let i = 0; i < len; i++) s += B58[randomInt(B58.length)];
  return s;
}

export const nameKey = (name: string) => name.trim().toLowerCase();

export async function toSpaceDTOs(rows: Space[], unlockedIds: Set<string>): Promise<SpaceDTO[]> {
  if (rows.length === 0) return [];
  const counts = await db
    .select({ spaceId: drop.spaceId, n: count() })
    .from(drop)
    .where(and(eq(drop.status, "ready"), gt(drop.expiresAt, new Date())))
    .groupBy(drop.spaceId);
  const byId = new Map(counts.map((c) => [c.spaceId, c.n]));
  return rows.map((s) => ({
    id: s.id,
    slug: s.slug,
    name: s.name,
    accent: s.accent as Accent,
    defaultLifetime: s.defaultLifetime,
    dropCount: byId.get(s.id) ?? 0,
    lastActivityAt: s.lastActivityAt.toISOString(),
    unlockedHere: unlockedIds.has(s.id),
  }));
}

export async function createSpace(
  userId: string,
  input: { name: string; pin: string; accent: Accent; defaultLifetime: Lifetime },
) {
  const [{ n } = { n: 0 }] = await db.select({ n: count() }).from(space).where(eq(space.ownerId, userId));
  if (n >= LIMITS.maxSpacesPerUser) {
    throw E.forbidden("QUOTA_SPACES", `You can have up to ${LIMITS.maxSpacesPerUser} Spaces.`);
  }
  const pinHash = await hashPin(input.pin);
  try {
    const [row] = await db
      .insert(space)
      .values({
        ownerId: userId,
        name: input.name.trim(),
        nameKey: nameKey(input.name),
        slug: newSlug(),
        pinHash,
        accent: input.accent,
        defaultLifetime: input.defaultLifetime,
      })
      .returning();
    return row!;
  } catch (e) {
    if (isUniqueViolation(e)) throw E.conflict("NAME_TAKEN", "You already have a Space with that name.");
    throw e;
  }
}

export function isUniqueViolation(e: unknown): boolean {
  const code = (e as { code?: string; cause?: { code?: string } })?.code ?? (e as { cause?: { code?: string } })?.cause?.code;
  return code === "23505";
}

export async function unlockSpace(opts: {
  userId: string;
  deviceId: string;
  email: string;
  name: string;
  pin: string;
}) {
  const found = await db
    .select()
    .from(space)
    .where(and(eq(space.ownerId, opts.userId), eq(space.nameKey, nameKey(opts.name))))
    .limit(1);
  const s = found[0];
  if (!s) {
    await dummyVerify(opts.pin); // same timing as a wrong PIN
    throw E.badCredentials();
  }

  const now = new Date();
  if (s.lockedUntil && s.lockedUntil > now) throw E.sealed(s.lockedUntil);

  const good = await verifyPin(s.pinHash, opts.pin);
  if (!good) {
    const result = await recordFailedAttempt(s.id);
    if (result.sealedUntil) {
      await publish(spaceChannel(s.id), "space.sealed", { until: result.sealedUntil.toISOString() });
      await sendMail(mails.sealed(opts.email, s.name, result.sealedUntil)).catch((err) =>
        log.warn({ err: String(err) }, "sealed email failed"),
      );
      throw E.sealed(result.sealedUntil);
    }
    throw E.badCredentials({ attemptsLeft: result.attemptsLeft });
  }

  if (s.failedAttempts > 0) {
    await db.update(space).set({ failedAttempts: 0 }).where(eq(space.id, s.id));
  }
  const grant = await issueGrant({
    spaceId: s.id,
    userId: opts.userId,
    deviceId: opts.deviceId,
    pinVersion: s.pinVersion,
  });
  return { space: s, grant };
}

/** Counts a failed PIN attempt under a row lock so concurrent guesses can't dodge the lockout. */
export async function recordFailedAttempt(spaceId: string): Promise<{ attemptsLeft: number; sealedUntil: Date | null }> {
  return db.transaction(async (tx) => {
    const [s] = await tx.select().from(space).where(eq(space.id, spaceId)).for("update");
    if (!s) return { attemptsLeft: 0, sealedUntil: null };
    const now = new Date();
    if (s.lockedUntil && s.lockedUntil > now) return { attemptsLeft: 0, sealedUntil: s.lockedUntil };
    const failed = s.failedAttempts + 1;
    if (failed >= LIMITS.maxFailedPinAttempts) {
      const number = effectiveLockoutCount(s.lockoutCount, s.lastLockoutAt, now) + 1;
      const until = new Date(now.getTime() + lockoutDurationMs(number));
      await tx
        .update(space)
        .set({ failedAttempts: 0, lockoutCount: number, lastLockoutAt: now, lockedUntil: until })
        .where(eq(space.id, spaceId));
      return { attemptsLeft: 0, sealedUntil: until };
    }
    await tx.update(space).set({ failedAttempts: failed }).where(eq(space.id, spaceId));
    return { attemptsLeft: LIMITS.maxFailedPinAttempts - failed, sealedUntil: null };
  });
}

export async function changePin(opts: { space: Space; currentPin: string; newPin: string; deviceId: string; userId: string }) {
  if (!(await verifyPin(opts.space.pinHash, opts.currentPin))) {
    const r = await recordFailedAttempt(opts.space.id);
    if (r.sealedUntil) throw E.sealed(r.sealedUntil);
    throw E.badCredentials({ attemptsLeft: r.attemptsLeft });
  }
  const pinHash = await hashPin(opts.newPin);
  const [updated] = await db
    .update(space)
    .set({ pinHash, pinVersion: sql`${space.pinVersion} + 1`, failedAttempts: 0, updatedAt: new Date() })
    .where(eq(space.id, opts.space.id))
    .returning();
  // Everyone else is dropped to the PIN screen; this device is re-granted.
  await revokeAllGrants(opts.space.id);
  const grant = await issueGrant({
    spaceId: opts.space.id,
    userId: opts.userId,
    deviceId: opts.deviceId,
    pinVersion: updated!.pinVersion,
  });
  await publish(spaceChannel(opts.space.id), "space.relocked", {
    pinVersion: updated!.pinVersion,
    byDeviceId: opts.deviceId,
  });
  return { space: updated!, grant };
}

export async function deleteSpace(s: Space) {
  const [owner] = await db.select({ id: user.id }).from(user).where(eq(user.id, s.ownerId));
  await db.delete(space).where(eq(space.id, s.id)); // drops + grants cascade
  await getStorage()
    .deletePrefix(spacePrefix(s.ownerId, s.id))
    .catch((err) => log.warn({ spaceId: s.id, err: String(err) }, "space prefix delete failed; cron backstop will catch it"));
  await publish(spaceChannel(s.id), "space.deleted", {});
  if (owner) await publish(userChannel(owner.id), "space.deleted", { id: s.id });
}

export async function listSpaces(userId: string) {
  return db.select().from(space).where(eq(space.ownerId, userId)).orderBy(sql`${space.lastActivityAt} desc`);
}

export async function liveGrantCount(spaceId: string) {
  const [{ n } = { n: 0 }] = await db
    .select({ n: count() })
    .from(spaceGrant)
    .where(and(eq(spaceGrant.spaceId, spaceId), isNull(spaceGrant.revokedAt), gt(spaceGrant.expiresAt, new Date())));
  return n;
}
