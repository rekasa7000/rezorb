# Rezorb — Architecture

Status: **Implemented (v1), not yet deployed** · Target: Vercel · Last updated: 2026-11-20

This document describes the system **as built**. Where the build departs from the
original plan, the departure is called out and, if it was a real decision, has an
ADR in [`docs/adr`](adr/README.md).

## 1. Overview

Rezorb is **one full-stack Next.js app** (App Router, Node.js runtime) deployed on
Vercel. Two platform limits shape it: Vercel functions can't hold WebSocket
connections, and request bodies are capped at 4.5 MB. So:

- **Realtime** goes through a hosted pub/sub service (**Ably**). The app server only
  *publishes*; browsers only *subscribe*.
- **File bytes** go **straight from the browser to object storage** (**Cloudflare R2**)
  through presigned URLs. The app server never sees a file body.
- Both have a **local fallback** (polling; a filesystem stand-in) so the whole app runs
  and is tested with nothing but Postgres. See [§7](#7-local-fallbacks-and-test-mode).

```
                         ┌──────────────────────────── Vercel ───────────────────────────┐
  Device A (browser)     │  Next.js 16 (App Router)                                      │
  ─────────────────      │   • RSC pages  /  /spaces  /s/[slug]  /settings  /pair  /link │
   paste / drop ─────────┼─> • Route Handlers  /api/**          (Node runtime)          │
                         │   • Better Auth     /api/auth/**  (+ custom pairing plugin)   │
                         │   • Vercel Cron     /api/cron/burn                            │
                         └──────┬───────────┬──────────────┬──────────────┬─────────────┘
                                │           │              │              │
                     SQL (Drizzle)   rate limit      publish events   presign PUT/GET
                                │           │              │              │
                        ┌───────v──┐  ┌─────v────┐  ┌──────v─────┐  ┌─────v──────┐
                        │  Neon    │  │ Upstash  │  │   Ably     │  │ Cloudflare │
                        │ Postgres │  │  Redis   │  │  Realtime  │  │     R2     │
                        └──────────┘  └──────────┘  └──────┬─────┘  └─────^──────┘
                                                           │ subscribe    │ PUT bytes
  Device B (browser) <─────────── drop.created ────────────┘              │ (direct)
                                                     Device A ────────────┘
```

## 2. Stack (as built)

| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | **Next.js 16.4**, React 19, **TypeScript 5.9** (strict, `noUncheckedIndexedAccess`) | TS 7 was rejected: `typescript-eslint` doesn't support it yet. [ADR-0001](adr/0001-nextjs-fullstack-on-vercel.md) |
| UI | Tailwind CSS v4, `three` + `@react-three/fiber` (landing hero only), `motion`, `lucide-react`, `sonner`, `cmdk`, `shiki`, `qrcode.react`, hand-written primitives | **No shadcn/Radix** (see §9) |
| Client state | TanStack Query (server cache), Zustand (per-device prefs) | |
| Validation | Zod 4, schemas in `src/lib/schemas.ts` shared by client and server | |
| Database | **Postgres via `pg`** + **Drizzle ORM** + `drizzle-kit` migrations | Developed against Postgres 16; Neon in production. [ADR-0002](adr/0002-postgres-neon-drizzle.md) |
| Auth | **Better Auth 1.7**: email+password, magic link, passkeys (`@better-auth/passkey`) + **custom pairing plugin** | [ADR-0003](adr/0003-better-auth.md) |
| Realtime | **Ably** (`ably` SDK), token auth, presence | Polling fallback. [ADR-0004](adr/0004-realtime-ably.md) |
| Files | **Cloudflare R2** via `@aws-sdk/client-s3` presigned URLs | [ADR-0005](adr/0005-storage-cloudflare-r2.md) |
| Rate limiting | `@upstash/ratelimit` for our routes; Better Auth's own limiter (Postgres-backed) for its routes | In-memory fallback without Redis |
| Email | Resend | Dev outbox + console without a key |
| PIN hashing | `@node-rs/argon2` (Argon2id, m=19 MiB, t=2, p=1) | |
| IDs | UUIDv7 (`uuidv7`) for Rezorb tables; Better Auth tables use `gen_random_uuid()` (v4) | |
| Logging | Small structured logger (`src/server/log.ts`) | Replaced the planned `pino`; one fewer dependency, content never logged |
| Scheduled jobs | Vercel Cron → `/api/cron/burn`, plus opportunistic burn | [ADR-0006](adr/0006-expiry-strategy.md) |
| Tests | Vitest (unit + integration against real Postgres), Playwright (e2e, axe) | [TESTING.md](TESTING.md) |
| Package manager | pnpm | |

## 3. Source layout

```
/
├─ src/
│  ├─ app/
│  │  ├─ (marketing)/page.tsx            Landing
│  │  ├─ (auth)/sign-in, sign-up, pair   Auth screens (split layout)
│  │  ├─ (app)/layout.tsx                Session guard + workplace notice
│  │  ├─ (app)/spaces/page.tsx           Launchpad
│  │  ├─ (app)/s/[slug]/page.tsx         A Space (PIN gate or the live feed)
│  │  ├─ (app)/link/page.tsx             Approve a pairing code
│  │  ├─ (app)/settings/page.tsx         Account · Devices · Appearance · Limits
│  │  ├─ api/auth/[...all]               Better Auth handler (incl. /pairing/*)
│  │  ├─ api/spaces[/unlock|/[id]/…]     Spaces, unlock, lock, PIN, drops, uploads
│  │  ├─ api/drops/[id][/complete|/download]
│  │  ├─ api/devices[/[id]]              List, rename, revoke
│  │  ├─ api/realtime/token              Ably token request (or {mode:"poll"})
│  │  ├─ api/cron/burn                   Expiry job (Bearer CRON_SECRET)
│  │  ├─ api/dev-storage/[token]         Dev-only R2 stand-in (404 in production)
│  │  ├─ layout.tsx, providers.tsx, fonts.ts, globals.css, error.tsx, not-found.tsx
│  │  └─ icon.svg, opengraph-image.tsx
│  ├─ components/
│  │  ├─ cosmos/    Starfield, CosmosLayers, Orb/Wordmark, Ornament, HeroBackdrop + HeroScene (three.js)
│  │  ├─ ui/        Button, Input/Field, Dialog
│  │  ├─ space/     SpaceView, DropCard, DropBody, Dock, PinKeypad, UnlockGate, Constellation,
│  │  │             BurnRing, SpaceSettings, CommandPalette, Shortcuts, Lightbox
│  │  ├─ launchpad/ Launchpad, CreateSpaceDialog, SettingsView, AppHeader, WorkplaceNotice
│  │  └─ auth/      AuthShell, SignInForm, SignUpForm, PairNewDevice, LinkApprove
│  ├─ hooks/        useSpaceFeed (query + realtime + presence + polling), useUploads, usePasteAndDrop
│  ├─ lib/          Isomorphic: limits, schemas (Zod), dto, pin-rules, lifetime, classify, format,
│  │                clipboard, upload, drop-cache, api-client, auth-client
│  ├─ server/       Server-only (`import "server-only"`)
│  │  ├─ db/        schema.ts, index.ts (pool), migrations/
│  │  ├─ auth.ts, pairing-plugin.ts, pairing-schema.ts, devices.ts
│  │  ├─ access.ts (requireUser/requireSpace), grants.ts, drop-access.ts, page-session.ts
│  │  ├─ spaces.ts (create/unlock/lockout/PIN/delete), drops.ts (create/list/upload/burn/cap)
│  │  ├─ pin.ts, ratelimit.ts, storage.ts, realtime.ts, email/, http.ts, env.ts, log.ts
│  │  └─ __tests__/ Integration tests
│  ├─ stores/prefs.ts   Per-device theme / calm / view / notice (localStorage, guarded)
│  └─ styles/tokens.css Design tokens, themes, Calm mode, layered component CSS
├─ e2e/                 Playwright (two browser contexts = two devices)
├─ tests/               Vitest setup, helpers (a simulated Device with a cookie jar)
├─ public/brand/        Outlined logo SVGs
├─ scripts/migrate.ts   Applies migrations (used by `pnpm build:vercel`)
├─ scripts/brand/       One-off logo generator (needs fontkit)
├─ vercel.json          Build command + cron
└─ .env.example
```

The legacy `frontend/` (Vite) and `backend/` (Express/Mongo) apps were deleted. They
remain reachable in git history at commit `3c84314`.

## 4. Key flows

### 4.1 Unlocking a Space

```
Browser                              POST /api/spaces/unlock            Postgres
  │ {name, pin} ───────────────────────>│ requireUser (session → device row, not revoked)
  │                                     │ enforceRate: 10/min per user, 30/min per IP
  │                                     │ find space by (owner_id, lower(trim(name)))
  │                                     │   not found → dummy Argon2 verify → 401 (same shape)
  │                                     │ locked_until > now → 423 SPACE_SEALED
  │                                     │ argon2.verify
  │                                     │   ✗ → recordFailedAttempt (row lock) → 401 {attemptsLeft} | 423
  │                                     │   ✓ → reset counter; revoke old grant for this device; insert grant
  │<── 200 {space} + Set-Cookie rz_g_{spaceId}=<grantId>.<hmac>; HttpOnly; SameSite=Lax
```

- A wrong PIN is counted inside a transaction that holds `SELECT … FOR UPDATE` on the
  space row, so concurrent guesses can't slip past the lockout (tested: 8 parallel guesses
  seal once).
