# Rezorb — Architecture

Status: **Proposed** · Target: Vercel · Last updated: 2026-11-20

## 1. Overview

Rezorb is **one full-stack Next.js app** deployed on Vercel. Vercel functions
can't hold WebSocket connections open, and they cap request bodies at 4.5 MB.
Two parts of the system therefore use managed services:

- **Realtime** goes through a hosted pub/sub service (**Ably**), so the app server
  never holds sockets.
- **File bytes** go **straight from the browser to object storage** (**Cloudflare R2**)
  through presigned URLs, so the app server never handles file bodies.

```
                         ┌──────────────────────────── Vercel ───────────────────────────┐
  Device A (browser)     │  Next.js (App Router)                                         │
  ─────────────────      │   • RSC pages (/, /spaces, /s/[slug], /settings, /pair)      │
   paste / drop ─────────┼─▶ • Route Handlers  /api/**   (Node runtime)                  │
                         │   • Better Auth     /api/auth/**                              │
                         │   • Cron            /api/cron/burn  (Vercel Cron)            │
                         └──────┬───────────┬──────────────┬──────────────┬─────────────┘
                                │           │              │              │
                     SQL (Drizzle)   rate limit      publish events   presign PUT/GET
                                │           │              │              │
                        ┌───────▼──┐  ┌─────▼────┐  ┌──────▼─────┐  ┌─────▼──────┐
                        │  Neon    │  │ Upstash  │  │   Ably     │  │ Cloudflare │
                        │ Postgres │  │  Redis   │  │  Realtime  │  │     R2     │
                        └──────────┘  └──────────┘  └──────┬─────┘  └─────▲──────┘
                                                           │ subscribe    │ PUT bytes
  Device B (browser) ◀─────────── drop.created ────────────┘              │ (direct)
                                                     Device A ────────────┘
```

## 2. Stack

| Layer | Choice | Why (ADR) |
|-------|--------|-----------|
| Framework | **Next.js (App Router, latest stable) + TypeScript (strict)** | One deployable on Vercel, RSC + Route Handlers. [ADR-0001](adr/0001-nextjs-fullstack-on-vercel.md) |
| UI | Tailwind CSS v4, shadcn/ui (Radix), `motion`, `lucide-react`, `sonner`, `cmdk`, Shiki | Carried over from the current frontend, and matches [DESIGN.md](../DESIGN.md) |
| Client state | TanStack Query (server cache) + Zustand (UI prefs: calm mode, view) | Carried over from the current frontend |
| Validation | Zod (shared between client and server) | One schema per payload |
| Database | **Neon Postgres** (Vercel Marketplace) + **Drizzle ORM** | [ADR-0002](adr/0002-postgres-neon-drizzle.md) |
| Auth | **Better Auth** (email+password, magic link, passkey, device authorization) | [ADR-0003](adr/0003-better-auth.md) |
| Realtime | **Ably** (token auth, channels, presence) | [ADR-0004](adr/0004-realtime-ably.md) |
| File storage | **Cloudflare R2** (S3 API, private bucket, presigned URLs) | [ADR-0005](adr/0005-storage-cloudflare-r2.md) |
| Rate limiting | **Upstash Redis** + `@upstash/ratelimit` | Serverless-friendly, per-key sliding windows |
| Email | **Resend** + React Email | Magic links, verification, lockout alerts |
| PIN hashing | `@node-rs/argon2` (Argon2id) | Native, fast, works in the Vercel Node runtime |
| Scheduled jobs | **Vercel Cron** → `/api/cron/burn` | [ADR-0006](adr/0006-expiry-strategy.md) |
| Observability | Vercel Analytics + Speed Insights, Sentry, structured logs (`pino`) | |
| Tests | Vitest (unit/integration), Playwright (e2e, two browser contexts = two devices) | [TESTING.md](TESTING.md) |
| Package manager | pnpm | |

## 3. Source layout

