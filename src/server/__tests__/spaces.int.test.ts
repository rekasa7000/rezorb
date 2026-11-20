import { beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { device, space, spaceGrant } from "@/server/db/schema";
import * as spacesRoute from "@/app/api/spaces/route";
import * as unlockRoute from "@/app/api/spaces/unlock/route";
import * as spaceRoute from "@/app/api/spaces/[id]/route";
import * as lockRoute from "@/app/api/spaces/[id]/lock/route";
import * as pinRoute from "@/app/api/spaces/[id]/pin/route";
import * as dropsRoute from "@/app/api/spaces/[id]/drops/route";
import * as devicesRoute from "@/app/api/devices/route";
import * as deviceRoute from "@/app/api/devices/[id]/route";
import { Device, json, newUser, resetLimits, secondDevice } from "../../../tests/helpers";

beforeEach(() => resetLimits());

async function createSpace(d: Device, name = "Work swap", pin = "482913") {
  const res = await d.call(spacesRoute.POST as never, "POST", "/api/spaces", {}, { name, pin });
  expect(res.status).toBe(201);
  return (await json(res)).space as { id: string; slug: string; name: string };
}

const unlock = (d: Device, name: string, pin: string) =>
  d.call(unlockRoute.POST as never, "POST", "/api/spaces/unlock", {}, { name, pin });

const beam = (d: Device, spaceId: string, text: string) =>
  d.call(dropsRoute.POST as never, "POST", `/api/spaces/${spaceId}/drops`, { id: spaceId }, { text });

const list = (d: Device, spaceId: string, qs = "") =>
  d.call(dropsRoute.GET as never, "GET", `/api/spaces/${spaceId}/drops${qs}`, { id: spaceId });

describe("accounts and devices", () => {
  it("binds each session to a device and reuses it on the same browser", async () => {
    const { email, device: a } = await newUser("dev");
    const first = await json(await a.call(devicesRoute.GET as never, "GET", "/api/devices"));
    expect(first.devices).toHaveLength(1);
    expect(first.devices[0].current).toBe(true);
    expect(first.devices[0].label).toContain("Chrome");

    await a.signIn(email); // same cookie jar → same device
    const again = await json(await a.call(devicesRoute.GET as never, "GET", "/api/devices"));
    expect(again.devices).toHaveLength(1);

    const b = await secondDevice(email);
    const both = await json(await b.call(devicesRoute.GET as never, "GET", "/api/devices"));
    expect(both.devices).toHaveLength(2);
    expect(both.devices.find((d: { current: boolean }) => d.current).label).toContain("Safari");
  });

  it("rejects anonymous calls", async () => {
    const res = await new Device().call(spacesRoute.GET as never, "GET", "/api/spaces");
    expect(res.status).toBe(401);
    expect((await json(res)).error.code).toBe("UNAUTHENTICATED");
  });
});

describe("spaces and PINs", () => {
  it("creates a space, grants the creator, and lists it", async () => {
    const { device: a } = await newUser("create");
    const s = await createSpace(a);
    const res = await a.call(spacesRoute.GET as never, "GET", "/api/spaces");
    const body = await json(res);
    expect(body.spaces).toHaveLength(1);
    expect(body.spaces[0]).toMatchObject({ id: s.id, name: "Work swap", unlockedHere: true });
    expect(a.jar.has(`rz_g_${s.id}`)).toBe(true);
  });

  it("rejects weak PINs, duplicate names (case-insensitive), and enforces the quota", async () => {
    const { device: a } = await newUser("quota");
    const weak = await a.call(spacesRoute.POST as never, "POST", "/api/spaces", {}, { name: "X", pin: "123456" });
    expect(weak.status).toBe(422);
    await createSpace(a, "Alpha");
    const dup = await a.call(spacesRoute.POST as never, "POST", "/api/spaces", {}, { name: "  alpha ", pin: "482913" });
    expect(dup.status).toBe(409);
    expect((await json(dup)).error.code).toBe("NAME_TAKEN");
    for (let i = 1; i < 10; i++) await createSpace(a, `S${i}`);
    const over = await a.call(spacesRoute.POST as never, "POST", "/api/spaces", {}, { name: "Eleventh", pin: "482913" });
    expect(over.status).toBe(403);
    expect((await json(over)).error.code).toBe("QUOTA_SPACES");
  });

  it("stores the PIN only as an Argon2id hash", async () => {
    const { device: a } = await newUser("hash");
    const s = await createSpace(a);
    const [row] = await db.select().from(space).where(eq(space.id, s.id));
    expect(row!.pinHash).toMatch(/^\$argon2id\$/);
    expect(row!.pinHash).not.toContain("482913");
  });

  it("unlocks on a second device with name + PIN (case-insensitive name)", async () => {
    const { email, device: a } = await newUser("unlock");
    const s = await createSpace(a);
    const b = await secondDevice(email);
    expect((await b.call(dropsRoute.GET as never, "GET", `/api/spaces/${s.id}/drops`, { id: s.id })).status).toBe(403);
    const res = await unlock(b, "WORK SWAP", "482913");
    expect(res.status).toBe(200);
    expect((await list(b, s.id)).status).toBe(200);
  });

  it("answers unknown names and wrong PINs the same way (no enumeration)", async () => {
    const { device: a } = await newUser("enum");
    await createSpace(a);
    const wrong = await unlock(a, "Work swap", "111222");
    const unknown = await unlock(a, "No such space", "111222");
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    const w = await json(wrong);
    const u = await json(unknown);
    expect(w.error.code).toBe(u.error.code);
    expect(w.error.message).toBe(u.error.message);
    expect(w.error.details.attemptsLeft).toBe(4); // we only reveal this for your own existing space
    expect(u.error.details).toBeUndefined();
  });

  it("seals the space after 5 wrong PINs, even for the right PIN, and doubles on repeat", async () => {
    const { device: a } = await newUser("seal");
    const s = await createSpace(a);
    for (let i = 4; i >= 1; i--) {
      const r = await unlock(a, "Work swap", "000111");
      expect((await json(r)).error.details.attemptsLeft).toBe(i);
    }
    const fifth = await unlock(a, "Work swap", "000111");
    expect(fifth.status).toBe(423);
    const body = await json(fifth);
    expect(body.error.code).toBe("SPACE_SEALED");
    const until = new Date(body.error.details.until).getTime();
    expect(until - Date.now()).toBeGreaterThan(14 * 60_000);
    expect(until - Date.now()).toBeLessThanOrEqual(15 * 60_000);

    const right = await unlock(a, "Work swap", "482913");
    expect(right.status).toBe(423); // sealed means sealed

    // Simulate the 15 minutes passing, then fail 5 more: the second lockout is 30 minutes.
    await db.update(space).set({ lockedUntil: new Date(Date.now() - 1000) }).where(eq(space.id, s.id));
    resetLimits(); // the per-minute limiter is a separate defence; this test is about lockout math
    for (let i = 0; i < 4; i++) await unlock(a, "Work swap", "000111");
    const secondRes = await unlock(a, "Work swap", "000111");
    expect(secondRes.status).toBe(423);
    const second = await json(secondRes);
    const mins = (new Date(second.error.details.until).getTime() - Date.now()) / 60_000;
    expect(mins).toBeGreaterThan(29);
    expect(mins).toBeLessThanOrEqual(30);
  });

  it("counts concurrent wrong guesses under the row lock", async () => {
    const { device: a } = await newUser("race");
    const s = await createSpace(a);
    const results = await Promise.all(Array.from({ length: 8 }, () => unlock(a, "Work swap", "000111")));
    const sealed = results.filter((r) => r.status === 423).length;
    expect(sealed).toBeGreaterThanOrEqual(3); // attempts 5..8 all see the seal
    const [row] = await db.select().from(space).where(eq(space.id, s.id));
    expect(row!.lockoutCount).toBe(1); // sealed once, not once per request
  });

  it("a successful unlock resets the failure counter", async () => {
    const { device: a } = await newUser("reset");
    await createSpace(a);
    await unlock(a, "Work swap", "000111");
    await unlock(a, "Work swap", "000111");
    expect((await unlock(a, "Work swap", "482913")).status).toBe(200);
    const next = await json(await unlock(a, "Work swap", "000111"));
    expect(next.error.details.attemptsLeft).toBe(4);
  });

  it("rate-limits unlock attempts per user", async () => {
    const { device: a } = await newUser("rate");
    await createSpace(a);
    let limited = 0;
    for (let i = 0; i < 14; i++) {
      const r = await unlock(a, "Nope", "000111"); // unknown name: never seals, only the limiter stops us
      if (r.status === 429) limited++;
    }
    expect(limited).toBeGreaterThan(0);
  });
});

describe("grants", () => {
  it("a grant for one space does not open another, and cookies can't be forged", async () => {
    const { device: a } = await newUser("iso");
    const s1 = await createSpace(a, "One");
    const s2 = await createSpace(a, "Two");
    const stolen = a.jar.get(`rz_g_${s1.id}`)!;
    a.jar.set(`rz_g_${s2.id}`, stolen); // present space 1's cookie for space 2
    expect((await list(a, s2.id)).status).toBe(403);
    a.jar.set(`rz_g_${s2.id}`, `${stolen.split(".")[0]}.AAAA`); // bad signature
    expect((await list(a, s2.id)).status).toBe(403);
    expect((await list(a, s1.id)).status).toBe(200);
  });

  it("another user cannot use your grant cookie", async () => {
    const { device: a } = await newUser("owner");
    const s = await createSpace(a);
    const { device: mallory } = await newUser("mallory");
    mallory.jar.set(`rz_g_${s.id}`, a.jar.get(`rz_g_${s.id}`)!);
    expect((await list(mallory, s.id)).status).toBe(403);
  });

  it("a grant is bound to its device", async () => {
    const { email, device: a } = await newUser("bind");
    const s = await createSpace(a);
    const b = await secondDevice(email);
    b.jar.set(`rz_g_${s.id}`, a.jar.get(`rz_g_${s.id}`)!);
    expect((await list(b, s.id)).status).toBe(403);
  });

  it("expired or revoked grants stop working; lock clears this device only", async () => {
    const { email, device: a } = await newUser("expire");
    const s = await createSpace(a);
    const b = await secondDevice(email);
    await unlock(b, "Work swap", "482913");

    await db.update(spaceGrant).set({ expiresAt: new Date(Date.now() - 1000) }).where(and(eq(spaceGrant.spaceId, s.id)));
    expect((await list(a, s.id)).status).toBe(403);
    expect((await list(b, s.id)).status).toBe(403);

    await unlock(a, "Work swap", "482913");
    await unlock(b, "Work swap", "482913");
    expect((await a.call(lockRoute.POST as never, "POST", `/api/spaces/${s.id}/lock`, { id: s.id })).status).toBe(204);
    expect((await list(a, s.id)).status).toBe(403);
    expect((await list(b, s.id)).status).toBe(200);
  });

  it("changing the PIN keeps the changer in and locks everyone else out", async () => {
    const { email, device: a } = await newUser("pinchange");
    const s = await createSpace(a);
    const b = await secondDevice(email);
    await unlock(b, "Work swap", "482913");
    expect((await list(b, s.id)).status).toBe(200);

    const bad = await a.call(pinRoute.POST as never, "POST", `/api/spaces/${s.id}/pin`, { id: s.id }, { currentPin: "000111", newPin: "907316" });
    expect(bad.status).toBe(401);
    const weak = await a.call(pinRoute.POST as never, "POST", `/api/spaces/${s.id}/pin`, { id: s.id }, { currentPin: "482913", newPin: "111111" });
    expect(weak.status).toBe(422);
    const ok = await a.call(pinRoute.POST as never, "POST", `/api/spaces/${s.id}/pin`, { id: s.id }, { currentPin: "482913", newPin: "907316" });
    expect(ok.status).toBe(200);

    expect((await list(a, s.id)).status).toBe(200);
    expect((await list(b, s.id)).status).toBe(403);
    expect((await unlock(b, "Work swap", "482913")).status).toBe(401); // old PIN is dead
    expect((await unlock(b, "Work swap", "907316")).status).toBe(200);
  });

  it("revoking a device kills its session and grants immediately", async () => {
    const { email, device: a } = await newUser("revoke");
    const s = await createSpace(a);
    const b = await secondDevice(email);
    await unlock(b, "Work swap", "482913");
    const devs = await json(await a.call(devicesRoute.GET as never, "GET", "/api/devices"));
    const bId = devs.devices.find((d: { current: boolean }) => !d.current).id as string;

    expect((await a.call(deviceRoute.DELETE as never, "DELETE", `/api/devices/${bId}`, { id: bId })).status).toBe(204);
    const res = await list(b, s.id);
    expect(res.status).toBe(401);
    expect((await b.call(spacesRoute.GET as never, "GET", "/api/spaces")).status).toBe(401);
    const [row] = await db.select().from(device).where(eq(device.id, bId));
    expect(row!.revokedAt).not.toBeNull();
    // a stranger can't revoke it either
    const { device: eve } = await newUser("eve");
    expect((await eve.call(deviceRoute.DELETE as never, "DELETE", `/api/devices/${bId}`, { id: bId })).status).toBe(404);
  });

  it("enforces the device limit", async () => {
    const { email } = await newUser("limit");
    for (let i = 0; i < 9; i++) await secondDevice(email, `Mozilla/5.0 (X11; Linux x86_64) Firefox/${100 + i}.0`);
    await expect(secondDevice(email, "Mozilla/5.0 (X11; Linux x86_64) Firefox/200.0")).rejects.toThrow(/QUOTA_DEVICES|device limit|403/i);
  });
});

describe("space management", () => {
  it("renames, deletes with confirmation, and a stranger gets 404/403", async () => {
    const { device: a } = await newUser("manage");
    const s = await createSpace(a);
    const patched = await a.call(spaceRoute.PATCH as never, "PATCH", `/api/spaces/${s.id}`, { id: s.id }, { name: "Renamed", accent: "ion", defaultLifetime: "1h" });
    expect((await json(patched)).space).toMatchObject({ name: "Renamed", accent: "ion", defaultLifetime: "1h" });

    const noConfirm = await a.call(spaceRoute.DELETE as never, "DELETE", `/api/spaces/${s.id}`, { id: s.id }, { confirmName: "nope" });
    expect(noConfirm.status).toBe(422);
    const { device: eve } = await newUser("eve2");
    expect((await eve.call(spaceRoute.DELETE as never, "DELETE", `/api/spaces/${s.id}`, { id: s.id }, { confirmName: "Renamed" })).status).toBe(403);
    expect((await a.call(spaceRoute.DELETE as never, "DELETE", `/api/spaces/${s.id}`, { id: s.id }, { confirmName: "renamed" })).status).toBe(204);
    expect((await db.select().from(space).where(eq(space.id, s.id))).length).toBe(0);
  });

  it("rejects cross-origin mutations and non-JSON bodies", async () => {
    const { device: a } = await newUser("csrf");
    const evil = a.req("POST", "/api/spaces", { name: "X", pin: "482913" }, { origin: "https://evil.example" });
    const res = await (spacesRoute.POST as never as (r: unknown, c: unknown) => Promise<Response>)(evil, { params: Promise.resolve({}) });
    expect(res.status).toBe(403);
    expect((await json(res)).error.code).toBe("BAD_ORIGIN");
    const textBody = a.req("POST", "/api/spaces", "name=X", { "content-type": "text/plain" });
    const res2 = await (spacesRoute.POST as never as (r: unknown, c: unknown) => Promise<Response>)(textBody, { params: Promise.resolve({}) });
    expect(res2.status).toBe(415);
  });
});

describe("beam & catch (text drops)", () => {
  it("a drop beamed on one device is listed on the other, in order, with its source device", async () => {
    const { email, device: a } = await newUser("beam");
    const s = await createSpace(a);
    const b = await secondDevice(email);
    await unlock(b, "Work swap", "482913");

    const r1 = await beam(a, s.id, "first");
    expect(r1.status).toBe(201);
    await beam(a, s.id, "second\nline");
    const { drops } = await json(await list(b, s.id));
    expect(drops.map((d: { text: string }) => d.text)).toEqual(["second\nline", "first"]);
    expect(drops[0].sourceDevice.label).toContain("Chrome");
    expect(drops[0].kind).toBe("text");
    expect(new Date(drops[0].expiresAt).getTime() - new Date(drops[0].createdAt).getTime()).toBe(24 * 3600_000);
  });

  it("classifies links and code, and re-validates a lying `link`", async () => {
    const { device: a } = await newUser("kinds");
    const s = await createSpace(a);
    const send = (body: object) => a.call(dropsRoute.POST as never, "POST", `/api/spaces/${s.id}/drops`, { id: s.id }, body);
    expect((await json(await send({ kind: "link", text: "https://example.com/x" }))).drop.kind).toBe("link");
    expect((await json(await send({ kind: "link", text: "not a url, just prose" }))).drop.kind).toBe("text");
    expect((await json(await send({ kind: "text", text: "javascript:alert(1)" }))).drop.kind).toBe("text");
  });

  it("rejects empty and oversized text; stores <script> verbatim", async () => {
    const { device: a } = await newUser("text");
    const s = await createSpace(a);
    expect((await beam(a, s.id, "")).status).toBe(422);
    expect((await beam(a, s.id, "x".repeat(1024 * 1024 + 1))).status).toBe(413);
    const evil = "<script>alert(1)</script>";
    const res = await json(await beam(a, s.id, evil));
    expect(res.drop.text).toBe(evil);
  });

  it("polling with ?since returns only newer drops", async () => {
    const { device: a } = await newUser("since");
    const s = await createSpace(a);
    await beam(a, s.id, "old");
    const first = await json(await list(a, s.id));
    await new Promise((r) => setTimeout(r, 15));
    await beam(a, s.id, "new");
    const next = await json(await list(a, s.id, `?since=${encodeURIComponent(first.serverTime)}`));
    expect(next.drops.map((d: { text: string }) => d.text)).toEqual(["new"]);
  });

  it("paginates newest-first with a cursor", async () => {
    const { device: a } = await newUser("page");
    const s = await createSpace(a);
    for (let i = 0; i < 5; i++) await beam(a, s.id, `d${i}`);
    const p1 = await json(await list(a, s.id, "?limit=2"));
    expect(p1.drops.map((d: { text: string }) => d.text)).toEqual(["d4", "d3"]);
    const p2 = await json(await list(a, s.id, `?limit=2&cursor=${p1.nextCursor}`));
    expect(p2.drops.map((d: { text: string }) => d.text)).toEqual(["d2", "d1"]);
    const p3 = await json(await list(a, s.id, `?limit=2&cursor=${p2.nextCursor}`));
    expect(p3.drops.map((d: { text: string }) => d.text)).toEqual(["d0"]);
    expect(p3.nextCursor).toBeNull();
  });
});
