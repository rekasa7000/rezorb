# Rezorb: Release Plan

Status: **v1 is built and tested locally; not deployed.** Written 2026-11-21, updated 2026-11-27.

This is what stands between the current code and a first public release, in priority order. It is based on a
check of the repository (what exists, what does not), not on the roadmap's intentions. Related documents:
[ROADMAP.md](ROADMAP.md) (milestone status), [TESTING.md](TESTING.md) (what is and is not verified),
[SECURITY.md](SECURITY.md), [DEPLOYMENT.md](DEPLOYMENT.md), [MARKET.md](MARKET.md) (why the order below).

Effort sizes are rough estimates for one developer: **S** is up to a day, **M** is two to five days, **L** is
one to three weeks.

## 1. Definition of "releasable"

All of these must be true before anyone outside your own devices uses it:

- Every item in section 2 is done.
- Items B1, B2, B3 and B5 in section 3 are done. B4 is done or consciously deferred.
- The first-deploy checklist in [DEPLOYMENT.md](DEPLOYMENT.md#6-first-deploy-checklist-do-on-a-preview) passes on a preview.
- Time-to-catch is **measured** with Ably (target: under one second at the 95th percentile). So far it has only
  been measured in polling mode, at about 2.7 to 2.9 seconds.
- The full suite is green on the preview and in CI.

## 2. Release blockers (trust, safety, and "does it work for real")

| # | Item | Why it blocks release | Size | Done when |
|---|------|----------------------|------|-----------|
| A1 | **Run on the real services**: Neon, R2, Ably, Resend, Upstash, Vercel | Nothing has ever run against them. R2 multipart, Ably tokens and presence, and the cron are all unverified | M | The DEPLOYMENT first-deploy checklist passes; the integration suite passes on a Neon branch; a real client cannot publish to Ably |
| A2 | **Content-Security-Policy** (nonce-based) | The security doc lists it as the largest open item. Without it, one XSS bug becomes account takeover | M | Strict CSP is served, the inline theme script carries the nonce, and the e2e suite shows no CSP violations in the console |
| A3 | **Terms of Service, Privacy Policy, acceptable use, abuse and DMCA contact** | You are storing other people's files. Required to take money, and by most payment and email providers | S to M | Pages exist, are linked from the footer and the sign-up form, and name a contact. Have a lawyer review them; this plan is not legal advice |
| A4 | **Account deletion and data export** | A privacy-law requirement, and a trust signal. Neither exists | M | Deleting an account removes its rows, sessions and every storage object under `u/{userId}/`, proven by an integration test; export returns a zip of current Drops |
| A5 | **Forgot-password and resend-verification pages** | The server hook for password reset exists but there is no page, so a user who forgets their password is locked out | S | `/forgot-password` and `/reset-password` work end to end (verified with the dev outbox), with rate limits |
| A6 | **Exercise the paths that are written but never run**: email verification, magic link, passkeys | Production requires email verification. A broken link means nobody can sign up | M | A real email arrives; the magic link signs in once; a passkey registers and signs in using a Playwright virtual authenticator |
| A7 | **Error monitoring, privacy-friendly analytics, uptime check** | You cannot operate or measure what you cannot see. The activation metric does not exist yet | S to M | Sentry with PII scrubbing; one analytics event for "beamed on two devices"; an uptime monitor on `/` and `/api/cron/burn` (expects 401) |
| A8 | **CI** (GitHub Actions) | Five test suites exist and none runs automatically | S | Typecheck, lint, unit, integration (Postgres service) and e2e run on every pull request |
| A9 | **Ops basics**: backups, secret rotation runbook, account disable, R2 lifecycle rule | A single bad day with no restore path ends the product | S | Neon point-in-time restore tried once; the runbook is written; a one-line script disables an account |
| A10 | **Manual accessibility and device passes** | axe is automated and catches only part of the problem; the clipboard and file picker behave differently on phones | S to M | A VoiceOver or NVDA run of sign-in, enter, paste and copy; iOS Safari image copy checked; Android camera and picker checked |

## 3. Core product features before release

These are product gaps, not polish. Each one raises the share of new users who get a first successful transfer,
which is the number the whole business depends on.

| # | Feature | Why now | Size | Acceptance |
|---|---------|---------|------|------------|
| B1 | **"Open on your other device"**: the address and a QR code shown in an empty Space and from the header | Activation means beaming on two devices, but today device two has to find the site, sign in and type the name and PIN, with no help. This is the biggest single activation lever | S | A QR opens `/spaces` with the Space name prefilled (never the PIN); covered by an e2e test |
| B2 | **Arrival signals**: the tab title shows a count ("(2) Work swap") and an optional browser notification when a Drop lands while the tab is in the background | The product promise is "instantly". If you are in another tab, you cannot tell it arrived | S | The title updates on arrival (e2e); notifications ask for permission only after the user opts in |
| B3 | **Storage meter and clear quota messages** in Settings (the Limits tab lists limits but not usage) | People hit the 1 GB or 50 MB limits and need to know why | S | Settings shows used and remaining space; the quota error says what to delete |
| B4 | **PWA with Web Share Target** (Android), plus a documented iOS Shortcut | "Phone photo to desktop" is a headline use case, and the phone currently has no way to send into a Space from the share sheet | M | Installable; sharing a photo from the phone opens a picker (or the last Space) and beams it |
| B5 | **Pricing page and waitlist** (no billing yet) | You need real demand data before building billing. See [MARKET.md](MARKET.md) | S | An email is captured in the database and rate limited; the pricing page states plans honestly as "not available yet" |

## 4. After release, in order

| # | Item | Gate | Size |
|---|------|------|------|
| C1 | **End-to-end encryption** ([ADR-0007](adr/0007-e2e-encryption-v2.md)) | Do before charging. The only strong reason to pay, and it reduces your exposure to what users store. Needs a design for passphrase or passkey-PRF keys, because a 6-digit PIN is too weak | L |
| C2 | **Stripe, plans and limit enforcement** (Free and Pro) | Only after the pre-sale gate in MARKET.md section 7 | M to L |
| C3 | **CLI and API tokens** | Developers are the first wedge; gives a daily-use habit | M |
| C4 | **Browser extension, Raycast and Alfred integrations** | Free, compounding distribution | M |
| C5 | **Single-Drop share links** | Needs malware scanning and an abuse flow first ([SECURITY.md](SECURITY.md#8-before-any-sharing-feature-v2-ships)) | L |
| C6 | **Team plan**: admin console, SSO, audit log, retention policy | Only with design partners | L |
| C7 | **Generated art** wired in from [ASSETS.md](ASSETS.md) | Needs the images generated first | S |

## 5. Deliberately not before release

| Not now | Reason |
|---------|--------|
| End-to-end encryption | Large, and the landing page already says plainly that it is not in place yet. Required before charging, not before opening |
| Billing | Validate demand first; building Stripe before a price test is the most expensive guess available |
| Share links, team plan, CLI | Each adds abuse, support or sales load before the core loop is proven |

## 6. Suggested order

1. **First two weeks:** A1 (deploy to a preview), A5, A8, A7, and start the A3 text.
2. **Next two weeks:** A2, A4, A6, then B1, B2, B3.
3. **Then:** B4, B5, A9, A10. Soft-launch to about 20 people you know.
4. **Read the numbers:** activation, week-4 retention, waitlist and pre-sales. Decide on C1 and C2 from evidence.

## 7. Already done, so it is not on this list

Accounts and device pairing, PIN-locked Spaces with lockout, text, image and file Drops, expiry, quotas,
realtime with a polling fallback, the full design system with Calm mode and Daylight, a 3D hero, the logo set,
and 22 end-to-end, 56 integration and 33 unit tests, plus password reset, a CI workflow, the "open on another device" QR, arrival signals and a usage meter (see section 8). See [ROADMAP.md](ROADMAP.md).

## 8. Progress since this plan was written

| Item | State |
|------|-------|
| A5 forgot/reset password | Done. Pages, dev-outbox integration tests (including an open-redirect check) and e2e. Resend-verification page is still open |
| A8 CI | Written (`.github/workflows/ci.yml`: check, integration with a Postgres service, e2e). **Not yet run on GitHub**; treat it as unverified until the first run is green |
| B1 open on another device | Done. QR and link carry the Space name, never the PIN; deep links survive sign-in (e2e for every signed-in page) |
| B2 arrival signals | Done. Tab title shows a count while the tab is hidden; browser notification is opt-in per device and never contains Drop content |
| B3 storage meter | Done. Settings, Limits shows storage, Spaces and devices against their limits; the quota error points there |

Two bugs found on the way, both fixed: polling mode never learned which device it was, so arrivals from other
devices were never announced; and the app layout's bare auth guard dropped the `next` link on deep links.
Polling now also continues in a background tab (it relies on Ably once configured).
