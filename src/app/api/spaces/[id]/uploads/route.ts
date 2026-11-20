import { api, ok, parseJson } from "@/server/http";
import { requireSpace } from "@/server/access";
import { startUpload } from "@/server/drops";
import { startUploadSchema } from "@/lib/schemas";
import { RULES, enforceRate } from "@/server/ratelimit";

export const runtime = "nodejs";

export const POST = api<{ id: string }>(async (req, { params }) => {
  const { id } = await params;
  const { who, space } = await requireSpace(req, id);
  await enforceRate(RULES.upload, who.userId);
  const input = await parseJson(req, startUploadSchema);
  const out = await startUpload({ space, userId: who.userId, deviceId: who.deviceId, ...input });
  return ok(out, { status: 201 });
});
