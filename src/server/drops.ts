import "server-only";
import { and, asc, desc, eq, gt, inArray, lt, or, sql } from "drizzle-orm";
import { db, type Tx } from "./db";
import { device, drop, space, type Drop, type Space } from "./db/schema";
import { E } from "./http";
import { publish, spaceChannel } from "./realtime";
import { blobKey, getStorage, thumbKey } from "./storage";
import { log } from "./log";
import { classifyText, isSingleUrl } from "@/lib/classify";
import { expiryFor, extendedExpiry, unpinnedExpiry } from "@/lib/lifetime";
import { INLINE_IMAGE_MIMES, LIMITS, type Lifetime } from "@/lib/limits";
import { sanitizeFileName } from "@/lib/format";
import type { DropDTO } from "@/lib/dto";

type DropWithDevice = { drop: Drop; device: { id: string; label: string; kind: string } | null };

const withDevice = () =>
  db
    .select({ drop, device: { id: device.id, label: device.label, kind: device.kind } })
    .from(drop)
    .leftJoin(device, eq(device.id, drop.sourceDeviceId));

export function toDropDTO(row: DropWithDevice, opts: { omitLargeText?: boolean } = {}): DropDTO {
  const d = row.drop;
  const omit = opts.omitLargeText && d.text != null && Buffer.byteLength(d.text) > LIMITS.maxRealtimeTextBytes;
  return {
    id: d.id,
    spaceId: d.spaceId,
    kind: d.kind,
    status: d.status,
    text: d.text != null && !omit ? d.text : undefined,
    textOmitted: omit || undefined,
    language: d.language ?? undefined,
    fileName: d.fileName ?? undefined,
    mimeType: d.mimeType ?? undefined,
    sizeBytes: d.sizeBytes,
    width: d.width ?? undefined,
    height: d.height ?? undefined,
    thumbUrl: d.thumbKey && d.status === "ready" ? `/api/drops/${d.id}/download?variant=thumb&inline=1` : undefined,
    sourceDevice: row.device,
    pinned: d.pinned,
    createdAt: d.createdAt.toISOString(),
    expiresAt: d.expiresAt.toISOString(),
  };
}

const live = (now = new Date()) => gt(drop.expiresAt, now);

export async function getDropDTO(id: string): Promise<DropDTO | null> {
  const [row] = await withDevice().where(eq(drop.id, id)).limit(1);
  return row ? toDropDTO(row) : null;
}

// ───────────────────────────── Queries ─────────────────────────────

export async function listDrops(opts: {
  spaceId: string;
  deviceId: string;
  cursor?: string;
  limit?: number;
  since?: Date;
}) {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100);
  const now = new Date();
  const rows = await withDevice()
    .where(
      and(
        eq(drop.spaceId, opts.spaceId),
        live(now),
        // Others' in-flight uploads stay invisible until complete.
        or(eq(drop.status, "ready"), eq(drop.sourceDeviceId, opts.deviceId)),
        opts.cursor ? lt(drop.id, opts.cursor) : undefined,
        opts.since ? gt(drop.updatedAt, opts.since) : undefined,
      ),
    )
    .orderBy(desc(drop.id))
    .limit(limit + 1);
  const page = rows.slice(0, limit);
  return {
    drops: page.map((r) => toDropDTO(r)),
    nextCursor: rows.length > limit ? page[page.length - 1]!.drop.id : null,
  };
}

/** Bytes currently reserved by a user: unexpired ready drops plus fresh in-flight uploads. */
export async function storageUsed(userId: string, tx: Tx | typeof db = db): Promise<number> {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - 60 * 60 * 1000);
  const [r] = await tx
    .select({
      n: sql<string>`coalesce(sum(${drop.sizeBytes} + ${drop.thumbBytes}), 0)`,
    })
    .from(drop)
    .innerJoin(space, eq(space.id, drop.spaceId))
    .where(
      and(
        eq(space.ownerId, userId),
        live(now),
        or(eq(drop.status, "ready"), gt(drop.createdAt, staleBefore)),
      ),
    );
  return Number(r?.n ?? 0);
}

async function touchSpace(spaceId: string) {
  await db.update(space).set({ lastActivityAt: new Date() }).where(eq(space.id, spaceId));
}

