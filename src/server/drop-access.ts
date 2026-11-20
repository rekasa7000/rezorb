import "server-only";
import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { drop, type Drop } from "./db/schema";
import { requireSpace } from "./access";
import { E } from "./http";

/** Resolves a drop id to its Space and enforces the Space grant. 404s (not 403s) on strangers. */
export async function requireDrop(req: NextRequest, dropId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(dropId)) throw E.notFound("Drop");
  const [row] = await db.select().from(drop).where(eq(drop.id, dropId));
  if (!row) throw E.notFound("Drop");
  const { who, space } = await requireSpace(req, row.spaceId);
  return { who, space, drop: row as Drop };
}
