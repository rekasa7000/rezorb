import { and, eq, isNull, sql } from "drizzle-orm";
import { api, ok } from "@/server/http";
import { requireUser } from "@/server/access";
import { db } from "@/server/db";
import { device, space } from "@/server/db/schema";
import { storageUsed } from "@/server/drops";
import { LIMITS } from "@/lib/limits";
import type { UsageDTO } from "@/lib/dto";

export const runtime = "nodejs";

export const GET = api(async (req) => {
  const who = await requireUser(req);
  const [bytes, [s], [d]] = await Promise.all([
    storageUsed(who.userId),
    db.select({ n: sql<number>`count(*)::int` }).from(space).where(eq(space.ownerId, who.userId)),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(device)
      .where(and(eq(device.userId, who.userId), isNull(device.revokedAt))),
  ]);
  const usage: UsageDTO = {
    storageBytes: bytes,
    storageMaxBytes: LIMITS.maxStorageBytes,
    spaces: s?.n ?? 0,
    spacesMax: LIMITS.maxSpacesPerUser,
    devices: d?.n ?? 0,
    devicesMax: LIMITS.maxDevicesPerUser,
  };
  return ok({ usage });
});
