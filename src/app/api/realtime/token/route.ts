import { eq } from "drizzle-orm";
import { api, ok } from "@/server/http";
import { requireUser } from "@/server/access";
import { grantedSpaceIds } from "@/server/grants";
import { createTokenRequest, realtimeEnabled, userChannel } from "@/server/realtime";
import { RULES, enforceRate } from "@/server/ratelimit";
import { db } from "@/server/db";
import { device } from "@/server/db/schema";

export const runtime = "nodejs";

export const POST = api(async (req) => {
  const who = await requireUser(req);
  await enforceRate(RULES.realtimeToken, who.userId);
  const [d] = await db.select({ label: device.label, kind: device.kind }).from(device).where(eq(device.id, who.deviceId));
  const me = { id: who.deviceId, label: d?.label ?? "Device", kind: d?.kind ?? "unknown" };
  // Polling mode still needs to know which device this is, to tell your own Drops from arrivals.
  if (!realtimeEnabled()) return ok({ mode: "poll" as const, device: me });
  const spaceIds = await grantedSpaceIds(req, who);
  const tokenRequest = await createTokenRequest({ clientId: who.deviceId, spaceIds, userId: who.userId });
  return ok({
    mode: "ably" as const,
    tokenRequest,
    spaceIds,
    userChannel: userChannel(who.userId),
    device: me,
  });
});
