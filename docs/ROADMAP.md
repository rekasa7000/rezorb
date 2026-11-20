# Rezorb — Build Roadmap & Status

Legend: **Done** = built and tested. **Unverified** = built, **not yet verified against the real service**.
**Open** = not done. Last updated 2026-11-20.

## At a glance

| Milestone | Status |
|-----------|--------|
| [M0 Restructure](#m0--restructure) | Done (CI and Vercel link still open) |
| [M1 Design foundation](#m1--design-foundation) | Done |
| [M2 Accounts & devices](#m2--accounts--devices) | Done: core. Unverified: email verification, passkeys, magic link |
| [M3 Spaces & PIN](#m3--spaces--pin) | Done |
| [M4 Text drops & realtime](#m4--text-drops--realtime) | Done with polling. Unverified: Ably |
| [M5 Images & files](#m5--images--files) | Done on the stand-in. Unverified: real R2 |
| [M6 Expiry, quotas & limits](#m6--expiry-quotas--limits) | Done. Unverified: Vercel Cron |
| [M7 Polish](#m7--polish) | Mostly done (see gaps) |
| [M8 Launch hardening](#m8--launch-hardening) | Mostly open: **don't launch before this** |

---

## M0 · Restructure
- Done: Legacy Vite + Express apps removed (commit `3c84314` keeps them).
- Done: Next.js 16 at the repo root; TypeScript strict; ESLint; Vitest; Playwright; pnpm.
- Done: `vercel.json` (build command, cron) and `.env.example`.
- Open: GitHub Actions CI (typecheck → lint → unit → integration → e2e).
- Open: Vercel project + Neon/Upstash/R2/Ably/Resend linked ([DEPLOYMENT.md](DEPLOYMENT.md)).

## M1 · Design foundation
- Done: Tokens, themes (Dark, Daylight, System), Calm mode, accents, cascade layers ([DESIGN.md](../DESIGN.md)).
- Done: Starfield (30 fps cap, pauses when hidden, freezes if it can't keep up), Nebula, Grain, Orb/Wordmark, ornaments.
- Done: Button, Input/Field, Dialog (focus trap, Esc, focus return).
- Open: A `/dev/kitchen-sink` component gallery (planned, not built).

## M2 · Accounts & devices

- Done: Email + password sign-up/sign-in; devices bound to sessions; list / rename / revoke (live sign-out via polling or realtime).
- Done: **Pairing:** `/pair` (code + QR + polling) and `/link` (approve with requester details).
- Done: One-time workplace notice per device.
- Unverified: Email verification (required in production), magic link, passkeys: code and UI exist; need Resend and a real browser/WebAuthn run to verify.
- Open: Breached-password check; password-reset UI (the server hook exists, no page yet).

## M3 · Spaces & PIN
- Done: Create / unlock / lock / rename / re-accent / change lifetime / change PIN / delete.
- Done: Argon2id, PIN strength rules (shared client + server), lockout with doubling, row-locked counting, enumeration-safe responses, per-user and per-IP limits, lockout email.
- Done: Launchpad, PIN keypad (masked, on-screen keypad on touch), lockout countdown UI.

## M4 · Text drops & realtime

- Done: Beam text/code/link (optimistic, classified client-side, re-validated server-side); copy; pin; extend; delete with 5 s undo.
- Done: Page-wide paste; Dock; keyboard shortcuts; command palette; presence UI.
- Done: Polling fallback also detects PIN change, device revoke and Space deletion.
- Unverified: **Ably** (token capabilities, presence, events): written but never run against Ably. First thing to verify once a key exists.

## M5 · Images & files

- Done: Single and multipart uploads with progress, retry, cancel; client-side thumbnails; pasted screenshots; drag-and-drop overlay; lightbox; copy-as-image; downloads as attachment; 50 MB / 1 GB limits.
- Unverified: Real R2: presigned PUT/GET, multipart and `HEAD` use the AWS SDK, compiled but not run. Needs the bucket CORS rule (`ExposeHeaders: ETag`) — see [DEPLOYMENT.md](DEPLOYMENT.md).

## M6 · Expiry, quotas & limits
- Done: Read-time filter, opportunistic burn, `/api/cron/burn`, stale-upload cleanup, 500-drop cap, quota by SUM, Space delete purges blobs.
- Unverified: Vercel Cron invocation itself, and the R2 lifecycle rule.
- Open: Settings → per-Space storage meter (the Limits tab lists limits but doesn't show usage yet).

## M7 · Polish

- Done: Landing, Launchpad, Space, auth screens, settings, 404, error boundary, OG image, favicon.
- Done: Daylight theme, Calm mode, mobile layout (verified at 390 px: no horizontal overflow), axe clean in Dark and Daylight.
- Done: Float view (opt-in, desktop), command palette, shortcut cheat-sheet.
- Done: Logo set (outlined SVG), editorial lockup, apple-touch icon, three.js landing hero ([DESIGN §16](../DESIGN.md#16-vogue-in-orbit-logo-art-direction-and-the-3d-hero)).
- Open: Generated imagery (key art, textures, UI illustrations): prompts are ready in [ASSETS.md](ASSETS.md); the images themselves need generating and wiring in.
- Open: Real-device passes (iOS Safari clipboard-image copy, Android file picker/camera).

## M8 · Launch hardening
- Open: **Content-Security-Policy** (nonce-based; see [SECURITY §5](SECURITY.md#5-http-headers)).
- Open: Sentry (PII scrubbed), Vercel Analytics/Speed Insights, uptime check.
- Open: Account deletion (full purge) and data export; Privacy Policy and Terms.
- Open: GitHub Actions CI; run the e2e suite against Vercel previews.
- Open: Load test (≈200 concurrent devices) and a real latency measurement with Ably.
- Open: Manual screen-reader pass (VoiceOver/NVDA); axe is automated only.
- Open: Domain, trademark search, move to Vercel **Pro** if commercial (Hobby is non-commercial and limits cron to daily).

---

## Verified vs. not

See [TESTING.md](TESTING.md#what-is-and-isnt-verified) for the full list. In one line:
**everything runs and is tested against local Postgres 16 with the filesystem storage
stand-in and polling; nothing has been run against Neon, R2, Ably, Resend, Upstash or Vercel.**

## v2 backlog (ordered by expected impact)

1. **E2E encryption** with a passphrase or passkey-PRF key ([ADR-0007](adr/0007-e2e-encryption-v2.md)).
2. **PWA + Web Share Target:** share from an Android phone's share sheet into a Space.
3. **Share links:** a single Drop via an expiring wormhole-style URL (needs [SECURITY §8](SECURITY.md#8-before-any-sharing-feature-v2-ships)).
4. **Shared Spaces:** a second member.
5. **Paid tier:** larger files, longer lifetimes, more storage.
6. Search within a Space; sanitised Markdown rendering for AI answers.
