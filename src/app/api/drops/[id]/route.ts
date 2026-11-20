import { api, noContent, ok, parseJson } from "@/server/http";
import { requireDrop } from "@/server/drop-access";
import { deleteDrop, updateDrop } from "@/server/drops";
import { patchDropSchema } from "@/lib/schemas";

export const runtime = "nodejs";

export const PATCH = api<{ id: string }>(async (req, { params }) => {
  const { id } = await params;
  const { space } = await requireDrop(req, id);
  const patch = await parseJson(req, patchDropSchema);
  return ok({ drop: await updateDrop({ space, dropId: id, ...patch }) });
});

export const DELETE = api<{ id: string }>(async (req, { params }) => {
  const { id } = await params;
  const { space } = await requireDrop(req, id);
  await deleteDrop(space, id);
  return noContent();
});
