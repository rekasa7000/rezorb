import { NextResponse } from "next/server";
import { api, parseJson } from "@/server/http";
import { requireSpace } from "@/server/access";
import { changePin, toSpaceDTOs } from "@/server/spaces";
import { setGrantCookie } from "@/server/grants";
import { changePinSchema } from "@/lib/schemas";
import { RULES, enforceRate } from "@/server/ratelimit";

export const runtime = "nodejs";

export const POST = api<{ id: string }>(async (req, { params }) => {
  const { id } = await params;
  const { who, space } = await requireSpace(req, id);
  await enforceRate(RULES.unlockUser, who.userId);
  const { currentPin, newPin } = await parseJson(req, changePinSchema);
  const out = await changePin({ space, currentPin, newPin, deviceId: who.deviceId, userId: who.userId });
  const [dto] = await toSpaceDTOs([out.space], new Set([out.space.id]));
  const res = NextResponse.json({ space: dto });
  setGrantCookie(res, out.grant);
  return res;
});
