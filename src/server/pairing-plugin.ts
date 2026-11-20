
import { createHash, randomBytes, randomInt } from "node:crypto";
import { createAuthEndpoint, sessionMiddleware } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import type { BetterAuthPlugin } from "better-auth";
import { APIError } from "better-auth/api";
import * as z from "zod";
import { LIMITS } from "@/lib/limits";
import { RULES, checkRate, clientIp } from "./ratelimit";
import { describeUserAgent } from "./devices";
import { pairingSchema } from "./pairing-schema";

/**
 * Device pairing (docs/ARCHITECTURE.md §4.7, ADR-0003).
 *
 * A new device calls /pairing/start and shows a code + QR. A signed-in device
 * approves the code. The new device polls with its secret and, once approved,
 * receives a normal Better Auth session cookie. No password is typed on the
 * new device.
 */

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L

export function generateUserCode(): string {
  let s = "";
  for (let i = 0; i < 8; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}

export function normalizeUserCode(input: string): string | null {
  const c = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (c.length !== 8 || [...c].some((ch) => !ALPHABET.includes(ch))) return null;
  return `${c.slice(0, 4)}-${c.slice(4)}`;
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

interface PairingRow {
  id: string;
  userCode: string;
  secretHash: string;
  status: "pending" | "approved" | "consumed" | "denied";
  userId: string | null;
  requesterUa: string | null;
  requesterGeo: string | null;
  expiresAt: Date;
  createdAt: Date;
}

export const pairing = () =>
  ({
    id: "pairing",
    schema: pairingSchema,
    endpoints: {
      pairingStart: createAuthEndpoint("/pairing/start", { method: "POST", requireHeaders: true }, async (ctx) => {
        const ip = clientIp(ctx.headers!);
        const rl = await checkRate(RULES.pairStart, ip);
        if (!rl.success) throw new APIError("TOO_MANY_REQUESTS", { message: "Slow down a little." });

        const secret = randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + LIMITS.pairingTtlSeconds * 1000);
        const geo = [ctx.headers!.get("x-vercel-ip-city"), ctx.headers!.get("x-vercel-ip-country")]
          .filter(Boolean)
          .map((s) => decodeURIComponent(s!))
          .join(", ");
        // Retry on the (very unlikely) user-code collision.
        for (let i = 0; i < 5; i++) {
          const userCode = generateUserCode();
          try {
            await ctx.context.adapter.create({
              model: "pairing",
              data: {
                userCode,
                secretHash: sha256(secret),
                status: "pending",
                userId: null,
                requesterUa: ctx.headers!.get("user-agent")?.slice(0, 300) ?? null,
                requesterGeo: geo || null,
                expiresAt,
                createdAt: new Date(),
              },
            });
            return ctx.json({ userCode, secret, expiresAt: expiresAt.toISOString() });
          } catch {
            /* collision, retry */
          }
        }
        throw new APIError("INTERNAL_SERVER_ERROR", { message: "Could not start pairing." });
      }),

      pairingPoll: createAuthEndpoint(
        "/pairing/poll",
        { method: "POST", body: z.object({ userCode: z.string(), secret: z.string().min(32).max(128) }), requireHeaders: true },
        async (ctx) => {
          const rl = await checkRate(RULES.pairPoll, clientIp(ctx.headers!));
          if (!rl.success) throw new APIError("TOO_MANY_REQUESTS", { message: "Slow down a little." });
          const code = normalizeUserCode(ctx.body.userCode);
          if (!code) return ctx.json({ status: "expired" as const });
          const row = await ctx.context.adapter.findOne<PairingRow>({
            model: "pairing",
            where: [{ field: "userCode", value: code }],
          });
          if (!row || row.secretHash !== sha256(ctx.body.secret)) return ctx.json({ status: "expired" as const });
          if (row.expiresAt.getTime() < Date.now() || row.status === "consumed") {
            return ctx.json({ status: "expired" as const });
          }
          if (row.status === "denied") return ctx.json({ status: "denied" as const });
          if (row.status !== "approved" || !row.userId) return ctx.json({ status: "pending" as const });

          // Consume atomically: only one poller may turn "approved" into a session.
          const claimed = await ctx.context.adapter.updateMany({
            model: "pairing",
            where: [
              { field: "id", value: row.id },
              { field: "status", value: "approved" },
            ],
            update: { status: "consumed" },
          });
          if (!claimed) return ctx.json({ status: "expired" as const });

          const user = await ctx.context.internalAdapter.findUserById(row.userId);
          if (!user) return ctx.json({ status: "expired" as const });
          const session = await ctx.context.internalAdapter.createSession(user.id);
          await setSessionCookie(ctx, { session, user });
          return ctx.json({ status: "approved" as const });
        },
      ),

      pairingInfo: createAuthEndpoint(
        "/pairing/info",
        { method: "POST", body: z.object({ code: z.string() }), use: [sessionMiddleware], requireHeaders: true },
        async (ctx) => {
          const rl = await checkRate(RULES.pairLookup, ctx.context.session.user.id);
          if (!rl.success) throw new APIError("TOO_MANY_REQUESTS", { message: "Slow down a little." });
          const code = normalizeUserCode(ctx.body.code);
          const row = code
            ? await ctx.context.adapter.findOne<PairingRow>({ model: "pairing", where: [{ field: "userCode", value: code }] })
            : null;
          if (!row || row.status !== "pending" || row.expiresAt.getTime() < Date.now()) {
            throw new APIError("NOT_FOUND", { message: "That code isn't valid or has expired." });
          }
          const d = describeUserAgent(row.requesterUa);
          return ctx.json({
            userCode: row.userCode,
            label: d.label,
            kind: d.kind,
            geo: row.requesterGeo,
            requestedAt: row.createdAt.toISOString(),
            expiresAt: row.expiresAt.toISOString(),
          });
        },
      ),

      pairingDecide: createAuthEndpoint(
        "/pairing/decide",
        {
          method: "POST",
          body: z.object({ code: z.string(), approve: z.boolean() }),
          use: [sessionMiddleware],
          requireHeaders: true,
        },
        async (ctx) => {
          const rl = await checkRate(RULES.pairLookup, ctx.context.session.user.id);
          if (!rl.success) throw new APIError("TOO_MANY_REQUESTS", { message: "Slow down a little." });
          const code = normalizeUserCode(ctx.body.code);
          const row = code
            ? await ctx.context.adapter.findOne<PairingRow>({ model: "pairing", where: [{ field: "userCode", value: code }] })
            : null;
          if (!row || row.status !== "pending" || row.expiresAt.getTime() < Date.now()) {
            throw new APIError("NOT_FOUND", { message: "That code isn't valid or has expired." });
          }
          const claimed = await ctx.context.adapter.updateMany({
            model: "pairing",
            where: [
              { field: "id", value: row.id },
              { field: "status", value: "pending" },
            ],
            update: ctx.body.approve
              ? { status: "approved", userId: ctx.context.session.user.id }
              : { status: "denied" },
          });
          if (!claimed) throw new APIError("CONFLICT", { message: "Already handled." });
          return ctx.json({ ok: true });
        },
      ),
    },
  }) satisfies BetterAuthPlugin;