// ───────────────────────────── Create ─────────────────────────────

export async function createTextDrop(opts: {
  space: Space;
  userId: string;
  deviceId: string;
  kind: "text" | "code" | "link";
  text: string;
  language?: string;
  lifetime?: Lifetime;
  clientId?: string;
}): Promise<DropDTO> {
  const bytes = Buffer.byteLength(opts.text);
  if (bytes > LIMITS.maxTextBytes) throw E.tooLarge("Text drops can be up to 1 MB.");

  // Re-validate the claimed kind: `link` must be a single http(s) URL.
  let kind = opts.kind;
  let language = opts.language;
  if (kind === "link" && !isSingleUrl(opts.text)) {
    const c = classifyText(opts.text);
    kind = c.kind === "link" ? "text" : c.kind;
    language = c.language;
  }
  if (kind !== "code") language = undefined;

  const id = await db.transaction(async (tx) => {
    // Serialise quota checks per user.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${opts.userId}))`);
    const used = await storageUsed(opts.userId, tx);
    if (used + bytes > LIMITS.maxStorageBytes) {
      throw E.forbidden("QUOTA_STORAGE", "You're out of space in orbit. Delete something or wait for it to expire.");
    }
    const now = new Date();
    const [row] = await tx
      .insert(drop)
      .values({
        spaceId: opts.space.id,
        sourceDeviceId: opts.deviceId,
        kind,
        status: "ready",
        text: opts.text,
        language: language ?? null,
        sizeBytes: bytes,
        createdAt: now,
        updatedAt: now,
        expiresAt: expiryFor(now, opts.lifetime ?? opts.space.defaultLifetime),
      })
      .returning({ id: drop.id });
    return row!.id;
  });

  const dto = (await getDropDTO(id))!;
  await touchSpace(opts.space.id);
  await publish(spaceChannel(opts.space.id), "drop.created", {
    drop: toDropDTO({ drop: (await loadDrop(id))!, device: dto.sourceDevice }, { omitLargeText: true }),
    clientId: opts.clientId,
  });
  await enforceDropCap(opts.space.id);
  return dto;
}

async function loadDrop(id: string): Promise<Drop | null> {
  const [r] = await db.select().from(drop).where(eq(drop.id, id));
  return r ?? null;
}

