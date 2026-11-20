import "server-only";

/**
 * Central, lazy environment access. Nothing here throws at import time so that
 * `next build` works without secrets; required values throw on first use.
 */
function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable ${name}`);
  return v;
}

/**
 * Test mode for the Playwright suite, which runs a production build without R2 or
 * an email provider. It disables production-only requirements, so it must never be
 * honoured on a real deployment: Vercel Production always sets VERCEL_ENV=production.
 */
export function isE2E(): boolean {
  if (process.env.REZORB_E2E !== "1") return false;
  if (process.env.VERCEL_ENV === "production") {
    throw new Error("REZORB_E2E must never be set in production.");
  }
  return true;
}

export const isProd = () => process.env.NODE_ENV === "production" && !isE2E();

export const env = {
  /**
   * Canonical public origin. Read from runtime-only variables first: NEXT_PUBLIC_* values are
   * inlined at build time, so relying on them can silently bake in the wrong origin.
   * On a custom domain, set BETTER_AUTH_URL (or APP_URL) explicitly: VERCEL_URL is the
   * deployment hostname, not your domain.
   */
  get appUrl() {
    const explicit = process.env.APP_URL ?? process.env.BETTER_AUTH_URL;
    if (explicit) return explicit.replace(/\/$/, "");
    if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
      return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
    }
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
    return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  },
  get databaseUrl() {
    return required("DATABASE_URL");
  },
  get authSecret() {
    return required("BETTER_AUTH_SECRET");
  },
  get grantSecret() {
    return required("GRANT_SECRET");
  },
  get grantSecretPrev() {
    return process.env.GRANT_SECRET_PREV || null;
  },
  get cronSecret() {
    return process.env.CRON_SECRET || null;
  },
  get ablyKey() {
    return process.env.ABLY_API_KEY || null;
  },
  get resendKey() {
    return process.env.RESEND_API_KEY || null;
  },
  get emailFrom() {
    return process.env.EMAIL_FROM ?? "Rezorb <orbit@localhost>";
  },
  get redis() {
    const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
    return url && token ? { url, token } : null;
  },
  get r2() {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucket = process.env.R2_BUCKET;
    return accountId && accessKeyId && secretAccessKey && bucket
      ? { accountId, accessKeyId, secretAccessKey, bucket }
      : null;
  },
};
