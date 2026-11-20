import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins/magic-link";
import { nextCookies } from "better-auth/next-js";
import { APIError } from "better-auth/api";
import { passkey } from "@better-auth/passkey";
import { db, schema } from "./db";
import { env, isE2E, isProd } from "./env";
import { mails, sendMail } from "./email";
import { pairing } from "./pairing-plugin";
import { DeviceQuotaError, findOrCreateDevice } from "./devices";

export const DEVICE_COOKIE = "rz_dev";

const emailEnabled = () => !!env.resendKey;

function build() {
  const appUrl = env.appUrl;
  return betterAuth({
    appName: "Rezorb",
    baseURL: appUrl,
    secret: env.authSecret,
    database: drizzleAdapter(db, { provider: "pg", schema }),
    advanced: {
      database: { generateId: "uuid" },
      useSecureCookies: isProd(),
      ipAddress: { ipAddressHeaders: ["x-vercel-forwarded-for", "x-forwarded-for"] },
    },
    // Better Auth's own limiter for its endpoints (our API routes use ratelimit.ts).
    // Database storage so limits hold across serverless instances. Off only in the
    // e2e build, where every browser shares one IP.
    rateLimit: {
      enabled: !isE2E() && process.env.NODE_ENV !== "test",
      storage: "database",
      window: 10,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 10, max: 10 },
        "/sign-up/email": { window: 60, max: 10 },
        "/sign-in/magic-link": { window: 60, max: 5 },
        "/pairing/start": false,
      },
    },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
      // Without an email provider (local dev) verification can't work. In
      // production a missing RESEND_API_KEY makes sign-up fail loudly instead.
      requireEmailVerification: emailEnabled() || isProd(),
      sendResetPassword: async ({ user, url }) => sendMail(mails.reset(user.email, url)),
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => sendMail(mails.verify(user.email, url)),
    },
    user: {
      additionalFields: {
        plan: { type: "string", required: false, defaultValue: "free", input: false },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
      additionalFields: {
        deviceId: { type: "string", required: false, input: false },
      },
    },
    databaseHooks: {
      session: {
        create: {
          // Bind every new session to a Device (docs/DATA_MODEL.md §2.2).
          before: async (session, ctx) => {
            if (!ctx) return;
            const headers: Headers | undefined = ctx.headers ?? ctx.request?.headers;
            const cookieId = ctx.getCookie?.(DEVICE_COOKIE) ?? parseCookie(headers?.get("cookie"), DEVICE_COOKIE);
            try {
              const dev = await findOrCreateDevice({
                userId: session.userId,
                cookieDeviceId: cookieId,
                userAgent: headers?.get("user-agent"),
              });
              ctx.setCookie?.(DEVICE_COOKIE, dev.id, {
                httpOnly: true,
                secure: isProd(),
                sameSite: "lax",
                path: "/",
                maxAge: 60 * 60 * 24 * 365,
              });
              return { data: { ...session, deviceId: dev.id } };
            } catch (e) {
              if (e instanceof DeviceQuotaError) {
                throw new APIError("FORBIDDEN", {
                  code: "QUOTA_DEVICES",
                  message: "You've reached the device limit. Revoke one in Settings, then try again.",
                });
              }
              throw e;
            }
          },
        },
      },
    },
    plugins: [
      magicLink({
        expiresIn: 300,
        sendMagicLink: async ({ email, url }) => sendMail(mails.magic(email, url)),
      }),
      passkey({
        rpID: new URL(appUrl).hostname,
        rpName: "Rezorb",
        origin: new URL(appUrl).origin,
      }),
      pairing(),
      nextCookies(), // keep last
    ],
  });
}

type Auth = ReturnType<typeof build>;
let instance: Auth | undefined;

/** Lazy so `next build` doesn't need secrets. */
export function getAuth(): Auth {
  return (instance ??= build());
}

function parseCookie(header: string | null | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}
