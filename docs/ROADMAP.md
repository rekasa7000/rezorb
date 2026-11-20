# Rezorb — Build Roadmap

Milestones are ordered by dependency. Each one ends with something you can
deploy and demo on Vercel. Every task links back to the spec that defines it.
Estimates assume one developer.

---

## M0 · Restructure (≈ 1–2 days)

Goal: an empty Next.js app deploys to Vercel from this repo, and the old apps are gone.

- [ ] Work on a feature branch. Tag the current state `zorb-legacy` so the old code stays in history.
- [ ] Remove `frontend/` and `backend/`. Scaffold Next.js at the repo root
      (`create-next-app` with TS, App Router, Tailwind, ESLint, `src/`, pnpm).
- [ ] Port the reusable pieces:
  - `frontend/src/components/shared/AestheticsCanvas.tsx` → `src/components/cosmos/Starfield.tsx` (with the fixes in DESIGN § 13)
  - `frontend/src/components/ui/*` (shadcn) → re-run `shadcn init` and re-add the components
  - `backend/src/utils/error.ts` + `response.ts` → `src/server/http.ts` (an `AppError` class and an `apiHandler()` wrapper that maps errors to the API.md error shape)
  - `backend/src/utils/logger.ts` → `src/server/log.ts` (pino, no content fields)
- [ ] Add tooling: TypeScript strict mode, ESLint, Prettier, Vitest, Playwright, and Husky + lint-staged.
- [ ] Add CI (GitHub Actions): typecheck, lint, unit tests, and e2e against the preview URL.
- [ ] Connect to Vercel. Add Neon, Upstash, and the env vars ([DEPLOYMENT.md](DEPLOYMENT.md)).
- [ ] Add `vercel.json` with the cron entry.
- **Done when:** the `main` branch deploys a "Hello, orbit" page at the production URL, and PRs get previews.

## M1 · Design foundation (≈ 2–3 days)

Goal: the maximalist shell exists before features do.

- [ ] `src/styles/tokens.css` with every token from [DESIGN § 3–5, 7](../DESIGN.md), mapped in `@theme inline`.
- [ ] Load the fonts with `next/font/google` (Unbounded, Instrument Serif, Space Grotesk, JetBrains Mono).
- [ ] Cosmos layers: `Starfield`, `Nebula`, `Grain`, `Ornament`, `Orb` (logo).
- [ ] Prefs store (Zustand persisted to localStorage, with try/catch): `theme`, `calm`, `view`.
- [ ] Calm mode and reduced-motion wiring, including the FPS watchdog fallback.
- [ ] Restyle the primitives: Button variants, Input, Sticker, Toast (sonner), Dialog/Sheet, Tooltip.
- [ ] A `/dev/kitchen-sink` page (preview builds only) showing every component in every state, in both themes and in Calm mode.
- **Done when:** the kitchen sink matches DESIGN.md and passes axe with 0 violations.

## M2 · Accounts & devices (≈ 3–4 days)

Spec: [ADR-0003](adr/0003-better-auth.md), [API § Auth/Devices](API.md), [SECURITY T1/T4/T5](SECURITY.md).

- [ ] Drizzle setup, Better Auth schema generation, and the `device` table.
- [ ] Better Auth config: email+password (with verification via Resend), magic link, passkey.
- [ ] `rz_dev` cookie and a session→device binding hook. Label devices from the User-Agent (`ua-parser-js`).
- [ ] Pages: `/sign-up`, `/sign-in` (split nebula layout), and an `(app)` layout guard.
- [ ] **Pairing:** `/pair` (code + QR, polling) and `/link` (approve, with device details).
- [ ] Settings → Devices: list, rename, revoke. Plus the `user:{id}` channel `device.revoked` → auto sign-out (stub realtime until M4).
- [ ] The one-time workplace notice.
- [ ] Rate limits on auth endpoints (Upstash).
- **Done when:** you can sign up on laptop A, pair laptop B without typing a password on B, and revoke B from A.

## M3 · Spaces & PIN (≈ 3 days)