- Lockout: 5 failures → sealed 15 min, doubling per repeat (capped at 24 h); the lockout
  count decays after 24 h with no lockout. A sealed space refuses even the right PIN.
- Every Space route calls `requireSpace(req, id)`: valid session **and** a grant cookie
  whose signature verifies **and** whose DB row is unrevoked, unexpired, bound to this
  user **and this device**, matches `space.pin_version`, and whose device isn't revoked.
- The grant's idle timeout is 12 h, slid forward at most once a minute.

### 4.2 Beaming text

1. `usePasteAndDrop` listens for `paste` on the document (ignored when focus is in another
   input; text pasted *inside* the Dock stays editable until Enter).
2. `classifyText` picks `text | code | link` (+ language) on the client.
3. An optimistic card (`tmp_<clientId>`) appears; `POST /api/spaces/:id/drops` is sent.
4. The server re-validates (`link` must be one http(s) URL), enforces size (1 MB) and
   quota inside an advisory-locked transaction, inserts, touches `last_activity_at`, and
   publishes `drop.created` (text > 64 KB is omitted from the event).
5. The optimistic card is replaced **in place**: the real drop inherits the placeholder's
   `clientKey`, so React keeps the same element (no exit/enter flicker).

### 4.3 Beaming a file or image

```
Client                         API                                      Storage
  │ POST /uploads {name,size,mime,kind,w,h,withThumb} ─> validate size/quota (advisory lock)
  │                                        insert drop(status='uploading'); reserve size
  │<── {drop, upload:{single|multipart}, thumbUpload}
  │ PUT bytes (XHR for progress; multipart: 8 MB parts, 3 in parallel) ───────>│
  │ PUT thumbnail (client-made 480px WebP) ───────────────────────────────────>│
  │ POST /drops/:id/complete {parts?} ─────> complete multipart; HEAD → size must match
  │                                        status='ready'; publish drop.created
```

