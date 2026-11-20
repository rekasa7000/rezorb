import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "./env";
import { E } from "./http";

export interface Rule {
  /** Namespace, e.g. "unlock:user". */
  name: string;
  limit: number;
  windowSec: number;
}

export interface RateResult {
  success: boolean;
  remaining: number;
  resetSeconds: number;
}

/** Pre-defined rules, kept together so docs/API.md stays easy to audit. */
export const RULES = {
  unlockUser: { name: "unlock:user", limit: 10, windowSec: 60 },
  unlockIp: { name: "unlock:ip", limit: 30, windowSec: 60 },
  createSpace: { name: "space:create", limit: 20, windowSec: 3600 },
  beam: { name: "beam", limit: 120, windowSec: 60 },
  upload: { name: "upload", limit: 60, windowSec: 60 },
  download: { name: "download", limit: 300, windowSec: 60 },
  pairStart: { name: "pair:start", limit: 10, windowSec: 600 },
  pairPoll: { name: "pair:poll", limit: 120, windowSec: 60 },
  pairLookup: { name: "pair:lookup", limit: 10, windowSec: 600 },
  realtimeToken: { name: "rt:token", limit: 60, windowSec: 60 },
} satisfies Record<string, Rule>;

const upstash = new Map<string, Ratelimit>();
let redis: Redis | null = null;

function upstashFor(rule: Rule): Ratelimit | null {
  const cfg = env.redis;
  if (!cfg) return null;
  redis ??= new Redis({ url: cfg.url, token: cfg.token });
  const k = `${rule.name}:${rule.limit}:${rule.windowSec}`;
  let rl = upstash.get(k);
  if (!rl) {
    rl = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(rule.limit, `${rule.windowSec} s`),
      prefix: `rz:${rule.name}`,
    });
    upstash.set(k, rl);
  }
  return rl;
}

// In-memory fallback (local dev / tests / missing Redis). Per-instance only.
const memory = new Map<string, number[]>();

function memoryLimit(rule: Rule, key: string): RateResult {
  const now = Date.now();
  const windowMs = rule.windowSec * 1000;
  const k = `${rule.name}:${key}`;
  const hits = (memory.get(k) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= rule.limit) {
    memory.set(k, hits);
    const resetMs = (hits[0] ?? now) + windowMs - now;
    return { success: false, remaining: 0, resetSeconds: Math.ceil(resetMs / 1000) };
  }
  hits.push(now);
  memory.set(k, hits);
  return { success: true, remaining: rule.limit - hits.length, resetSeconds: rule.windowSec };
}

export async function checkRate(rule: Rule, key: string): Promise<RateResult> {
  const rl = upstashFor(rule);
  if (!rl) return memoryLimit(rule, key);
  try {
    const r = await rl.limit(key);
    return {
      success: r.success,
      remaining: r.remaining,
      resetSeconds: Math.ceil((r.reset - Date.now()) / 1000),
    };
  } catch {
    // Fail open on Redis outage, but keep a per-instance limit as a safety net.
    return memoryLimit(rule, key);
  }
}

/** Throws a 429 AppError when the rule is exceeded. */
export async function enforceRate(rule: Rule, key: string) {
  const r = await checkRate(rule, key);
  if (!r.success) throw E.rateLimited(r.resetSeconds);
}

export function clientIp(headers: Headers): string {
  return (
    headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "unknown"
  );
}

/** Test helper. */
export function __resetMemoryLimits() {
  memory.clear();
}
