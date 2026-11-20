# Rezorb — Build Roadmap & Status

Legend: ✅ done and tested · 🟡 built, **not yet verified against the real service** ·
⬜ not done. Last updated 2026-11-20.

## At a glance

| Milestone | Status |
|-----------|--------|
| [M0 Restructure](#m0--restructure) | ✅ (CI and Vercel link: ⬜) |
| [M1 Design foundation](#m1--design-foundation) | ✅ |
| [M2 Accounts & devices](#m2--accounts--devices) | ✅ core · 🟡 email verification, passkeys, magic link |
| [M3 Spaces & PIN](#m3--spaces--pin) | ✅ |
| [M4 Text drops & realtime](#m4--text-drops--realtime) | ✅ with polling · 🟡 Ably |
| [M5 Images & files](#m5--images--files) | ✅ on the stand-in · 🟡 real R2 |
| [M6 Expiry, quotas & limits](#m6--expiry-quotas--limits) | ✅ · 🟡 Vercel Cron |
| [M7 Polish](#m7--polish) | ✅ mostly (see gaps) |
| [M8 Launch hardening](#m8--launch-hardening) | ⬜ mostly open — **don't launch before this** |

---

## M0 · Restructure ✅

- ✅ Legacy Vite + Express apps removed (commit `3c84314` keeps them).
- ✅ Next.js 16 at the repo root; TypeScript strict; ESLint; Vitest; Playwright; pnpm.
- ✅ `vercel.json` (build command, cron) and `.env.example`.
- ⬜ GitHub Actions CI (typecheck → lint → unit → integration → e2e).
- ⬜ Vercel project + Neon/Upstash/R2/Ably/Resend linked ([DEPLOYMENT.md](DEPLOYMENT.md)).

## M1 · Design foundation ✅

- ✅ Tokens, themes (Dark, Daylight, System), Calm mode, accents, cascade layers ([DESIGN.md](../DESIGN.md)).
- ✅ Starfield (30 fps cap, pauses when hidden, freezes if it can't keep up), Nebula, Grain, Orb/Wordmark, ornaments.
- ✅ Button, Input/Field, Dialog (focus trap, Esc, focus return).
- ⬜ A `/dev/kitchen-sink` component gallery (planned, not built).

## M2 · Accounts & devices

- ✅ Email + password sign-up/sign-in; devices bound to sessions; list / rename / revoke (live sign-out via polling or realtime).
- ✅ **Pairing:** `/pair` (code + QR + polling) and `/link` (approve with requester details).
- ✅ One-time workplace notice per device.
- 🟡 Email verification (required in production), magic link, passkeys: code and UI exist; need Resend and a real browser/WebAuthn run to verify.
- ⬜ Breached-password check; password-reset UI (the server hook exists, no page yet).

## M3 · Spaces & PIN ✅

- ✅ Create / unlock / lock / rename / re-accent / change lifetime / change PIN / delete.
- ✅ Argon2id, PIN strength rules (shared client + server), lockout with doubling, row-locked counting, enumeration-safe responses, per-user and per-IP limits, lockout email.
- ✅ Launchpad, PIN keypad (masked, on-screen keypad on touch), lockout countdown UI.

## M4 · Text drops & realtime

- ✅ Beam text/code/link (optimistic, classified client-side, re-validated server-side); copy; pin; extend; delete with 5 s undo.
- ✅ Page-wide paste; Dock; keyboard shortcuts; command palette; presence UI.
- ✅ Polling fallback also detects PIN change, device revoke and Space deletion.
- 🟡 **Ably** (token capabilities, presence, events): written but never run against Ably. First thing to verify once a key exists.

## M5 · Images & files

- ✅ Single and multipart uploads with progress, retry, cancel; client-side thumbnails; pasted screenshots; drag-and-drop overlay; lightbox; copy-as-image; downloads as attachment; 50 MB / 1 GB limits.
- 🟡 Real R2: presigned PUT/GET, multipart and `HEAD` use the AWS SDK, compiled but not run. Needs the bucket CORS rule (`ExposeHeaders: ETag`) — see [DEPLOYMENT.md](DEPLOYMENT.md).

## M6 · Expiry, quotas & limits ✅

- ✅ Read-time filter, opportunistic burn, `/api/cron/burn`, stale-upload cleanup, 500-drop cap, quota by SUM, Space delete purges blobs.
- 🟡 Vercel Cron invocation itself, and the R2 lifecycle rule.
- ⬜ Settings → per-Space storage meter (the Limits tab lists limits but doesn't show usage yet).

## M7 · Polish

- ✅ Landing, Launchpad, Space, auth screens, settings, 404, error boundary, OG image, favicon.
- ✅ Daylight theme, Calm mode, mobile layout (verified at 390 px: no horizontal overflow), axe clean in Dark and Daylight.
- ✅ Float view (opt-in, desktop), command palette, shortcut cheat-sheet.
- ⬜ Illustrations beyond the CSS/SVG ornaments; the full asset checklist in DESIGN §14.
- ⬜ Real-device passes (iOS Safari clipboard-image copy, Android file picker/camera).

## M8 · Launch hardening ⬜

- ⬜ **Content-Security-Policy** (nonce-based; see [SECURITY §5](SECURITY.md#5-http-headers)).
- ⬜ Sentry (PII scrubbed), Vercel Analytics/Speed Insights, uptime check.
- ⬜ Account deletion (full purge) and data export; Privacy Policy and Terms.
- ⬜ GitHub Actions CI; run the e2e suite against Vercel previews.
- ⬜ Load test (≈200 concurrent devices) and a real latency measurement with Ably.
- ⬜ Manual screen-reader pass (VoiceOver/NVDA); axe is automated only.
- ⬜ Domain, trademark search, move to Vercel **Pro** if commercial (Hobby is non-commercial and limits cron to daily).

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
