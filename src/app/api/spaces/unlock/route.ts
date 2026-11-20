import { NextResponse } from "next/server";
import { api, parseJson } from "@/server/http";
import { requireUser } from "@/server/access";
import { toSpaceDTOs, unlockSpace } from "@/server/spaces";
import { setGrantCookie } from "@/server/grants";
import { unlockSchema } from "@/lib/schemas";
import { RULES, clientIp, enforceRate } from "@/server/ratelimit";

export const runtime = "nodejs";

export const POST = api(async (req) => {
  const who = await requireUser(req);
  await enforceRate(RULES.unlockUser, who.userId);
  await enforceRate(RULES.unlockIp, clientIp(req.headers));
  const input = await parseJson(req, unlockSchema);
  const { space, grant } = await unlockSpace({ ...who, name: input.name, pin: input.pin });
  const [dto] = await toSpaceDTOs([space], new Set([space.id]));
  const res = NextResponse.json({ space: dto });
  setGrantCookie(res, grant);
  return res;
});
