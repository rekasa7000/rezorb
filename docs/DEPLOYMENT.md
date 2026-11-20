# Rezorb — Deployment (Vercel)

> **Not deployed yet.** These steps are what the code expects; none of the third-party
> services below have been connected during development (see
> [TESTING.md](TESTING.md#not-verified)). Do a **preview deploy first** and walk the checklist
> in §6.

## 1. One-time setup

1. **Vercel project:** import the GitHub repo. Framework: Next.js. Install: `pnpm install`.
   `vercel.json` sets the build command to `pnpm build:vercel` (= `pnpm db:migrate && next build`)
   and the cron. Node ≥ 20.19.
2. **Neon** (Vercel Marketplace → Neon): link to the project and enable **"Create a database
   branch for each preview deployment"**. This injects `DATABASE_URL` (pooled) and
   `DATABASE_URL_UNPOOLED`. Migrations use the unpooled one.
3. **Upstash Redis** (Marketplace): injects `KV_REST_API_URL` / `KV_REST_API_TOKEN` (or the
   `UPSTASH_REDIS_REST_*` names); both are read. Without it rate limits are per-instance only.
4. **Cloudflare R2:**
   - Buckets `rezorb-prod`, `rezorb-preview`, `rezorb-dev`; an API token with Object Read & Write on them.
   - **CORS** on each bucket (the `ExposeHeaders: ETag` line is required for multipart uploads):
     ```json
     [{ "AllowedOrigins": ["https://rezorb.app", "https://*.vercel.app", "http://localhost:3000"],
        "AllowedMethods": ["GET", "PUT", "HEAD"],
        "AllowedHeaders": ["content-type", "content-length"],
        "ExposeHeaders": ["ETag"], "MaxAgeSeconds": 3600 }]
     ```
     In production narrow `*.vercel.app` to your team's preview pattern.
   - **Lifecycle:** delete objects older than 8 days; abort incomplete multipart uploads after 1 day.
5. **Ably:** apps `rezorb-dev` (local + preview) and `rezorb-prod`; a key with
   **publish, subscribe, presence**. The server uses it to mint narrower client tokens.
6. **Resend:** verify `mail.rezorb.app`; create an API key.
7. **Domain:** add `rezorb.app` in Vercel → Domains.
8. *(Planned)* Sentry, Vercel Analytics.

## 2. Environment variables

| Name | Scope | Notes |
|------|-------|-------|
| `DATABASE_URL` | all | Neon (pooled). **Required.** |
| `DATABASE_URL_UNPOOLED` | all | Neon (direct). Used by migrations; falls back to `DATABASE_URL`. |
| `BETTER_AUTH_SECRET` | all | `openssl rand -base64 32`; different per environment. **Required.** |
| `BETTER_AUTH_URL` | production | **The canonical origin, e.g. `https://rezorb.app`.** Read at *runtime*. Required on a custom domain: `VERCEL_URL` is the deployment hostname, not your domain, and a mismatch makes Better Auth reject every request ("Invalid origin"). |
| `APP_URL` | optional | Overrides `BETTER_AUTH_URL` for Rezorb's own URL logic. |
| `GRANT_SECRET` | all | `openssl rand -base64 32`. Signs Space-grant cookies. **Required.** |
| `GRANT_SECRET_PREV` | optional | Old secret during rotation. |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | all | **Required in production** (the app refuses to fall back to disk). |
| `R2_BUCKET` | per env | `rezorb-prod` / `rezorb-preview` / `rezorb-dev` |
| `ABLY_API_KEY` | per env | Server only. Never `NEXT_PUBLIC_`. Without it the app polls. |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | all | Or the `KV_REST_API_*` pair. |
| `RESEND_API_KEY`, `EMAIL_FROM` | all | **Required in production**: email verification is mandatory, and sending throws without a key. |
| `CRON_SECRET` | production | Vercel sends it as `Authorization: Bearer …`. The cron route is **closed** if unset. |
| `NEXT_PUBLIC_APP_URL` | optional | Last-resort fallback only (inlined at build time). |
| `REZORB_E2E` | **never** | Test switch for Playwright. Throws if `VERCEL_ENV=production`. Do not set. |

`.env.example` lists them all. `vercel env pull .env.local` fetches the real ones.

## 3. `vercel.json`

```json
{
  "buildCommand": "pnpm build:vercel",
  "crons": [{ "path": "/api/cron/burn", "schedule": "0 3 * * *" }]
}
```

The committed schedule is **daily**, because Vercel *rejects deployments* on the **Hobby** plan
that declare a cron more frequent than once a day. On **Pro**, change it to hourly
(`"0 * * * *"`) so blobs are reclaimed sooner. Either way expiry looks exact to users (every
read filters on `expires_at`, and listing a Space burns its expired drops); the schedule only
decides how long an expired blob can linger ([ADR-0006](adr/0006-expiry-strategy.md)). Hobby is
also non-commercial: move to Pro before charging money.

## 4. Function settings

- All API routes declare `runtime = "nodejs"` (Argon2 is native; the AWS SDK needs Node).
- `maxDuration = 60` on `/api/cron/burn` and `/api/drops/[id]/complete`.
- Put functions in the region nearest your Neon database (Project Settings → Functions).

## 5. Passkeys and domains

Passkeys are bound to the **hostname** (`rpID`) of `BETTER_AUTH_URL`. A passkey created on
`rezorb.app` won't work on a `*.vercel.app` preview. Test passkeys on production (or a
stable staging domain), and don't change the domain casually.

## 6. First-deploy checklist (do on a preview)

- [ ] Build passes and migrations applied (check the Neon branch has all 11 tables, including `rate_limit`).
- [ ] Sign up → verification email arrives → sign in.
- [ ] Create a Space on device A; unlock it on device B; paste on A → appears on B. **Measure time-to-catch** (target < 1 s with Ably).
- [ ] Upload a 30 MB file (multipart) and an image; download on B; confirm the bucket got the objects.
- [ ] Open the browser console: no CORS errors; Ably connection state is `connected`.
- [ ] A drop with a 1 h lifetime disappears after an hour; the cron run (check the Vercel logs) removes the object from R2.
- [ ] Pair a third device with a code. Revoke it; it signs out.
- [ ] Hit `/api/cron/burn` without and with the bearer secret: 401 then 200.
- [ ] Confirm `/api/dev-storage/x` returns **404**.
- [ ] `curl -I` the home page: security headers present. (CSP is a known gap; see [SECURITY §5](SECURITY.md#5-http-headers).)

## 7. Release process

1. Open a PR; Vercel makes a preview with its own Neon branch.
2. Merge to `main`; production builds, runs migrations, deploys.
3. Watch logs for 15 minutes. Roll back with Vercel → Deployments → Promote on the previous
   deployment. Migrations are expand/contract, so rollback is safe.

## 8. Local development

```bash
pnpm install
cp .env.example .env.local     # DATABASE_URL + the two secrets are enough
createdb rezorb                # a local Postgres 15+ (or point DATABASE_URL at a Neon dev branch)
pnpm db:migrate
pnpm dev                       # http://localhost:3000
```

With nothing else configured the app uses: a filesystem store in `.dev-storage/` for files,
polling instead of Ably, console output for email, and in-memory rate limits.
Email verification is **off** locally (no Resend key and not production), so sign-up signs
you in at once. To test two devices, use a normal and a private window (separate cookies),
or open your LAN IP on a phone (`pnpm dev --hostname 0.0.0.0`). Clipboard APIs need
`localhost` or HTTPS; for phone testing use `next dev --experimental-https`.