export async function startUpload(opts: {
  space: Space;
  userId: string;
  deviceId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  kind: "image" | "file";
  width?: number | null;
  height?: number | null;
  withThumb: boolean;
  lifetime?: Lifetime;
}) {
  if (opts.sizeBytes > LIMITS.maxFileBytes) throw E.tooLarge("Files can be up to 50 MB.");
  const storage = getStorage();
  const thumbReserve = opts.withThumb ? 256 * 1024 : 0;

  const created = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${opts.userId}))`);
    const used = await storageUsed(opts.userId, tx);
    if (used + opts.sizeBytes + thumbReserve > LIMITS.maxStorageBytes) {
      throw E.forbidden("QUOTA_STORAGE", "You're out of space in orbit. Delete something or wait for it to expire.");
    }
    const now = new Date();
    const [row] = await tx
      .insert(drop)
      .values({
        spaceId: opts.space.id,
        sourceDeviceId: opts.deviceId,
        kind: opts.kind,
        status: "uploading",
        fileName: sanitizeFileName(opts.fileName),
        mimeType: opts.mimeType,
        sizeBytes: opts.sizeBytes,
        thumbBytes: thumbReserve, // trued up on complete
        width: opts.width ?? null,
        height: opts.height ?? null,
        createdAt: now,
        updatedAt: now,
        expiresAt: expiryFor(now, opts.lifetime ?? opts.space.defaultLifetime),
      })
      .returning();
    return row!;
  });

  const key = blobKey(opts.userId, opts.space.id, created.id);
  const tKey = thumbKey(opts.userId, opts.space.id, created.id);
  try {
    let upload:
      | { method: "single"; url: string; headers: Record<string, string>; expiresAt: string }
      | { method: "multipart"; uploadId: string; partSize: number; parts: Array<{ partNumber: number; url: string }>; expiresAt: string };
    const expiresAt = new Date(Date.now() + LIMITS.presignPutSeconds * 1000).toISOString();

    if (opts.sizeBytes > LIMITS.multipartThresholdBytes) {
      const uploadId = await storage.createMultipart(key, opts.mimeType);
      const n = Math.ceil(opts.sizeBytes / LIMITS.multipartPartBytes);
      const parts = await Promise.all(
        Array.from({ length: n }, async (_, i) => ({ partNumber: i + 1, url: await storage.presignPart(key, uploadId, i + 1) })),
      );
      await db
        .update(drop)
        .set({ blobKey: key, uploadId, thumbKey: opts.withThumb ? tKey : null })
        .where(eq(drop.id, created.id));
      upload = { method: "multipart", uploadId, partSize: LIMITS.multipartPartBytes, parts, expiresAt };
    } else {
      const put = await storage.presignPut(key, opts.mimeType);
      await db
        .update(drop)
        .set({ blobKey: key, thumbKey: opts.withThumb ? tKey : null })
        .where(eq(drop.id, created.id));
      upload = { method: "single", ...put, expiresAt };
    }
    const thumbUpload = opts.withThumb ? { ...(await storage.presignPut(tKey, "image/webp")), expiresAt } : undefined;
    const dto = (await getDropDTO(created.id))!;
    return { drop: dto, upload, thumbUpload };
  } catch (err) {
    await db.delete(drop).where(eq(drop.id, created.id));
    throw err;
  }
}

export async function completeUpload(opts: {
  space: Space;
  userId: string;
  deviceId: string;
  dropId: string;
  parts?: Array<{ partNumber: number; etag: string }>;
  thumbBytes?: number;
}): Promise<DropDTO> {
  const [row] = await db
    .select()
    .from(drop)
    .where(and(eq(drop.id, opts.dropId), eq(drop.spaceId, opts.space.id)));
  if (!row) throw E.notFound("Drop");
  if (row.sourceDeviceId !== opts.deviceId) throw E.forbidden("NOT_YOURS", "Only the uploading device can finish this upload.");
  if (row.status === "ready") return (await getDropDTO(row.id))!;
  if (!row.blobKey) throw E.invalid("Upload was never started.");
  const storage = getStorage();

  if (row.uploadId) {
    if (!opts.parts?.length) throw E.invalid("Multipart upload needs its parts.");
    await storage.completeMultipart(row.blobKey, row.uploadId, opts.parts);
  }
  const head = await storage.head(row.blobKey);
  if (!head || head.size !== row.sizeBytes) {
    await burnDrops([row.id], opts.space.ownerId, opts.space.id, "deleted");
    throw E.invalid("The upload didn't match what you said you'd send.", "SIZE_MISMATCH");
  }
  let thumbBytes = 0;
  let tKey = row.thumbKey;
  if (tKey) {
    const th = await storage.head(tKey);
    if (th && th.size <= 2 * 1024 * 1024) thumbBytes = th.size;
    else tKey = null; // thumbnail never arrived; the original still works
  }
  const now = new Date();
  await db
    .update(drop)
    .set({ status: "ready", thumbKey: tKey, thumbBytes, uploadId: null, updatedAt: now })
    .where(eq(drop.id, row.id));

  await touchSpace(opts.space.id);
  const dto = (await getDropDTO(row.id))!;
  await publish(spaceChannel(opts.space.id), "drop.created", { drop: dto });
  await enforceDropCap(opts.space.id);
  return dto;
}

// ───────────────────────────── Update / delete / burn ─────────────────────────────

export async function updateDrop(opts: { space: Space; dropId: string; pinned?: boolean; extend?: Lifetime }): Promise<DropDTO> {
  const [row] = await db
    .select()
    .from(drop)
    .where(and(eq(drop.id, opts.dropId), eq(drop.spaceId, opts.space.id), live()));
  if (!row) throw E.notFound("Drop");
  const now = new Date();
  let expiresAt = row.expiresAt;
  let pinned = row.pinned;
  if (opts.pinned !== undefined && opts.pinned !== row.pinned) {
    pinned = opts.pinned;
    expiresAt = pinned ? expiryFor(row.createdAt, "7d", true) : unpinnedExpiry(row.createdAt, opts.space.defaultLifetime, now);
  }
  if (opts.extend) expiresAt = extendedExpiry(row.createdAt, expiresAt, opts.extend, now);
  await db.update(drop).set({ pinned, expiresAt, updatedAt: now }).where(eq(drop.id, row.id));
  const dto = (await getDropDTO(row.id))!;
  await publish(spaceChannel(opts.space.id), "drop.updated", { drop: dto });
  return dto;
}

/** Hard-deletes drops and their blobs. Returns the ids actually removed. */
export async function burnDrops(ids: string[], ownerId: string, spaceId: string, reason: "deleted" | "expired"): Promise<string[]> {
  if (ids.length === 0) return [];
  const removed = await db.delete(drop).where(and(inArray(drop.id, ids), eq(drop.spaceId, spaceId))).returning();
  const keys = removed.flatMap((r) => [r.blobKey, r.thumbKey]).filter((k): k is string => !!k);
  if (keys.length) {
    await getStorage()
      .deleteKeys(keys)
      .catch((err) => log.warn({ count: keys.length, err: String(err) }, "blob delete failed; lifecycle rule will catch it"));
  }
  for (const r of removed) {
    if (r.uploadId && r.blobKey) await getStorage().abortMultipart(r.blobKey, r.uploadId).catch(() => {});
  }
  const removedIds = removed.map((r) => r.id);
  if (removedIds.length) await publish(spaceChannel(spaceId), "drop.burned", { ids: removedIds, reason });
  void ownerId;
  return removedIds;
}

export async function deleteDrop(space: Space, dropId: string) {
  const ids = await burnDrops([dropId], space.ownerId, space.id, "deleted");
  if (ids.length === 0) throw E.notFound("Drop");
}

/** Keeps a Space under its visible-drop cap by burning the oldest unpinned drops. */
export async function enforceDropCap(spaceId: string) {
  const rows = await db
    .select({ id: drop.id, pinned: drop.pinned, ownerId: space.ownerId })
    .from(drop)
    .innerJoin(space, eq(space.id, drop.spaceId))
    .where(and(eq(drop.spaceId, spaceId), eq(drop.status, "ready"), live()))
    .orderBy(asc(drop.id));
  const excess = rows.length - LIMITS.maxDropsPerSpace;
  if (excess <= 0) return;
  const victims = rows.filter((r) => !r.pinned).slice(0, excess);
  if (victims.length) await burnDrops(victims.map((v) => v.id), victims[0]!.ownerId, spaceId, "expired");
}

/** Burn everything expired in one Space (opportunistic, when the Space is opened). */
export async function burnExpiredInSpace(space: Space) {
  const rows = await db
    .select({ id: drop.id })
    .from(drop)
    .where(and(eq(drop.spaceId, space.id), lt(drop.expiresAt, new Date())))
    .limit(200);
  return burnDrops(rows.map((r) => r.id), space.ownerId, space.id, "expired");
}

/** Cron: expired drops + stale uploads, in batches. Idempotent. */
export async function burnExpiredEverywhere(batch = 500) {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - 60 * 60 * 1000);
  let burned = 0;
  let stale = 0;
  for (let i = 0; i < 20; i++) {
    const rows = await db
      .select({ id: drop.id, spaceId: drop.spaceId, ownerId: space.ownerId, status: drop.status, expiresAt: drop.expiresAt })
      .from(drop)
      .innerJoin(space, eq(space.id, drop.spaceId))
      .where(or(lt(drop.expiresAt, now), and(eq(drop.status, "uploading"), lt(drop.createdAt, staleBefore))))
      .limit(batch);
    if (rows.length === 0) break;
    const bySpace = new Map<string, { ownerId: string; ids: string[] }>();
    for (const r of rows) {
      const g = bySpace.get(r.spaceId) ?? { ownerId: r.ownerId, ids: [] };
      g.ids.push(r.id);
      bySpace.set(r.spaceId, g);
      if (r.status === "uploading" && r.expiresAt >= now) stale++;
      else burned++;
    }
    for (const [spaceId, g] of bySpace) await burnDrops(g.ids, g.ownerId, spaceId, "expired");
    if (rows.length < batch) break;
  }
  return { burned, staleUploads: stale };
}

export function isInlineImageMime(mime: string | null | undefined): boolean {
  return !!mime && (INLINE_IMAGE_MIMES as readonly string[]).includes(mime);
}
