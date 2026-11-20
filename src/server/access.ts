import "server-only";
import type { NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { getAuth } from "./auth";
import { db } from "./db";
import { device } from "./db/schema";
import { E } from "./http";
import { verifySpaceGrant } from "./grants";

export interface Who {
  userId: string;
  deviceId: string;
  email: string;
  name: string;
}

/** Valid session bound to a non-revoked device, or throws 401. */
export async function requireUser(req: NextRequest): Promise<Who> {
  const s = await getAuth().api.getSession({ headers: req.headers });
  if (!s) throw E.unauthenticated();
  const deviceId = (s.session as { deviceId?: string | null }).deviceId;
  if (!deviceId) throw E.unauthenticated();
  const d = await db
    .select({ id: device.id })
    .from(device)
    .where(and(eq(device.id, deviceId), eq(device.userId, s.user.id), isNull(device.revokedAt)))
    .limit(1);
  if (!d[0]) throw E.unauthenticated();
  return { userId: s.user.id, deviceId, email: s.user.email, name: s.user.name };
}

/** Session + valid Space grant. Returns the Space row. */
export async function requireSpace(req: NextRequest, spaceId: string) {
  const who = await requireUser(req);
  if (!/^[0-9a-f-]{36}$/i.test(spaceId)) throw E.notFound("Space");
  const space = await verifySpaceGrant(req, who, spaceId);
  return { who, space };
}
