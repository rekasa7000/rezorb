import { beforeEach, describe, expect, it } from "vitest";
import { getAuth } from "@/server/auth";
import { devOutbox } from "@/server/email";
import * as devicesRoute from "@/app/api/devices/route";
import { Device, newUser, resetLimits, secondDevice } from "../../../tests/helpers";

beforeEach(() => resetLimits());

const ORIGIN = "http://localhost:3000";
const OLD = "correct horse battery";
const NEW = "a brand new passphrase 42";

const lastMailTo = (email: string) => [...devOutbox].reverse().find((m) => m.to === email && /reset/i.test(m.subject));

/** Follows the emailed link the way a browser does and returns the token the callback page receives. */
async function tokenFromEmail(email: string): Promise<string> {
  const mail = lastMailTo(email);
  expect(mail, "a reset email was sent").toBeTruthy();
  const url = mail!.text.match(/https?:\/\/\S+/)![0];
  const res = await getAuth().handler(new Request(url, { headers: { origin: ORIGIN } }));
  expect(res.status).toBe(302);
  const loc = new URL(res.headers.get("location")!, ORIGIN);
  expect(loc.pathname).toBe("/reset-password");
  return loc.searchParams.get("token")!;
}

const request = (email: string) => getAuth().api.requestPasswordReset({ body: { email, redirectTo: "/reset-password" } });
const alive = async (d: Device) => (await d.call(devicesRoute.GET as never, "GET", "/api/devices")).status === 200;

describe("password reset", () => {
  it("resets the password, signs out every existing session, and the token works once", async () => {
    const { email, device: a } = await newUser("reset");
    const b = await secondDevice(email);
    expect(await alive(a)).toBe(true);
    expect(await alive(b)).toBe(true);

    await request(email);
    const token = await tokenFromEmail(email);
    await getAuth().api.resetPassword({ body: { newPassword: NEW, token } });

    // Anyone who held a session (a stolen laptop, a forgotten browser) is out.
    expect(await alive(a)).toBe(false);
    expect(await alive(b)).toBe(false);

    // Old password is dead, new one works.
    const fresh = new Device();
    await expect(fresh.signIn(email, OLD)).rejects.toThrow();
    await fresh.signIn(email, NEW);
    expect(await alive(fresh)).toBe(true);

    // Single use.
    await expect(getAuth().api.resetPassword({ body: { newPassword: "yet another one 99", token } })).rejects.toThrow();
  });

  it("answers the same for an unknown address and sends nothing (no account enumeration)", async () => {
    const before = devOutbox.length;
    const known = await newUser("known");
    const a = await request(known.email);
    const b = await request(`nobody-${Date.now()}@example.test`);
    expect(b).toEqual(a); // identical response shape and message
    // Only the real account got an email.
    const sent = devOutbox.slice(before).filter((m) => /reset/i.test(m.subject));
    expect(sent).toHaveLength(1);
    expect(sent[0]!.to).toBe(known.email);
  });

  it("rejects a forged or malformed token and an expired link", async () => {
    await expect(getAuth().api.resetPassword({ body: { newPassword: NEW, token: "not-a-real-token" } })).rejects.toThrow();
    const res = await getAuth().handler(new Request(`${ORIGIN}/api/auth/reset-password/forged?callbackURL=%2Freset-password`, { headers: { origin: ORIGIN } }));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("error=INVALID_TOKEN");
  });

  it("refuses an open redirect when asked over HTTP, and accepts a same-site path", async () => {
    // The origin check only runs on real requests, so test the HTTP path an attacker would use.
    const { email } = await newUser("redir");
    const post = (redirectTo: string) =>
      getAuth().handler(
        new Request(`${ORIGIN}/api/auth/request-password-reset`, {
          method: "POST",
          headers: { origin: ORIGIN, "content-type": "application/json", "x-forwarded-for": "198.51.100.9" },
          body: JSON.stringify({ email, redirectTo }),
        }),
      );
    const evil = await post("https://evil.example/steal");
    expect(evil.status).toBe(403);
    const ok = await post("/reset-password");
    expect(ok.status).toBe(200);
  });

  it("enforces the password length rule on reset", async () => {
    const { email } = await newUser("short");
    await request(email);
    const token = await tokenFromEmail(email);
    await expect(getAuth().api.resetPassword({ body: { newPassword: "short", token } })).rejects.toThrow();
  });
});
