import { eq } from "drizzle-orm";
import { api, E, noContent, ok, parseJson } from "@/server/http";
import { requireSpace } from "@/server/access";
import { db } from "@/server/db";
import { space as spaceT } from "@/server/db/schema";
import { deleteSpace, isUniqueViolation, nameKey, toSpaceDTOs } from "@/server/spaces";
import { publish, spaceChannel } from "@/server/realtime";
import { deleteSpaceSchema, patchSpaceSchema } from "@/lib/schemas";

export const runtime = "nodejs";

export const PATCH = api<{ id: string }>(async (req, { params }) => {
  const { id } = await params;
  const { space } = await requireSpace(req, id);
  const patch = await parseJson(req, patchSpaceSchema);
  try {
    const [row] = await db
      .update(spaceT)
      .set({
        ...(patch.name ? { name: patch.name, nameKey: nameKey(patch.name) } : {}),
        ...(patch.accent ? { accent: patch.accent } : {}),
        ...(patch.defaultLifetime ? { defaultLifetime: patch.defaultLifetime } : {}),
        updatedAt: new Date(),
      })
      .where(eq(spaceT.id, space.id))
      .returning();
    const [dto] = await toSpaceDTOs([row!], new Set([row!.id]));
    await publish(spaceChannel(space.id), "space.updated", {
      space: { id: row!.id, name: row!.name, accent: row!.accent, defaultLifetime: row!.defaultLifetime },
    });
    return ok({ space: dto });
  } catch (e) {
    if (isUniqueViolation(e)) throw E.conflict("NAME_TAKEN", "You already have a Space with that name.");
    throw e;
  }
});

export const DELETE = api<{ id: string }>(async (req, { params }) => {
  const { id } = await params;
  const { space } = await requireSpace(req, id);
  const { confirmName } = await parseJson(req, deleteSpaceSchema);
  if (nameKey(confirmName) !== space.nameKey) throw E.invalid("Type the Space name to confirm.", "CONFIRM_MISMATCH");
  await deleteSpace(space);
  return noContent();
});
