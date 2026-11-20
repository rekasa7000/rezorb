# ADR-0003: Better Auth

**Status:** Accepted and implemented, with the fallback below

## Context
Requirements: email + password, magic link, passkeys, and a **device-pairing**
sign-in (the new device shows a code, a signed-in device approves it), so the
user doesn't type a password on a work machine. Sessions must carry a
`deviceId`. The current backend uses hand-rolled JWT-in-cookie auth.

## Decision
Use **Better Auth** with the Drizzle adapter and these plugins: `magicLink`,
`passkey`, `deviceAuthorization` (RFC 8628-style), plus rate limiting. A
`session.create` hook binds the session to a `device` row.

## Consequences
- Pro: Covers every required method without custom crypto.
- Pro: Self-hosted in our DB, so there are no per-MAU costs.
- Con: Pin the version and read release notes, because the plugin APIs move.
- If the device authorization plugin doesn't fit, the fallback is a small custom
  `pairing` table (code, status, requesting UA, expiry) plus a polling endpoint,
  about 150 lines of code.

## Alternatives considered
- **Auth.js (NextAuth v5):** no built-in device flow, and weaker passkey support.
- **Clerk:** fastest to ship and has device/session management, but it's a
  paid, hosted dependency for core identity.
- **Keep the custom JWT:** we'd have to build magic links, passkeys, and pairing ourselves.

## Update (as built)
- **Pairing uses the fallback**, a small custom Better Auth plugin (`src/server/pairing-plugin.ts`),
  not the built-in `device-authorization` plugin. That plugin follows RFC 8628: the polling device
  receives an OAuth-style access token, not a browser session cookie, and we need the cookie.
  Design: an 8-character code (unambiguous alphabet) for humans plus a separate 256-bit **secret**
  that stays in the new browser (only its SHA-256 is stored), so reading the code over a shoulder
  isn't enough to take the session. Single-use consume via a conditional update. See
  [ARCHITECTURE §4.7](../ARCHITECTURE.md#47-pairing-a-device).
- Passkeys are the separate `@better-auth/passkey` package. **Written, not exercised in a browser.**
- Magic link, email verification: written, **not exercised** (no email provider in development).
- Email verification is required in production (and when `RESEND_API_KEY` is set); off locally.
- Better Auth's own rate limiter is configured with `storage: "database"` (a `rate_limit` table),
  because its default in-memory store doesn't work across serverless instances.
- The Better Auth CLI is now the `auth` package (`npx auth generate`); `@better-auth/cli` is deprecated.

