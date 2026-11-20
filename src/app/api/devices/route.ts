import { and, desc, eq, isNull } from "drizzle-orm";
import { api, ok } from "@/server/http";
import { requireUser } from "@/server/access";
import { db } from "@/server/db";
import { device } from "@/server/db/schema";
import type { DeviceDTO } from "@/lib/dto";

export const runtime = "nodejs";

export const GET = api(async (req) => {
  const who = await requireUser(req);
  const rows = await db
    .select()
    .from(device)
    .where(and(eq(device.userId, who.userId), isNull(device.revokedAt)))
    .orderBy(desc(device.lastSeenAt));
  const devices: DeviceDTO[] = rows.map((d) => ({
    id: d.id,
    label: d.label,
    kind: d.kind,
    createdAt: d.createdAt.toISOString(),
    lastSeenAt: d.lastSeenAt.toISOString(),
    current: d.id === who.deviceId,
  }));
  return ok({ devices });
});
