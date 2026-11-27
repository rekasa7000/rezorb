import { beforeEach, describe, expect, it } from "vitest";
import * as usageRoute from "@/app/api/usage/route";
import * as spacesRoute from "@/app/api/spaces/route";
import { LIMITS } from "@/lib/limits";
import { json, newUser, resetLimits, secondDevice } from "../../../tests/helpers";

beforeEach(() => resetLimits());

describe("GET /api/usage", () => {
  it("requires sign-in", async () => {
    const { Device } = await import("../../../tests/helpers");
    const res = await new Device().call(usageRoute.GET as never, "GET", "/api/usage", {});
    expect(res.status).toBe(401);
  });

  it("reports spaces, devices and bytes against the limits, for this user only", async () => {
    const { email, device: a } = await newUser("usage");
    await secondDevice(email);
    await a.call(spacesRoute.POST as never, "POST", "/api/spaces", {}, { name: "One", pin: "482913" });
    await a.call(spacesRoute.POST as never, "POST", "/api/spaces", {}, { name: "Two", pin: "482913" });

    const u = (await json(await a.call(usageRoute.GET as never, "GET", "/api/usage", {}))).usage;
    expect(u).toMatchObject({
      storageBytes: 0,
      storageMaxBytes: LIMITS.maxStorageBytes,
      spaces: 2,
      spacesMax: LIMITS.maxSpacesPerUser,
      devices: 2,
      devicesMax: LIMITS.maxDevicesPerUser,
    });

    const { device: other } = await newUser("usage-other");
    const o = (await json(await other.call(usageRoute.GET as never, "GET", "/api/usage", {}))).usage;
    expect(o.spaces).toBe(0);
  });
});
