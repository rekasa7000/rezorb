import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { device, pairing } from "@/server/db/schema";
import * as devicesRoute from "@/app/api/devices/route";
import { Device, json, newUser, resetLimits } from "../../../tests/helpers";

beforeEach(() => resetLimits());

const phoneUa = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1";

async function start(newDevice: Device) {
  const res = await newDevice.auth("POST", "/pairing/start", {});
  expect(res.status).toBe(200);
  return (await json(res)) as { userCode: string; secret: string; expiresAt: string };
}

const poll = async (d: Device, p: { userCode: string; secret: string }) =>
  (await json(await d.auth("POST", "/pairing/poll", p))) as { status: string };

describe("device pairing", () => {
  it("signs in a new device with no password after a signed-in device approves", async () => {
    const { device: laptop } = await newUser("pair");
    const work = new Device();
    const p = await start(work);
    expect(p.userCode).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    expect((await poll(work, p)).status).toBe("pending");

    const info = await json(await laptop.auth("POST", "/pairing/info", { code: p.userCode.toLowerCase().replace("-", " ") }));
    expect(info.label).toBeTruthy();
    expect(info.userCode).toBe(p.userCode);

    expect((await laptop.auth("POST", "/pairing/decide", { code: p.userCode, approve: true })).status).toBe(200);
    expect((await poll(work, p)).status).toBe("approved");

    // The new device is now signed in, bound to its own device row.
    const devs = await json(await work.call(devicesRoute.GET as never, "GET", "/api/devices"));
    expect(devs.devices).toHaveLength(2);
    expect(devs.devices.find((d: { current: boolean }) => d.current)).toBeTruthy();
    // single use
    expect((await poll(work, p)).status).toBe("expired");
  });

  it("labels the requesting device on the approval screen", async () => {
    const { device: laptop } = await newUser("label");
    const phone = new Device(phoneUa);
    const p = await start(phone);
    const info = await json(await laptop.auth("POST", "/pairing/info", { code: p.userCode }));
    expect(info.label).toContain("Safari");
    expect(info.kind).toBe("phone");
  });

  it("denied requests never sign in", async () => {
    const { device: laptop } = await newUser("deny");
    const other = new Device();
    const p = await start(other);
    await laptop.auth("POST", "/pairing/decide", { code: p.userCode, approve: false });
    expect((await poll(other, p)).status).toBe("denied");
    expect((await other.call(devicesRoute.GET as never, "GET", "/api/devices")).status).toBe(401);
  });

  it("needs the secret: a bystander who sees the code on screen can't hijack the session", async () => {
    const { device: laptop } = await newUser("hijack");
    const victim = new Device();
    const p = await start(victim);
    await laptop.auth("POST", "/pairing/decide", { code: p.userCode, approve: true });
    const attacker = new Device();
    expect((await poll(attacker, { userCode: p.userCode, secret: "f".repeat(64) })).status).toBe("expired");
    expect((await attacker.call(devicesRoute.GET as never, "GET", "/api/devices")).status).toBe(401);
    expect((await poll(victim, p)).status).toBe("approved"); // the real device still works
  });

  it("expired codes can't be approved or polled", async () => {
    const { device: laptop } = await newUser("expired");
    const d = new Device();
    const p = await start(d);
    await db.update(pairing).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(pairing.userCode, p.userCode));
    expect((await laptop.auth("POST", "/pairing/info", { code: p.userCode })).status).toBe(404);
    expect((await laptop.auth("POST", "/pairing/decide", { code: p.userCode, approve: true })).status).toBe(404);
    expect((await poll(d, p)).status).toBe("expired");
  });

  it("only signed-in users can look up or approve a code", async () => {
    const d = new Device();
    const p = await start(d);
    expect((await new Device().auth("POST", "/pairing/info", { code: p.userCode })).status).toBe(401);
    expect((await new Device().auth("POST", "/pairing/decide", { code: p.userCode, approve: true })).status).toBe(401);
  });

  it("rate-limits code guessing", async () => {
    const { device: laptop } = await newUser("guess");
    let limited = false;
    for (let i = 0; i < 14; i++) {
      const res = await laptop.auth("POST", "/pairing/info", { code: "AAAA-AAAA" });
      if (res.status === 429) limited = true;
    }
    expect(limited).toBe(true);
  });

});