- Files above 25 MB use multipart (8 MB parts). Max file size 50 MB.
- A size mismatch deletes the half-made drop and returns `422 SIZE_MISMATCH`.
- Uploads stuck in `uploading` for over an hour are removed by the cron job and don't count
  toward quota after an hour.
- Only the uploading device may complete an upload; other devices don't see it until `ready`.

### 4.4 Catching

- **Text / code / link:** `navigator.clipboard.writeText()`, falling back to a hidden
  textarea and `execCommand('copy')`.
- **Image:** the PNG is fetched and handed to `ClipboardItem` as a *promise* (Safari needs
  that inside the gesture); non-PNG images are converted in a canvas; where unsupported,
  it falls back to Download.
- **File / download:** `GET /api/drops/:id/download` checks the grant and answers `302` to
  a 60 s presigned URL with `Content-Disposition: attachment` (and
  `application/octet-stream`). Only `image/png|jpeg|webp|gif` may be served `inline`.

### 4.5 Realtime and the polling fallback

- `POST /api/realtime/token` returns `{mode:"ably", tokenRequest, spaceIds, userChannel,
  device}` — capabilities are `subscribe`+`presence` on `space:{id}` for each Space this
  device holds a valid grant for, plus `subscribe` on `user:{userId}`. Clients **cannot
  publish**. Without `ABLY_API_KEY` it returns `{mode:"poll"}`.
- `useSpaceFeed` subscribes, enters presence (the Constellation), and reacts to
  `drop.*`, `space.*` and `device.revoked`.
- **Polling is also the safety net:** if Ably isn't connected for 10 s the feed polls every
  2.5 s. Polling is also how a device learns it lost access: a `SPACE_LOCKED` response
  drops it to the PIN screen, `401` signs it out, `404` means the Space was deleted.
- In poll mode time-to-catch measured **~2.7–2.9 s** (e2e). Realtime (Ably) is expected to be
  well under 1 s but **has not been measured** — see [TESTING.md](TESTING.md#not-verified).

### 4.6 Expiry ("burn")

[ADR-0006](adr/0006-expiry-strategy.md): a drop is invisible the instant `expires_at`
passes (every query filters on it). Rows and blobs are removed by (1) an **opportunistic
burn** when a Space's first page is listed (`after()`), (2) `/api/cron/burn` (daily as committed; hourly on
Pro), and (3) an R2 lifecycle rule as a last backstop. A Space is also
capped at 500 visible drops: the oldest unpinned burn first.

### 4.7 Pairing a device