Spec: [DATA_MODEL § space, space_grant](DATA_MODEL.md), [API § Spaces](API.md#spaces), [ARCHITECTURE § 4.1](ARCHITECTURE.md#41-unlocking-a-space).

- [ ] `space` and `space_grant` tables, `src/server/pin.ts` (Argon2id, strength check, lockout math).
- [ ] `src/server/grants.ts`: issue, verify (`requireSpaceGrant`), slide, revoke, signed cookie.
- [ ] Endpoints: list, create, unlock, lock, PATCH, change PIN, delete.
- [ ] Launchpad (`/spaces`): "Where to?" hero, Enter-a-Space form with `PinKeypad`, Space cards, Create flow.
- [ ] `/s/[slug]`: a server-side grant check. If it fails, show the PIN screen inline with the name prefilled.
- [ ] Lockout UI (shake, countdown) and the email alert on lockout.
- **Done when:** the Space lifecycle works end to end. Brute force is sealed after 5 tries. Changing the PIN kicks out other devices on their next request.

## M4 · Text drops & realtime (≈ 4 days) ← **first "magic moment"**

Spec: [ARCHITECTURE § 4.2, 4.4, 4.5](ARCHITECTURE.md#42-beaming-text), [ADR-0004](adr/0004-realtime-ably.md).

- [ ] `drop` table, `src/server/drops.ts`, and the text drop endpoints.
- [ ] `src/lib/classify.ts` (text / code / link) + Shiki highlighting (lazy-loaded).
- [ ] Ably: `/api/realtime/token`, `src/server/realtime.ts`, `useSpaceChannel` hook (cache inserts, presence), polling fallback.
- [ ] Space UI: header with Constellation and BurnRing, `DropFeed` (Grid), `DropCard` (text/code/link), and the Dock.
- [ ] `usePasteToBeam`: a page-level paste listener with optimistic insert.
- [ ] `useCopyDrop`: clipboard write with fallback, the `COPIED` sticker, and the `C` shortcut.
- [ ] Delete with undo, pin, and extend.
- [ ] Arrival, beam, copy, and burn animations.
- **Done when:** paste on laptop A shows up on laptop B in under 1s, and one key copies it on B. **Dogfood from here on.**

## M5 · Images & files (≈ 4 days)

Spec: [ARCHITECTURE § 4.3](ARCHITECTURE.md#43-beaming-a-file-or-image), [ADR-0005](adr/0005-storage-cloudflare-r2.md), [API § uploads](API.md#post-apispacesiduploads-).

- [ ] Create the R2 buckets, CORS, and the lifecycle rule. Add `src/server/storage.ts` (presign PUT/GET, multipart, HEAD, delete prefix).
- [ ] The uploads, complete, and download endpoints. Quota accounting in transactions.
- [ ] `useUpload`: single and multipart via XHR with progress, retry, and cancel.
- [ ] Paste a screenshot to get an image Drop (client thumbnail + dimensions).
- [ ] The full-page drop zone ("LET GO TO BEAM") and the attach button (mobile camera/photos).
- [ ] Image card, lightbox, copy-as-image (with PNG conversion), and download.
- [ ] File card (icon by MIME, middle-truncated name), download.
- **Done when:** a phone photo reaches the desktop in under 3s on Wi-Fi, and a 50 MB PDF round-trips with a progress bar.

## M6 · Expiry, quotas & limits (≈ 2 days)

Spec: [ADR-0006](adr/0006-expiry-strategy.md), [PRD § 9](PRD.md#9-limits-free-tier-v1).

- [ ] `/api/cron/burn` + `vercel.json` cron. Opportunistic burn via `after()` when a Space is opened.
- [ ] Stale upload cleanup, and the 500-drops-per-Space cap.
- [ ] Nightly quota recompute.
- [ ] Settings → Lifetimes (per-Space default) and storage meter UI.
- [ ] Space delete purges the R2 prefix.
- **Done when:** a 1h Drop vanishes on every device at T+1h (UI) and is gone from R2 by the next cron run.

## M7 · Polish: maximalism pass (≈ 3–4 days)

- [ ] Landing page (hero, marquee, how-it-works, use-case wall, comparison, privacy, CTA).
- [ ] Float view (opt-in) with idle drift.
- [ ] Command palette and the keyboard cheat-sheet (`?`).
- [ ] Empty states and illustrations, OG image, favicon set.
- [ ] Daylight theme QA.
- [ ] Mobile pass: Dock behavior with the virtual keyboard, PIN keypad, touch targets.
- **Done when:** design review against DESIGN.md is signed off on desktop and mobile, in both themes, with Calm mode on and off.

## M8 · Launch hardening (≈ 2–3 days)

Spec: [SECURITY.md](SECURITY.md), [TESTING.md](TESTING.md).

- [ ] CSP with nonces, security headers, Origin checks on all mutations.
- [ ] Rate limits on every endpoint per API.md.
- [ ] Sentry (with PII scrubbing), Vercel Analytics, Speed Insights, and a simple uptime check.
- [ ] Data export, account deletion (full purge), Privacy Policy, Terms.
- [ ] Accessibility audit (axe plus a manual VoiceOver/NVDA run of the core flow).
- [ ] Load test: 200 concurrent devices beaming text. Ably and Neon stay within free/paid tier limits.
- [ ] Move to Vercel **Pro** if launching commercially (hourly cron, commercial use).
- [ ] Domain (`rezorb.app` or an alternative). Run a trademark search.
- **Done when:** the launch checklist is green and the soft launch goes to 20 beta users.

---

## v2 backlog (ordered by expected impact)

1. **E2E encryption** with a passphrase or passkey-PRF key ([ADR-0007](adr/0007-e2e-encryption-v2.md)).
2. **PWA + Web Share Target:** share from an Android phone's share sheet straight into a Space.
3. **Share links:** a single Drop via an expiring wormhole-style URL (needs the [SECURITY § 7](SECURITY.md#7-before-any-sharing-feature-v2-ships) checklist).
4. **Shared Spaces:** a second member (partner or teammate).
5. **Paid tier:** larger files, longer lifetimes, more storage.
6. Drop search within a Space, and markdown rendering for AI answers (sanitized).
