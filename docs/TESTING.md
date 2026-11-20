# Rezorb — Testing

## Run it

```bash
pnpm typecheck          # tsc --noEmit
pnpm lint               # eslint
pnpm test               # unit        (no database)
pnpm test:int           # integration (needs local Postgres, see below)
pnpm e2e                # Playwright  (builds + starts the app on :3100; needs Postgres + a browser)
```

**Integration and e2e need Postgres** with a user `rezorb` (password `rezorb`) and a
database `rezorb_test`:

```bash
createdb -O rezorb rezorb_test      # then migrations are applied by the test setup itself
```

If the Playwright-managed browser isn't installed (CI images, sandboxes), point at an
existing Chromium: `PLAYWRIGHT_CHROMIUM_PATH=/path/to/chromium pnpm e2e`. Always run with
traces off (`pnpm e2e` already passes `--trace off`).

## Current results (2026-11-20)

| Suite | Count | Time | Notes |
|-------|-------|------|-------|
| Typecheck, lint | clean | | TS 5.9, ESLint 10 |
| Unit | 33 tests / 5 files | < 1 s | PIN rules, lockout math, lifetimes, classifier, formatting, optimistic-cache logic |
| Integration | 49 tests / 3 files | ~14 s | Route handlers called directly against real Postgres; a simulated `Device` = its own cookie jar and User-Agent |
| E2E | 9 tests | ~50 s | Real Chromium, production build, two browser contexts = two devices; includes axe (WCAG 2.2 AA) in Dark **and** Daylight |

## What the tests prove

**Integration** (`src/server/__tests__/`)

- *Accounts/devices:* a session is bound to a device and reused on the same browser; a second
  device appears; anonymous calls get 401; revoking a device kills its session and grants at
  once; a stranger can't revoke it; the 10-device limit.
- *PIN & lockout:* Argon2id hash stored; unknown name ≡ wrong PIN (same code and message);
  5 wrong PINs seal the Space (even for the right PIN) for 15 min, then 30 min on repeat; 8
  *concurrent* wrong guesses seal exactly once; success resets the counter; per-user rate limit;
  weak PIN / duplicate name (case-insensitive) / 10-Space quota.
- *Grants:* a grant for one Space can't open another; forged or tampered cookies rejected;
  another user can't use your cookie; a grant is bound to its device; expiry and revocation;
  changing the PIN keeps the changer in and locks everyone else out (old PIN dead).
- *CSRF:* cross-origin and non-JSON mutations rejected.
- *Drops:* ordering, source device, classification (a lying `link` is re-validated),
  `<script>` stored verbatim, size limits, `?since=` polling, cursor pagination.
- *Files:* upload → complete → visible on the other device → download as `attachment`; images
  inline only for safe types, HTML never inline; thumbnails; size mismatch removes the drop;
  50 MB limit; **26 MB multipart round trip with byte-exact size**; 1 GB quota counting
  in-flight uploads; strangers can't read or delete; forged or wrong-op storage tokens rejected.
- *Lifecycle:* pin → 7 days, extend never shortens; expired drops are hidden at once, then
  burned by the opportunistic path or the cron (auth-gated, idempotent, closed without a secret);
  stale uploads cleaned; 500-drop cap keeps pinned; Space delete purges blobs.
- *Pairing:* approve, decline, expiry, wrong secret (hijack attempt), replay, signed-in-only
  lookup/approve, code-guessing rate limit, requester labelling.

**E2E** (`e2e/space.spec.ts`)

1. Paste on device A → appears on B (measured ~2.7–2.9 s in polling mode) → `c` copies it to
   B's clipboard → B's page-wide paste beams back to A; source device is shown.
2. A pasted screenshot becomes an image on B; a 300 kB file round-trips with the **same SHA-256**.
3. Five wrong PINs → live seal countdown, Enter disabled.
4. PIN change on A → B drops to the PIN screen, old PIN rejected, new PIN works.
5. Revoking a device in Settings signs the other browser out.
6. A new device signs in with a code, no password typed; it sees the one-time notice.
7. Calm mode hides the cosmos layers; nothing but ≤ 120 ms opacity fades animates, including
   for a newly beamed drop; it persists after reload.
8. Keyboard only: `/` focuses the Dock, Enter beams, `j` focuses a card, Enter copies.
9. axe: landing, sign-in, sign-up, Launchpad, Space, Settings in Dark; landing, sign-in,
   Launchpad, Settings, Space in Daylight — zero violations.

Bugs these tests found and that were fixed along the way: a rate limit tripping back-to-back
sign-ups; PIN change / revoke not noticed by a device in polling mode; the optimistic card
re-mounting on the server's reply; a `role="feed"` structure error; low-contrast `--dim` and
ghost numerals; a focusable link inside an `aria-hidden` region.

## What is and isn't verified

### Verified (local Postgres 16, production build, filesystem storage stand-in, polling)

Everything above.

### <a id="not-verified"></a>Not verified — needs the real service or device

| Area | Why not | What to do |
|------|---------|------------|
| **Neon** | Developed against local Postgres | Run `pnpm test:int` with `DATABASE_URL` on a Neon branch |
| **Ably** (token capabilities, presence, `drop.*` events, reconnect catch-up, the "sub-second" claim) | No key in the build environment | Set `ABLY_API_KEY`, repeat e2e #1 and measure time-to-catch; verify a client **cannot** publish |
| **Cloudflare R2** (presign, multipart, `HEAD`, lifecycle, CORS `ETag`) | No credentials | Create a dev bucket, run the upload tests with `R2_*` set |
| **Resend** (verification, magic link, reset, lockout email) | No key | Set `RESEND_API_KEY`; walk the flows |
| **Passkeys** (WebAuthn) | Needs a browser authenticator | Playwright can drive a virtual authenticator over CDP — not written yet |
| **Better Auth's DB rate limiter** | Disabled under test/e2e (all browsers share one IP) | Check on a preview deploy |
| **Upstash** | Tests use the in-memory fallback | Set the Upstash env and re-run the rate-limit tests |
| **Vercel** (build with migrations, Cron invocation, function regions) | Not deployed | Deploy a preview |
| **Real phones** (iOS Safari image copy, Android camera/picker, virtual keyboard vs the Dock) | Desktop emulation only | Manual pass |
| **Screen readers** | axe is automated | Manual VoiceOver/NVDA run of sign-in → enter → paste → copy |
| **Load / latency targets** | Not run | M8 |

## CI (not set up yet)

Planned per PR: typecheck, lint, unit, integration (Neon branch), then e2e against the
Vercel preview. Nightly: e2e against production with a dedicated test account.
