import { and, eq, isNull } from "drizzle-orm";
import { api, E, noContent, ok, parseJson } from "@/server/http";
import { requireUser } from "@/server/access";
import { db } from "@/server/db";
import { device, session } from "@/server/db/schema";
import { revokeGrantsForDeviceEverywhere } from "@/server/grants";
import { publish, userChannel } from "@/server/realtime";
import { renameDeviceSchema } from "@/lib/schemas";

export const runtime = "nodejs";

export const PATCH = api<{ id: string }>(async (req, { params }) => {
  const { id } = await params;
  const who = await requireUser(req);
  const { label } = await parseJson(req, renameDeviceSchema);
  const [row] = await db
    .update(device)
    .set({ label })
    .where(and(eq(device.id, id), eq(device.userId, who.userId), isNull(device.revokedAt)))
    .returning();
  if (!row) throw E.notFound("Device");
  return ok({ device: { id: row.id, label: row.label, kind: row.kind } });
});

/** Revoke: kills the device's sessions and Space grants, and signs it out live. */
export const DELETE = api<{ id: string }>(async (req, { params }) => {
  const { id } = await params;
  const who = await requireUser(req);
  const [row] = await db
    .update(device)
    .set({ revokedAt: new Date() })
    .where(and(eq(device.id, id), eq(device.userId, who.userId), isNull(device.revokedAt)))
    .returning();
  if (!row) throw E.notFound("Device");
  await db.delete(session).where(eq(session.deviceId, id));
  await revokeGrantsForDeviceEverywhere(id);
  await publish(userChannel(who.userId), "device.revoked", { deviceId: id });
  return noContent();
});
