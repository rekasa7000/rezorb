import { after, NextResponse } from "next/server";
import { api, ok, parseJson } from "@/server/http";
import { requireSpace } from "@/server/access";
import { burnExpiredInSpace, createTextDrop, listDrops } from "@/server/drops";
import { createTextDropSchema } from "@/lib/schemas";
import { RULES, enforceRate } from "@/server/ratelimit";

export const runtime = "nodejs";

export const GET = api<{ id: string }>(async (req, { params }) => {
  const { id } = await params;
  const { who, space } = await requireSpace(req, id);
  const q = req.nextUrl.searchParams;
  const since = q.get("since");
  const sinceDate = since ? new Date(since) : undefined;
  if (sinceDate && Number.isNaN(sinceDate.getTime())) {
    return NextResponse.json({ error: { code: "VALIDATION", message: "Bad `since`." } }, { status: 422 });
  }
  const result = await listDrops({
    spaceId: space.id,
    deviceId: who.deviceId,
    cursor: q.get("cursor") ?? undefined,
    limit: q.get("limit") ? Number(q.get("limit")) : undefined,
    since: sinceDate,
  });
  // Opportunistic burn (ADR-0006): keeps storage tidy even on a daily-cron plan.
  if (!q.get("cursor") && !since) after(() => burnExpiredInSpace(space).catch(() => {}));
  return ok({ ...result, serverTime: new Date().toISOString() });
});

export const POST = api<{ id: string }>(async (req, { params }) => {
  const { id } = await params;
  const { who, space } = await requireSpace(req, id);
  await enforceRate(RULES.beam, who.userId);
  const input = await parseJson(req, createTextDropSchema);
  const drop = await createTextDrop({ space, userId: who.userId, deviceId: who.deviceId, ...input });
  return ok({ drop }, { status: 201 });
});
