import { api, ok, parseJson } from "@/server/http";
import { requireDrop } from "@/server/drop-access";
import { completeUpload } from "@/server/drops";
import { completeUploadSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

export const POST = api<{ id: string }>(async (req, { params }) => {
  const { id } = await params;
  const { who, space } = await requireDrop(req, id);
  const body = await parseJson(req, completeUploadSchema);
  return ok({ drop: await completeUpload({ space, userId: who.userId, deviceId: who.deviceId, dropId: id, ...body }) });
});