```
/
├─ src/
│  ├─ app/
│  │  ├─ (marketing)/page.tsx            # Landing
│  │  ├─ (auth)/sign-in/page.tsx
│  │  ├─ (auth)/sign-up/page.tsx
│  │  ├─ (auth)/pair/page.tsx            # New device shows code + QR
│  │  ├─ (app)/layout.tsx                # Requires session; cosmos layers
│  │  ├─ (app)/spaces/page.tsx           # Launchpad
│  │  ├─ (app)/s/[slug]/page.tsx         # The Space (requires Space grant)
│  │  ├─ (app)/link/page.tsx             # Signed-in device approves a pairing code
│  │  ├─ (app)/settings/[[...tab]]/page.tsx
│  │  ├─ api/
│  │  │  ├─ auth/[...all]/route.ts       # Better Auth handler
│  │  │  ├─ spaces/route.ts              # GET list, POST create
│  │  │  ├─ spaces/unlock/route.ts
│  │  │  ├─ spaces/[id]/route.ts         # PATCH, DELETE
│  │  │  ├─ spaces/[id]/lock/route.ts
│  │  │  ├─ spaces/[id]/pin/route.ts
│  │  │  ├─ spaces/[id]/drops/route.ts   # GET list, POST text drop
│  │  │  ├─ spaces/[id]/uploads/route.ts # POST → presigned PUT
│  │  │  ├─ drops/[id]/route.ts          # PATCH, DELETE
│  │  │  ├─ drops/[id]/complete/route.ts # finalize upload
│  │  │  ├─ drops/[id]/download/route.ts # → 302 presigned GET
│  │  │  ├─ realtime/token/route.ts      # Ably token request
│  │  │  ├─ devices/route.ts, devices/[id]/route.ts
│  │  │  └─ cron/burn/route.ts
│  │  ├─ fonts.ts
│  │  ├─ layout.tsx, globals.css
│  │  └─ opengraph-image.tsx
│  ├─ components/
│  │  ├─ ui/                 # shadcn primitives (restyled)
│  │  ├─ cosmos/             # Starfield, Nebula, Grain, Ornament, Orb
│  │  ├─ space/              # Dock, DropCard, DropFeed, Constellation, BurnRing, DropZone
│  │  ├─ launchpad/          # SpaceCard, EnterSpaceForm, PinKeypad
│  │  └─ marketing/
│  ├─ server/                # server-only code ("server-only" import guard)
│  │  ├─ db/schema.ts, db/index.ts, db/migrations/
│  │  ├─ auth.ts             # Better Auth config
│  │  ├─ grants.ts           # Space grant issue/verify/revoke
│  │  ├─ pin.ts              # hash/verify/strength/lockout
│  │  ├─ drops.ts            # create/list/burn/quota
│  │  ├─ storage.ts          # R2 presign helpers
│  │  ├─ realtime.ts         # Ably REST publish + token
│  │  ├─ ratelimit.ts
│  │  └─ email/
│  ├─ lib/                   # isomorphic: zod schemas, drop-kind detection, formatting
│  ├─ hooks/                 # useSpaceChannel, usePasteToBeam, useCopyDrop, useUpload
│  ├─ stores/                # zustand: prefs
│  └─ styles/tokens.css
├─ e2e/                      # Playwright
├─ drizzle.config.ts
├─ vercel.json               # crons
└─ .env.example
```

The current `frontend/` (Vite) and `backend/` (Express) folders are **retired**.
The migration plan is in [ROADMAP.md](ROADMAP.md#m0--restructure).

## 4. Key flows

### 4.1 Unlocking a Space

```
Browser                              /api/spaces/unlock                 Postgres / Redis
  │ POST {name, pin}  ─────────────────▶│
  │                                     │ session? deviceId? (Better Auth)
  │                                     │ ratelimit: ip+user (Redis) ───────▶
  │                                     │ load space by (ownerId, lower(name))
  │                                     │ lockedUntil > now? → 423
  │                                     │ argon2.verify(pinHash, pin)
  │                                     │   ✗ → failedAttempts++; maybe lockout; 401 {attemptsLeft}
  │                                     │   ✓ → reset counter; insert space_grant
  │◀── 200 {space} + Set-Cookie: rz_g_{spaceId}=<signed grantId>; HttpOnly; Secure; SameSite=Lax; Path=/
  │ router.push(/s/{slug})
```

- An unknown Space name and a wrong PIN return the **same** response shape and
  similar timing (we run a dummy Argon2 verify) so names can't be enumerated.
- Every Space route checks for **(a)** a valid session, **(b)** a cookie grant
  whose DB row is unrevoked, unexpired, and matches the session's user and
  device, and **(c)** that `grant.pinVersion == space.pinVersion`. The helper is
  `requireSpaceGrant(spaceId)`.
- Each successful request slides the grant's `expiresAt` forward (idle timeout,
  12h). Writes are debounced to at most one per minute.

### 4.2 Beaming text

1. The Dock (or the page-level `paste` listener) reads `ClipboardEvent.clipboardData`.
2. The client classifies the content (`lib/classify.ts`): `link` if it is a
   single URL, `code` if heuristics fire (braces/indentation/keywords, or
   `text/html` from an IDE), otherwise `text`.
3. The client shows an optimistic card. It sends `POST /api/spaces/:id/drops` `{kind, text, lifetime?}`.
4. The server validates the request, checks size and quota, inserts the drop, and publishes
   `drop.created` (with the full drop, including text ≤ 64 KB) to Ably channel
   `space:{id}`. If the text is larger, it publishes metadata only and clients fetch the drop.
5. Other devices receive the event and insert it into the TanStack Query cache.
   The arrival animation plays.

### 4.3 Beaming a file or image

