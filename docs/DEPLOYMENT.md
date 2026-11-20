# Rezorb — Deployment (Vercel)

## 1. One-time setup

1. **Vercel project:** import the GitHub repo. Framework: Next.js. Root: `/`. Install command: `pnpm install`.
   Build command: `pnpm db:migrate && pnpm build`.
2. **Neon** (Vercel Marketplace → Neon): link it to the project and enable
   **"Create a database branch for each preview deployment"**. This injects
   `DATABASE_URL` and `DATABASE_URL_UNPOOLED`.
3. **Upstash Redis** (Vercel Marketplace): link it. This injects `KV_REST_API_URL` / `KV_REST_API_TOKEN`
   (or `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`).
4. **Cloudflare R2:**
   - Create the buckets `rezorb-prod`, `rezorb-preview`, and `rezorb-dev`.
   - Create an API token with Object Read & Write, scoped to those buckets.
   - Add a CORS rule to each bucket:
     ```json
     [{ "AllowedOrigins": ["https://rezorb.app", "https://*.vercel.app", "http://localhost:3000"],
        "AllowedMethods": ["GET", "PUT", "HEAD"],
        "AllowedHeaders": ["content-type", "content-length"],
        "ExposeHeaders": ["ETag"], "MaxAgeSeconds": 3600 }]
     ```
     For production, narrow `*.vercel.app` to your team's preview domain pattern.
   - Add a lifecycle rule: delete objects older than 8 days. Abort incomplete multipart uploads after 1 day.
5. **Ably:** create two apps, `rezorb-dev` (used for local and preview) and `rezorb-prod`.
   Create an API key with **publish, subscribe, presence**. The server uses it to
   mint narrower client tokens.
6. **Resend:** verify the sending domain (`mail.rezorb.app`) and create an API key.
7. **Sentry:** create a Next.js project and run `npx @sentry/wizard -i nextjs`.
8. **Domain:** add `rezorb.app` (and `www` → redirect) in Vercel → Domains.

## 2. Environment variables

| Name | Scope | Example / notes |
|------|-------|-----------------|
| `DATABASE_URL` | all | Injected by Neon (pooled) |
| `DATABASE_URL_UNPOOLED` | all | Injected by Neon, used for migrations |
| `BETTER_AUTH_SECRET` | all | `openssl rand -base64 32` (different per environment) |
| `BETTER_AUTH_URL` | prod | `https://rezorb.app`. On previews, derive it from `VERCEL_URL`. |
| `GRANT_SECRET` | all | `openssl rand -base64 32` |
| `GRANT_SECRET_PREV` | all | Optional, used during rotation |
| `R2_ACCOUNT_ID` | all | |
| `R2_ACCESS_KEY_ID` | all | |
| `R2_SECRET_ACCESS_KEY` | all | |
| `R2_BUCKET` | per env | `rezorb-prod` / `rezorb-preview` / `rezorb-dev` |
| `ABLY_API_KEY` | per env | Server only. **Never** `NEXT_PUBLIC_`. |
| `UPSTASH_REDIS_REST_URL` | all | Injected |
| `UPSTASH_REDIS_REST_TOKEN` | all | Injected |
| `RESEND_API_KEY` | all | |
| `EMAIL_FROM` | all | `Rezorb <orbit@mail.rezorb.app>` |
| `CRON_SECRET` | prod | Vercel sends it as a Bearer token to cron routes |
| `SENTRY_DSN` / `SENTRY_AUTH_TOKEN` | prod, preview | |
| `NEXT_PUBLIC_APP_URL` | all | Public base URL |

A template is in [`.env.example`](../.env.example).

## 3. `vercel.json`

```json
{
  "crons": [
    { "path": "/api/cron/burn", "schedule": "0 * * * *" }
  ]
}
```

On the **Hobby** plan, crons may run at most once per day. Use `"0 3 * * *"`
there. The read filter and opportunistic burn keep expiry exact for users (see
[ADR-0006](adr/0006-expiry-strategy.md)).

## 4. Function settings

- All `/api/**` routes use `export const runtime = "nodejs"` (Argon2 is native,
  and the AWS SDK needs Node).
- `export const maxDuration = 60` on `/api/cron/burn` and `/api/drops/[id]/complete`.
- Pin the function region near Neon (for example `iad1` with Neon `us-east-1`).
  Set it in Project Settings → Functions.

## 5. Release process

1. Open a PR. The Vercel preview is created with its own Neon branch, and CI runs e2e against it.
2. Merge to `main`. The production deploy runs migrations in the build step.
3. Watch Sentry and the Vercel logs for 15 minutes. If needed, roll back with
   **Vercel → Deployments → Promote** on the previous deployment. Migrations
   are expand/contract, so rollback is safe.

## 6. Local development

```bash
pnpm install
cp .env.example .env.local     # fill in dev values (or `vercel env pull .env.local`)
pnpm db:migrate
pnpm dev                       # http://localhost:3000
```

To test two devices locally, use a normal window and a private window, or open
your LAN IP on your phone with `pnpm dev --hostname 0.0.0.0`.
Clipboard APIs need HTTPS or localhost. For phone testing, use
`next dev --experimental-https`.
