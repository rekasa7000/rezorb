import { describe, expect, it } from "vitest";
import { effectiveLockoutCount, lockoutDurationMs, pinProblem } from "./pin-rules";

describe("pinProblem", () => {
  it.each(["482913", "907316", "19283746", "5072941"])("accepts %s", (pin) => {
    expect(pinProblem(pin)).toBeNull();
  });
  it.each([
    ["12345", "format"],
    ["123456789", "format"],
    ["12a456", "format"],
    ["", "format"],
    ["000000", "repeated"],
    ["99999999", "repeated"],
    ["234567", "sequence"],
    ["876543", "sequence"],
    ["123456", "common"],
    ["121212", "common"],
    ["135135", "pattern"],
    ["48484848", "pattern"],
  ])("rejects %s as %s", (pin, why) => {
    expect(pinProblem(pin)).toBe(why);
  });
});

describe("lockout math", () => {
  it("doubles from 15 minutes and caps at 24 hours", () => {
    const min = 60_000;
    expect(lockoutDurationMs(1)).toBe(15 * min);
    expect(lockoutDurationMs(2)).toBe(30 * min);
    expect(lockoutDurationMs(3)).toBe(60 * min);
    expect(lockoutDurationMs(7)).toBe(16 * 60 * min); // 15m × 2^6
    expect(lockoutDurationMs(8)).toBe(24 * 60 * min); // capped
    expect(lockoutDurationMs(50)).toBe(24 * 60 * min);
  });
  it("decays the lockout count after 24h without a lockout", () => {
    const now = new Date("2026-01-02T12:00:00Z");
    expect(effectiveLockoutCount(3, new Date("2026-01-02T06:00:00Z"), now)).toBe(3);
    expect(effectiveLockoutCount(3, new Date("2026-01-01T11:00:00Z"), now)).toBe(0);
    expect(effectiveLockoutCount(2, null, now)).toBe(2);
  });
});