```
Client                         API                                 R2
  │ POST /uploads {name,size,mime,sha256?} ─▶ │ validate size/quota/mime
  │                                           │ insert drop(status='uploading', blobKey)
  │◀── {dropId, putUrl (5 min), headers}      │
  │ PUT bytes ──────────────────────────────────────────────────────▶│ (progress via XHR)
  │ POST /drops/{id}/complete ──────────────▶ │ HEAD object → size matches?
  │                                           │ status='ready'; publish drop.created
  │◀── {drop}
```

- Files over 25 MB use **multipart upload**. The server issues per-part presigned URLs.
- Pasted images (screenshots) arrive as `image/png` blobs. Before uploading, the
  client reads the dimensions and creates a small **thumbnail** (max 480px WebP)
  in a canvas. The thumbnail is uploaded as a second object, `…/thumb.webp`.
- Drops left in `uploading` for more than 1h are burned by the cron job.

### 4.4 Catching

- **Text/code/link:** `navigator.clipboard.writeText()`. If that fails, fall back
  to a hidden textarea and `execCommand('copy')`.
- **Image:** fetch the blob through the download URL, then call
  `navigator.clipboard.write([new ClipboardItem({'image/png': blob})])`. If the
  image is not PNG, convert it to PNG in a canvas first. Fall back to Download.
- **File:** `GET /api/drops/:id/download` checks the grant, then responds `302`
  to a presigned R2 GET URL (60s TTL) with
  `response-content-disposition=attachment; filename*=…`. Files are never
  served inline from our origin, which prevents hosted-HTML XSS.

### 4.5 Realtime

- The client calls `POST /api/realtime/token`. The server returns an Ably
  **TokenRequest** whose capability is **subscribe + presence** only, on
  `space:{id}` for each Space the device holds a valid grant for. The TTL is
  1h, and the client refreshes it automatically.
- **Only the server publishes** (Ably REST from Route Handlers). Clients cannot
  publish, so a compromised client can't inject Drops.
- Presence data is `{deviceId, label, kind}`. That is how the Constellation is drawn.
- Events are listed in [API.md § Realtime](API.md#realtime-events).
- **Fallback:** if Ably is disconnected for more than 10s, TanStack Query polls
  `GET /drops?since=` every 5s until it reconnects.

### 4.6 Expiry ("burn")

See [ADR-0006](adr/0006-expiry-strategy.md). In short:
1. **Read-time filter:** every query adds `expires_at > now()`, so expired Drops
   are invisible at once.
2. **Client timers:** cards remove themselves when their `expiresAt` passes.
3. **Cron:** `/api/cron/burn` deletes expired rows and their R2 objects in
   batches, then publishes `drop.burned`.
4. **R2 lifecycle rule:** a backstop that deletes any object older than 8 days.

### 4.7 Pairing a device

1. The new device opens `/pair`. Better Auth's device authorization flow issues
   a `user_code` (8 characters, shown as `XXXX-XXXX` plus a QR code for
   `rezorb.app/link?code=…`) and a `device_code`, then polls.
2. On a signed-in device, the user opens `/link`, enters or scans the code, sees
   "Approve sign-in for *Chrome on Windows*?", and approves it.
3. The new device's poll succeeds, a session is created, and a Device record is
   created. The code expires after 10 minutes.

## 5. Security summary

Full detail is in [SECURITY.md](SECURITY.md).

- Argon2id PIN hashes, per-Space lockout, and per-IP/per-user rate limits.
- Space grants are bound to (user, device, pinVersion). Changing the PIN or
  revoking a device kills all grants.
- Server-only publish to Ably. Tokens are scoped per Space.
- Private R2 bucket with short-lived presigned URLs. Downloads always use
  `attachment` disposition.
- A strict CSP. Text content is never rendered as HTML.
- No content is logged. Logs carry IDs and sizes only.

## 6. Environments

| Env | Branch | DB | R2 bucket | Ably app |
|-----|--------|----|-----------|----------|
| Local | — | Neon dev branch (or local Postgres via Docker) | `rezorb-dev` | dev key |
| Preview | any PR | Neon **branch per preview** (Vercel ↔ Neon integration) | `rezorb-preview` | dev key |
| Production | `main` | Neon main | `rezorb-prod` | prod key |

Setup steps are in [DEPLOYMENT.md](DEPLOYMENT.md).

## 7. Performance targets

| Metric | Target |
|--------|--------|
| Paste → visible on other device (text) | p95 < 1s |
| Space page LCP (desktop, cached) | < 1.8s |
| JS on Space route | < 180 KB gz (decorations lazy-loaded) |
| API p95 (non-upload) | < 250ms |

## 8. Planned v2 changes (designed for now)

- **E2E encryption** ([ADR-0007](adr/0007-e2e-encryption-v2.md)): `spaces.encryption`
  and `spaces.kdfSalt`, and `drops.iv`, already exist as nullable columns.
- **Share links:** a separate `share_links` table. The `drops` table needs no
  changes.
- **Multi-user Spaces:** add a `space_members` table. Today `spaces.owner_id` is
  the only member.
