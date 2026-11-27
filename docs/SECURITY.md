# Rezorb — Security & Privacy

Status legend: **Tested** = implemented and tested. **Unverified** = implemented, but **not** exercised against the real
service. **Open** = **not implemented yet**.

## 1. What we protect

| Asset | Why it matters |
|-------|----------------|
| Drop contents (text, images, files) | Personal, often sensitive (AI output, documents, photos) |
| Account sessions | A session opens the Launchpad |
| Space PINs | The second lock on every Space |
| The device list | Reveals which machines a person uses |

## 2. Threat model

| # | Threat | Mitigation | Status |
|---|--------|------------|--------|
| T1 | **Session left open on a shared/work machine** | PIN required per device; grants expire after 12 h idle; "Lock" always visible; devices revocable remotely (sessions deleted, grants revoked, live sign-out). | Tested (revoke, grant expiry, lock, per-device binding: integration + e2e) |
| T2 | **PIN brute force** | Argon2id; 5 failures → sealed 15 min, doubling to 24 h, counted under a row lock (concurrent guesses can't dodge it); per-user 10/min and per-IP 30/min limits; weak PINs rejected; lockout emails the owner. | Tested (lockout math, concurrency, rate limit, "sealed refuses the right PIN"). Email: Unverified |
| T3 | **Space-name enumeration** | Names are per-user (you only probe your own); unknown name and wrong PIN return the same code/message and run a dummy Argon2 verify so timing matches. | Tested response shape · timing equality is by construction, **not benchmarked** |
| T4 | **Account takeover** | scrypt password hashing (Better Auth), ≥ 10-char passwords, email verification required in production, passkeys, Postgres-backed auth rate limits. | Tested password sign-in · Unverified verification email, passkeys, magic link · Open breached-password check (Better Auth has a `haveIBeenPwned` plugin; not enabled) |
| T5 | **Pairing phishing** | Approval screen shows browser, OS, rough location and time with "Only approve if you are looking at this code on your own screen"; 10-minute TTL; single use; the 256-bit **secret** never leaves the new device, so seeing the code isn't enough; approve/lookup limited to 10 / 10 min per user. | Tested (approve, decline, expiry, wrong secret, replay, limit) |
| T6 | **Malicious content served from our origin (XSS)** | Text is always rendered as text; the only generated HTML is Shiki's output (escaped by the library); downloads redirect to the storage domain with `attachment` + `application/octet-stream`; only png/jpeg/webp/gif may be inline; `nosniff`. | Tested (`<script>` stored verbatim; HTML forced to attachment) · Open **no CSP yet** |
| T7 | **Realtime injection / eavesdropping** | Server-only publishing; client tokens are `subscribe`+`presence` scoped per granted Space. | Unverified (no Ably key was available; the code path is compiled and reviewed, **not run**) |
| T8 | **Presigned URL leakage** | PUT 5 min, GET 60 s, minted per request after a grant check; keys are server-chosen. | Tested contract on the filesystem stand-in · Unverified real R2 |
| T9 | **Storage abuse / cost** | 50 MB/file, 1 GB/user, 10 Spaces, 500 drops/Space, expiry, stale-upload cleanup, R2 lifecycle backstop. No public links in v1. | Tested (quota, cap, stale cleanup) · Unverified R2 lifecycle rule |
| T10 | **CSRF** | `SameSite=Lax`; JSON-only mutations (415 otherwise); `Origin` must match when present. | Tested |
| T11 | **Insider / server compromise reads content** | v1: provider encryption at rest only. v2: E2E ([ADR-0007](adr/0007-e2e-encryption-v2.md)). The landing page says E2E is **not** in place yet. | Open (by design for v1) |
| T12 | **Clipboard over-reach** | Reads only inside a `paste` event or a user gesture; never polls the clipboard. | Tested |
| T13 | **Cross-user / cross-space access** | Every Space/drop route requires a grant bound to (user, device, space, `pin_version`); strangers get 403/404; a grant for Space A can't open B; cookie forgery and replay across users/devices rejected. | Tested (several integration tests) |
| T14 | **Cron abuse** | `/api/cron/burn` needs `Authorization: Bearer $CRON_SECRET` (constant-time compare); **closed** when the secret isn't set. | Tested |

## 3. Cookies

| Cookie | Purpose | Flags |
|--------|---------|-------|
| `better-auth.session_token` | Session | HttpOnly, SameSite=Lax, Secure in production |
| `rz_dev` | Stable device id | HttpOnly, SameSite=Lax, Secure in production, 1 year. **Unsigned on purpose**: a forged id for another user's device is ignored (lookup requires `device.user_id = session user`), it just creates a new device. |
| `rz_g_{spaceId}` | Space grant | HttpOnly, SameSite=Lax, Secure in production; value `grantId.HMAC-SHA256(GRANT_SECRET)`; expires with the grant |

`GRANT_SECRET` rotation: set the new value as `GRANT_SECRET` and the old one as
`GRANT_SECRET_PREV`; both verify, only the new signs. Remove the old one after ~12 h.

## 4. Rate limits

| Rule | Limit | Key |
|------|-------|-----|
| Unlock / PIN change | 10 / min | user |
| Unlock | 30 / min | IP |
| Create Space | 20 / hour | user |
| Beam text | 120 / min | user |
| Start upload | 60 / min | user |
| Download | 300 / min | user |
| Realtime token | 60 / min | user |
| Pairing start | 10 / 10 min | IP |
| Pairing poll | 120 / min | IP |
| Pairing info/decide | 10 / 10 min | user |
| Better Auth: sign-in / sign-up / magic link / default | 10 per 10 s / 10 per 60 s / 5 per 60 s / 100 per 10 s | IP (Postgres-backed) |

Our limits use Upstash Redis in production and fall back to a **per-instance in-memory**
window without it (fine for dev; weak on serverless, so configure Upstash). If Redis is
down the limiter fails open to the in-memory window rather than blocking everyone.

## 5. HTTP headers

Set in `next.config.ts`: `X-Content-Type-Options: nosniff`, `Referrer-Policy:
strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Permissions-Policy` (camera,
microphone, geolocation off; clipboard self), `Strict-Transport-Security` (2 years,
preload). Better Auth's origin check is enabled explicitly (`disableOriginCheck: false`) because the library turns it off when `NODE_ENV` is `test`; an integration test proves a password-reset `redirectTo` on another origin gets 403. Tested

**Open: Content-Security-Policy is not implemented.** The plan is a nonce-based policy
(`script-src 'self' 'nonce-…' 'strict-dynamic'`, `connect-src` for the app, R2 and Ably,
`img-src 'self' blob: data:` + the R2 host, `frame-ancestors 'none'`). It needs a request
proxy to mint nonces and care with the inline theme-boot script. It's the biggest open
item in [ROADMAP M8](ROADMAP.md#m8--launch-hardening); don't launch without it.

## 6. Privacy

- **Content is never logged** (`src/server/log.ts` takes IDs, kinds, sizes and durations;
  file names and text are never passed to it). Errors are logged as name + message only. Tested
- No third-party trackers in the app. (Vercel Analytics / Sentry not added yet.)
- **Retention:** Drops are deleted at expiry (rows and blobs). Deleting a Space deletes its
  rows and R2 prefix immediately. Tested (tested) · Open **Account deletion and data export are not
  built yet.**
- **Workplace notice**, shown once per device after first sign-in, and on the landing page: Tested
  > "Rezorb is for moving your own things between your own devices. If this is a work
  > computer, your organization's data policies still apply."
- The landing page says plainly that Drops are **not end-to-end encrypted yet**.

## 7. Secrets

All secrets are environment variables, scoped per environment, never `NEXT_PUBLIC_`.
List and rotation notes: [DEPLOYMENT.md](DEPLOYMENT.md#2-environment-variables).
`REZORB_E2E=1` relaxes production-only requirements for the Playwright run and **throws if
`VERCEL_ENV=production`**; never set it anywhere real.

## 8. Before any sharing feature (v2) ships

- [ ] Malware scanning on uploads before anything is shared
- [ ] Abuse reporting and takedown flow, plus a DMCA contact
- [ ] CSAM hash-matching for shared images
- [ ] Per-link rate limits and expiry
- [ ] Terms of Service and an Acceptable Use Policy updated
