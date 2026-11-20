import { NextResponse } from "next/server";
import { api, ok, parseJson } from "@/server/http";
import { requireUser } from "@/server/access";
import { createSpace, listSpaces, toSpaceDTOs } from "@/server/spaces";
import { grantedSpaceIds, issueGrant, setGrantCookie } from "@/server/grants";
import { createSpaceSchema } from "@/lib/schemas";
import { RULES, enforceRate } from "@/server/ratelimit";

export const runtime = "nodejs";

export const GET = api(async (req) => {
  const who = await requireUser(req);
  const [rows, unlocked] = await Promise.all([listSpaces(who.userId), grantedSpaceIds(req, who)]);
  return ok({ spaces: await toSpaceDTOs(rows, new Set(unlocked)) });
});

export const POST = api(async (req) => {
  const who = await requireUser(req);
  await enforceRate(RULES.createSpace, who.userId);
  const input = await parseJson(req, createSpaceSchema);
  const space = await createSpace(who.userId, input);
  const grant = await issueGrant({ spaceId: space.id, userId: who.userId, deviceId: who.deviceId, pinVersion: space.pinVersion });
  const [dto] = await toSpaceDTOs([space], new Set([space.id]));
  const res = NextResponse.json({ space: dto }, { status: 201 });
  setGrantCookie(res, grant);
  return res;
});
