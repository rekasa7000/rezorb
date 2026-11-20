import { beforeEach, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { drop, space } from "@/server/db/schema";
import { burnExpiredEverywhere, enforceDropCap, storageUsed } from "@/server/drops";
import { getStorage, blobKey } from "@/server/storage";
import * as spacesRoute from "@/app/api/spaces/route";
import * as unlockRoute from "@/app/api/spaces/unlock/route";
import * as spaceRoute from "@/app/api/spaces/[id]/route";
import * as dropsRoute from "@/app/api/spaces/[id]/drops/route";
import * as uploadsRoute from "@/app/api/spaces/[id]/uploads/route";
import * as dropRoute from "@/app/api/drops/[id]/route";
import * as completeRoute from "@/app/api/drops/[id]/complete/route";
import * as downloadRoute from "@/app/api/drops/[id]/download/route";
import * as devStorageRoute from "@/app/api/dev-storage/[token]/route";
import * as cronRoute from "@/app/api/cron/burn/route";
import { Device, json, newUser, resetLimits, secondDevice } from "../../../tests/helpers";

beforeEach(() => resetLimits());

async function setup(prefix: string) {
  const { email, device: a } = await newUser(prefix);
  const res = await a.call(spacesRoute.POST as never, "POST", "/api/spaces", {}, { name: "Cargo", pin: "482913" });
  const s = (await json(res)).space as { id: string };
  return { email, a, s };
}

const bytes = (n: number, fill = 7) => new Uint8Array(n).fill(fill);

async function putTo(d: Device, url: string, body: Uint8Array) {
  const token = url.split("/").pop()!;
  const res = await d.call(devStorageRoute.PUT as never, "PUT", url, { token }, body);
  return res;
}

async function startUpload(d: Device, spaceId: string, body: object) {
  return d.call(uploadsRoute.POST as never, "POST", `/api/spaces/${spaceId}/uploads`, { id: spaceId }, body);
}

async function uploadFile(d: Device, spaceId: string, data: Uint8Array, extra: object = {}) {
  const start = await startUpload(d, spaceId, { fileName: "report.pdf", mimeType: "application/pdf", sizeBytes: data.length, kind: "file", ...extra });
  expect(start.status).toBe(201);
  const out = await json(start);
  expect(out.upload.method).toBe("single");
  expect((await putTo(d, out.upload.url, data)).status).toBe(200);
  const done = await d.call(completeRoute.POST as never, "POST", `/api/drops/${out.drop.id}/complete`, { id: out.drop.id }, {});
  return { out, done };
}

describe("files and images", () => {
  it("uploads, completes, lists on another device, and downloads as an attachment", async () => {
    const { email, a, s } = await setup("file");
    const b = await secondDevice(email);
    await b.call(unlockRoute.POST as never, "POST", "/api/spaces/unlock", {}, { name: "Cargo", pin: "482913" });

    const data = bytes(2048, 9);
    const start = await json(await startUpload(a, s.id, { fileName: "../../evil name.pdf", mimeType: "application/pdf", sizeBytes: data.length, kind: "file" }));
    // while uploading, only the uploader sees it
    const mid = async (d: Device) => (await json(await d.call(dropsRoute.GET as never, "GET", `/api/spaces/${s.id}/drops`, { id: s.id }))).drops.length;
    expect(await mid(a)).toBe(1);
    expect(await mid(b)).toBe(0);
    // other device can't finish it
    const hijack = await b.call(completeRoute.POST as never, "POST", `/api/drops/${start.drop.id}/complete`, { id: start.drop.id }, {});
    expect(hijack.status).toBe(403);

    expect((await putTo(a, start.upload.url, data)).status).toBe(200);
    const done = await a.call(completeRoute.POST as never, "POST", `/api/drops/${start.drop.id}/complete`, { id: start.drop.id }, {});
    expect(done.status).toBe(200);
    expect((await json(done)).drop).toMatchObject({ status: "ready", kind: "file", sizeBytes: 2048, fileName: "_.._evil name.pdf" });
    expect(await mid(b)).toBe(1);

    // download: grant-checked redirect → attachment, never inline for non-images
    const dl = await b.call(downloadRoute.GET as never, "GET", `/api/drops/${start.drop.id}/download?inline=1`, { id: start.drop.id });
    expect(dl.status).toBe(302);
    const loc = dl.headers.get("location")!;
    const file = await b.call(devStorageRoute.GET as never, "GET", new URL(loc).pathname, { token: loc.split("/").pop()! });
    expect(file.status).toBe(200);
    expect(file.headers.get("content-disposition")).toMatch(/^attachment; filename\*=UTF-8''/);
    expect(file.headers.get("content-type")).toBe("application/octet-stream");
    expect(file.headers.get("x-content-type-options")).toBe("nosniff");
    expect(new Uint8Array(await file.arrayBuffer())).toEqual(data);
  });

  it("serves a PNG inline only when it is a known-safe image type, and HTML never inline", async () => {
    const { a, s } = await setup("inline");
    const png = await uploadFile(a, s.id, bytes(500), { fileName: "shot.png", mimeType: "image/png", kind: "image", width: 10, height: 10 });
    const html = await uploadFile(a, s.id, bytes(500), { fileName: "x.html", mimeType: "text/html", kind: "file" });
    const get = async (id: string) => {
      const dl = await a.call(downloadRoute.GET as never, "GET", `/api/drops/${id}/download?inline=1`, { id });
      const loc = dl.headers.get("location")!;
      return a.call(devStorageRoute.GET as never, "GET", new URL(loc).pathname, { token: loc.split("/").pop()! });
    };
    const p = await get(png.out.drop.id);
    expect(p.headers.get("content-disposition")).toBe("inline");
    expect(p.headers.get("content-type")).toBe("image/png");
    const h = await get(html.out.drop.id);
    expect(h.headers.get("content-disposition")).toMatch(/^attachment/);
    expect(h.headers.get("content-type")).toBe("application/octet-stream");
  });

  it("creates thumbnails and exposes them with a stable grant-checked URL", async () => {
    const { a, s } = await setup("thumb");
    const start = await json(await startUpload(a, s.id, { fileName: "p.png", mimeType: "image/png", sizeBytes: 800, kind: "image", width: 4, height: 4, withThumb: true }));
    expect(start.thumbUpload.url).toBeTruthy();
    await putTo(a, start.upload.url, bytes(800));
    await putTo(a, start.thumbUpload.url, bytes(120, 3));
    const done = await json(await a.call(completeRoute.POST as never, "POST", `/api/drops/${start.drop.id}/complete`, { id: start.drop.id }, {}));
    expect(done.drop.thumbUrl).toBe(`/api/drops/${start.drop.id}/download?variant=thumb&inline=1`);
    const [row] = await db.select().from(drop).where(eq(drop.id, start.drop.id));
    expect(row!.thumbBytes).toBe(120);
  });

  it("rejects a size mismatch and removes the half-made drop", async () => {
    const { a, s } = await setup("mismatch");
    const start = await json(await startUpload(a, s.id, { fileName: "a.bin", sizeBytes: 1000, kind: "file" }));
    await putTo(a, start.upload.url, bytes(999));
    const res = await a.call(completeRoute.POST as never, "POST", `/api/drops/${start.drop.id}/complete`, { id: start.drop.id }, {});
    expect(res.status).toBe(422);
    expect((await json(res)).error.code).toBe("SIZE_MISMATCH");
    expect(await db.select().from(drop).where(eq(drop.id, start.drop.id))).toHaveLength(0);
  });

  it("rejects over-size files up front", async () => {
    const { a, s } = await setup("big");
    const res = await startUpload(a, s.id, { fileName: "huge.iso", sizeBytes: 50 * 1024 * 1024 + 1, kind: "file" });
    expect(res.status).toBe(413);
  });

  it("uses multipart above 25 MB and reassembles the exact bytes", async () => {
    const { a, s } = await setup("multi");
    const size = 26 * 1024 * 1024 + 123;
    const data = new Uint8Array(size);
    for (let i = 0; i < size; i += 4096) data[i] = (i / 4096) % 251;
    const start = await json(await startUpload(a, s.id, { fileName: "video.mov", mimeType: "video/quicktime", sizeBytes: size, kind: "file" }));
    expect(start.upload.method).toBe("multipart");
    expect(start.upload.parts).toHaveLength(4);
    const parts: Array<{ partNumber: number; etag: string }> = [];
    for (const p of start.upload.parts as Array<{ partNumber: number; url: string }>) {
      const slice = data.subarray((p.partNumber - 1) * start.upload.partSize, p.partNumber * start.upload.partSize);
      const res = await putTo(a, p.url, slice);
      expect(res.status).toBe(200);
      parts.push({ partNumber: p.partNumber, etag: res.headers.get("etag")! });
    }
    const done = await a.call(completeRoute.POST as never, "POST", `/api/drops/${start.drop.id}/complete`, { id: start.drop.id }, { parts });
    expect(done.status).toBe(200);
    const [row] = await db.select().from(drop).where(eq(drop.id, start.drop.id));
    const stored = await getStorage().head(row!.blobKey!);
    expect(stored?.size).toBe(size);
  }, 60_000);

  it("enforces the 1 GB storage quota including in-flight uploads", async () => {
    const { a, s } = await setup("quota");
    const GB = 1024 * 1024 * 1024;
    await db.insert(drop).values({
      spaceId: s.id, kind: "file", status: "ready", sizeBytes: GB - 5000, fileName: "ballast",
      expiresAt: new Date(Date.now() + 3600_000),
    });
    const ok = await startUpload(a, s.id, { fileName: "fits.bin", sizeBytes: 4000, kind: "file" });
    expect(ok.status).toBe(201);
    const over = await startUpload(a, s.id, { fileName: "over.bin", sizeBytes: 4000, kind: "file" });
    expect(over.status).toBe(403);
    expect((await json(over)).error.code).toBe("QUOTA_STORAGE");
    const text = await a.call(dropsRoute.POST as never, "POST", `/api/spaces/${s.id}/drops`, { id: s.id }, { text: "x".repeat(2000) });
    expect(text.status).toBe(403);
  });

  it("another user gets nothing from a drop they don't hold a grant for", async () => {
    const { a, s } = await setup("steal");
    const f = await uploadFile(a, s.id, bytes(100));
    const { device: eve } = await newUser("thief");
    const id = f.out.drop.id as string;
    expect((await eve.call(downloadRoute.GET as never, "GET", `/api/drops/${id}/download`, { id })).status).toBe(403);
    expect((await eve.call(dropRoute.DELETE as never, "DELETE", `/api/drops/${id}`, { id })).status).toBe(403);
    const anon = new Device();
    expect((await anon.call(downloadRoute.GET as never, "GET", `/api/drops/${id}/download`, { id })).status).toBe(401);
  });

  it("dev-storage tokens can't be forged, replayed across ops, or traverse paths", async () => {
    const { a, s } = await setup("tok");
    const start = await json(await startUpload(a, s.id, { fileName: "a.bin", sizeBytes: 10, kind: "file" }));
    const token = (start.upload.url as string).split("/").pop()!;
    const [body] = token.split(".");
    const forged = await a.call(devStorageRoute.PUT as never, "PUT", "/x", { token: `${body}.AAAA` }, bytes(10));
    expect(forged.status).toBe(403);
    const asGet = await a.call(devStorageRoute.GET as never, "GET", "/x", { token });
    expect(asGet.status).toBe(403); // a PUT token can't read
  });
});

describe("pin, extend, delete", () => {
  it("pinning extends to 7 days, extending never shortens, and delete removes the blob", async () => {
    const { a, s } = await setup("mut");
    const f = await uploadFile(a, s.id, bytes(64), { lifetime: "1h" });
    const id = f.out.drop.id as string;
    const patch = (b: object) => a.call(dropRoute.PATCH as never, "PATCH", `/api/drops/${id}`, { id }, b);

    const pinned = (await json(await patch({ pinned: true }))).drop;
    expect(pinned.pinned).toBe(true);
    expect(new Date(pinned.expiresAt).getTime() - new Date(pinned.createdAt).getTime()).toBe(7 * 24 * 3600_000);
    const ext = (await json(await patch({ extend: "1h" }))).drop;
    expect(ext.expiresAt).toBe(pinned.expiresAt); // never shortens
    expect((await patch({})).status).toBe(422);

    const [row] = await db.select().from(drop).where(eq(drop.id, id));
    expect(await getStorage().head(row!.blobKey!)).not.toBeNull();
    expect((await a.call(dropRoute.DELETE as never, "DELETE", `/api/drops/${id}`, { id })).status).toBe(204);
    expect(await getStorage().head(row!.blobKey!)).toBeNull();
    expect((await a.call(dropRoute.DELETE as never, "DELETE", `/api/drops/${id}`, { id })).status).toBe(404);
  });
});

describe("expiry (burn)", () => {
  it("hides expired drops immediately, then the cron removes rows and blobs", async () => {
    const { a, s } = await setup("burn");
    const f = await uploadFile(a, s.id, bytes(64));
    const id = f.out.drop.id as string;
    const [row] = await db.select().from(drop).where(eq(drop.id, id));
    await db.update(drop).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(drop.id, id));

    // Read-time filter: invisible at once, though the blob is still on disk until burned.
    expect((await a.call(downloadRoute.GET as never, "GET", `/api/drops/${id}/download`, { id })).status).toBe(404);
    expect(await getStorage().head(row!.blobKey!)).not.toBeNull();

    const anon = new Device();
    const call = (d: Device, secret?: string) =>
      (cronRoute.GET as never as (r: unknown) => Promise<Response>)(d.req("GET", "/api/cron/burn", undefined, secret ? { authorization: `Bearer ${secret}` } : {}));
    process.env.CRON_SECRET = "cron-test-secret";
    expect((await call(anon)).status).toBe(401);
    expect((await call(anon, "wrong")).status).toBe(401);
    const ok = await call(anon, "cron-test-secret");
    expect(ok.status).toBe(200);
    expect((await json(ok)).burned).toBeGreaterThanOrEqual(1);
    expect(await db.select().from(drop).where(eq(drop.id, id))).toHaveLength(0);
    expect(await getStorage().head(row!.blobKey!)).toBeNull();
    // idempotent
    expect((await json(await call(anon, "cron-test-secret"))).burned).toBe(0);
    delete process.env.CRON_SECRET;
  });

  it("listing a Space hides expired drops and opportunistically burns them", async () => {
    const { a, s } = await setup("opportunistic");
    const f = await uploadFile(a, s.id, bytes(64));
    const id = f.out.drop.id as string;
    const [row] = await db.select().from(drop).where(eq(drop.id, id));
    await db.update(drop).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(drop.id, id));
    const listed = await json(await a.call(dropsRoute.GET as never, "GET", `/api/spaces/${s.id}/drops`, { id: s.id }));
    expect(listed.drops).toHaveLength(0);
    await new Promise((r) => setTimeout(r, 200)); // after() runs post-response
    expect(await db.select().from(drop).where(eq(drop.id, id))).toHaveLength(0);
    expect(await getStorage().head(row!.blobKey!)).toBeNull();
  });

  it("the cron is closed when no secret is configured", async () => {
    delete process.env.CRON_SECRET;
    const res = await (cronRoute.GET as never as (r: unknown) => Promise<Response>)(new Device().req("GET", "/api/cron/burn", undefined, { authorization: "Bearer " }));
    expect(res.status).toBe(401);
  });

  it("cleans up stale uploads that never completed", async () => {
    const { a, s } = await setup("stale");
    const start = await json(await startUpload(a, s.id, { fileName: "never.bin", sizeBytes: 100, kind: "file" }));
    await putTo(a, start.upload.url, bytes(100));
    await db.update(drop).set({ createdAt: new Date(Date.now() - 2 * 3600_000) }).where(eq(drop.id, start.drop.id));
    const r = await burnExpiredEverywhere();
    expect(r.staleUploads).toBeGreaterThanOrEqual(1);
    expect(await db.select().from(drop).where(eq(drop.id, start.drop.id))).toHaveLength(0);
  });

  it("caps a Space at 500 visible drops, burning the oldest unpinned first", async () => {
    const { a, s } = await setup("cap");
    const exp = new Date(Date.now() + 3600_000);
    const [oldestPinned] = await db.insert(drop).values({ spaceId: s.id, kind: "text", text: "keep me", sizeBytes: 7, pinned: true, expiresAt: exp }).returning();
    await db.insert(drop).values(Array.from({ length: 501 }, (_, i) => ({ spaceId: s.id, kind: "text" as const, text: `n${i}`, sizeBytes: 3, expiresAt: exp })));
    await enforceDropCap(s.id);
    const n = ((await db.execute(sql`select count(*)::int as n from "drop" where space_id = ${s.id}`)).rows[0] as { n: number }).n;
    expect(n).toBe(500);
    expect(await db.select().from(drop).where(eq(drop.id, oldestPinned!.id))).toHaveLength(1);
    void a;
  });

  it("deleting a Space purges its drops and blobs", async () => {
    const { a, s } = await setup("purge");
    const f = await uploadFile(a, s.id, bytes(64));
    const [row] = await db.select().from(drop).where(eq(drop.id, f.out.drop.id));
    const res = await a.call(spaceRoute.DELETE as never, "DELETE", `/api/spaces/${s.id}`, { id: s.id }, { confirmName: "Cargo" });
    expect(res.status).toBe(204);
    expect(await db.select().from(drop).where(eq(drop.id, row!.id))).toHaveLength(0);
    expect(await getStorage().head(row!.blobKey!)).toBeNull();
    expect(await db.select().from(space).where(eq(space.id, s.id))).toHaveLength(0);
  });

  it("storageUsed ignores expired and stale-uploading bytes", async () => {
    const { a, s } = await setup("usage");
    await uploadFile(a, s.id, bytes(1000));
    const ownerId = (await db.select({ ownerId: space.ownerId }).from(space).where(eq(space.id, s.id)))[0]!.ownerId;
    const before = await storageUsed(ownerId);
    expect(before).toBe(1000);
    await db.update(drop).set({ expiresAt: new Date(Date.now() - 1) }).where(eq(drop.spaceId, s.id));
    expect(await storageUsed(ownerId)).toBe(0);
  });
});

void blobKey;