Implemented as a **custom Better Auth plugin** (`pairing-plugin.ts`), not the built-in
device-authorization plugin (that one is OAuth-shaped and returns bearer tokens, not
browser cookies; see ADR-0003).

1. New device: `POST /api/auth/pairing/start` → `{userCode "XXXX-XXXX", secret, expiresAt}`.
   The 8-character code uses an unambiguous alphabet; the **secret** is a 256-bit value
   that never leaves that browser. Only its SHA-256 is stored. TTL 10 min.
2. Signed-in device: `/link` → `pairing/info` (shows browser, OS, rough location, time) →
   `pairing/decide {approve}`. Both are rate limited (10 / 10 min per user).
3. New device polls `pairing/poll {userCode, secret}` every 2 s. On `approved`, the row is
   consumed with a conditional update (single use), a normal session is created and its
   cookie set. Seeing the code on screen is not enough to take the session: the secret is
   required.
4. The new session is bound to a Device through the same hook as any sign-in.

## 5. Security summary

Full detail in [SECURITY.md](SECURITY.md). In short: Argon2id PIN hashes, row-locked
lockout, grants bound to (user, device, `pin_version`), server-only publishing, scoped
Ably tokens, private R2 with short presigned URLs and forced `attachment`, text always
rendered as text, no content in logs.

## 6. Environments

| Env | Database | Bucket | Notes |
|-----|----------|--------|-------|
| Local | Local Postgres (or a Neon dev branch) | `.dev-storage/` on disk | No Ably/Resend/Redis needed |
| Preview | Neon branch per preview (Vercel-Neon integration) | `rezorb-preview` | |
| Production | Neon main | `rezorb-prod` | |

Setup steps: [DEPLOYMENT.md](DEPLOYMENT.md).

## 7. Local fallbacks and test mode

| Service | Without credentials (non-production) |
|---------|--------------------------------------|
| R2 | `src/server/storage.ts` serves the same presign contract from `.dev-storage/` through `/api/dev-storage/[token]` (HMAC-signed, expiring tokens; path traversal rejected). 404 in production. |
| Ably | `/api/realtime/token` → `{mode:"poll"}`; publishing is a no-op. |
| Resend | Mail is printed and pushed to `devOutbox`. In production a missing key makes sending **throw**. |
| Upstash | In-memory sliding window (per instance). |

`REZORB_E2E=1` lets the Playwright suite run a **production build** without R2/Resend. It is
refused (throws) when `VERCEL_ENV=production`, so it cannot be honoured on a real deploy.

## 8. Public URL resolution

`env.appUrl` reads **runtime** variables first (`APP_URL`, `BETTER_AUTH_URL`, then Vercel's
`VERCEL_PROJECT_PRODUCTION_URL` / `VERCEL_URL`), then `NEXT_PUBLIC_APP_URL`. `NEXT_PUBLIC_*`
values are inlined at *build* time, so relying on them can silently bake in the wrong
origin and make Better Auth reject every request ("Invalid origin"). On a custom domain
set `BETTER_AUTH_URL` explicitly.

## 9. Decisions that departed from the original plan

| Plan | Built | Why |
|------|-------|-----|
| shadcn/ui (Radix) | Hand-written `Button`, `Input`, `Dialog` + `cmdk` | The design system is highly custom; fewer dependencies; the dialog implements focus trapping, Esc and focus return itself |
| `pino` | Tiny structured logger | No dependency needed; content-free by construction |
| Better Auth device-authorization plugin | Custom `pairing` plugin | That plugin is OAuth-shaped; we need a browser session cookie |
| `user.storage_used_bytes` counter | `SUM` over unexpired drops | Cannot drift; stays correct when cleanup runs late (Hobby cron) — [ADR-0008](adr/0008-quota-by-sum.md) |
| Strict nonce CSP | Basic security headers only | **Not yet implemented** — tracked in [ROADMAP](ROADMAP.md#m8--launch-hardening) |
| TanStack Router | Next.js file router | Single deployable |

## 10. Performance

Targets from the plan are **not yet measured** (no production deployment, no Ably key):
paste → visible p95 < 1 s; API p95 < 250 ms; Space-route JS < 180 KB gz. Measured so far:
polling-mode catch ≈ 2.7–2.9 s; integration suite (49 tests incl. a 26 MB multipart round
trip) ≈ 14 s.

## 11. Planned for v2 (schema already allows)

- **E2E encryption** ([ADR-0007](adr/0007-e2e-encryption-v2.md)): `space.encryption`,
  `space.kdf_salt`, `drop.iv` exist as nullable columns.
- **Share links:** a separate `share_links` table; `drops` needs no change.
- **Multi-user Spaces:** a `space_members` table; today `space.owner_id` is the only member.
