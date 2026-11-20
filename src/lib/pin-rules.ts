import { LIMITS } from "./limits";

/** Pure PIN rules, shared by client (live feedback) and server (enforcement). */

export type PinProblem = "format" | "repeated" | "sequence" | "pattern" | "common";

const COMMON = new Set([
  "123123", "112233", "121212", "123321", "696969", "159753", "147258", "135790",
  "654321", "111222", "101010", "202020", "123456", "1234567", "12345678", "87654321",
  "11223344", "12341234", "00000000",
]);

export function pinProblem(pin: string): PinProblem | null {
  if (!new RegExp(`^\\d{${LIMITS.pinMinLength},${LIMITS.pinMaxLength}}$`).test(pin)) return "format";
  if (/^(\d)\1+$/.test(pin)) return "repeated";
  if (COMMON.has(pin)) return "common";
  const d = [...pin].map(Number);
  const steps = d.slice(1).map((n, i) => n - d[i]!);
  if (steps.every((s) => s === 1) || steps.every((s) => s === -1)) return "sequence";
  // Repeating short blocks: 121212, 123123, 12341234
  for (let len = 1; len <= pin.length / 2; len++) {
    if (pin.length % len === 0 && pin.slice(0, len).repeat(pin.length / len) === pin) return "pattern";
  }
  return null;
}

export const PIN_MESSAGES: Record<PinProblem, string> = {
  format: `Use ${LIMITS.pinMinLength}–${LIMITS.pinMaxLength} digits.`,
  repeated: "That's one digit repeated. Pick something less guessable.",
  sequence: "Straight runs like 123456 are too easy to guess.",
  pattern: "Repeating patterns are too easy to guess.",
  common: "That PIN is on everyone's guess list.",
};

/** Lockout duration after the Nth lockout in a row (1-based): 15m, 30m, 60m … capped at 24h. */
export function lockoutDurationMs(lockoutNumber: number): number {
  const n = Math.max(1, lockoutNumber);
  return Math.min(LIMITS.baseLockoutMs * 2 ** (n - 1), LIMITS.maxLockoutMs);
}

/** Lockout count decays after 24h with no lockout. */
export function effectiveLockoutCount(count: number, lastLockoutAt: Date | null, now = new Date()): number {
  if (!lastLockoutAt) return count;
  return now.getTime() - lastLockoutAt.getTime() > LIMITS.maxLockoutMs ? 0 : count;
}
