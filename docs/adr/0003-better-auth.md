# ADR-0003: Better Auth

**Status:** Proposed

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
- ✅ Covers every required method without custom crypto.
- ✅ Self-hosted in our DB, so there are no per-MAU costs.
- ➖ Pin the version and read release notes, because the plugin APIs move.
- If the device authorization plugin doesn't fit, the fallback is a small custom
  `pairing` table (code, status, requesting UA, expiry) plus a polling endpoint,
  about 150 lines of code.

## Alternatives considered
- **Auth.js (NextAuth v5):** no built-in device flow, and weaker passkey support.
- **Clerk:** fastest to ship and has device/session management, but it's a
  paid, hosted dependency for core identity.
- **Keep the custom JWT:** we'd have to build magic links, passkeys, and pairing ourselves.
