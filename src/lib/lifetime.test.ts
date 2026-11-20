import { describe, expect, it } from "vitest";
import { expiryFor, extendedExpiry, unpinnedExpiry } from "./lifetime";

const H = 3_600_000;
const created = new Date("2026-01-01T00:00:00Z");

describe("lifetimes", () => {
  it("computes expiry from creation", () => {
    expect(expiryFor(created, "1h").getTime() - created.getTime()).toBe(H);
    expect(expiryFor(created, "24h").getTime() - created.getTime()).toBe(24 * H);
    expect(expiryFor(created, "1h", true).getTime() - created.getTime()).toBe(7 * 24 * H);
  });
  it("extend never shortens and never passes 7 days from creation", () => {
    const now = new Date(created.getTime() + 30 * H);
    const current = new Date(created.getTime() + 24 * H); // already expired-ish
    expect(extendedExpiry(created, current, "1h", now).getTime()).toBe(now.getTime() + H);
    const far = new Date(created.getTime() + 6 * 24 * H);
    expect(extendedExpiry(created, far, "1h", now)).toEqual(far);
    const late = new Date(created.getTime() + 6.9 * 24 * H);
    expect(extendedExpiry(created, current, "7d", late).getTime()).toBe(created.getTime() + 7 * 24 * H);
  });
  it("unpin never makes a drop vanish within 5 minutes", () => {
    const now = new Date(created.getTime() + 3 * 24 * H);
    expect(unpinnedExpiry(created, "24h", now).getTime()).toBe(now.getTime() + 5 * 60_000);
    expect(unpinnedExpiry(created, "7d", now).getTime()).toBe(created.getTime() + 7 * 24 * H);
  });
});
