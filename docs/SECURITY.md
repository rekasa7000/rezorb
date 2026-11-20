# Rezorb — Security & Privacy

## 1. What we protect

| Asset | Why it matters |
|-------|----------------|
| Drop contents (text, images, files) | These are personal, often sensitive (AI output, documents, photos) |
| Account sessions | A session gives access to the Launchpad |
| Space PINs | They are the second lock on every Space |
| The device list | It reveals which machines a person uses |

## 2. Threat model

| # | Threat | Mitigation |
|---|--------|------------|
| T1 | **Session left open on a shared or work machine** | The PIN is required per Device, and Space grants expire after 12h idle. "Lock" is always visible. Devices can be revoked remotely, which kills sessions and grants and signs out live through `device.revoked`. |
| T2 | **PIN brute force** | Argon2id hashing. 5 failures per Space trigger a lockout of 15m, which doubles each time up to 24h. Per-user (10/min) and per-IP (30/min) rate limits. Lockouts publish `space.sealed` and send an email alert. Weak PINs are rejected. |
| T3 | **Space name enumeration** | Names are scoped per user, so you can only ever probe your own. Unknown names and wrong PINs get the same response and the same timing (a dummy Argon2 verify runs). |
| T4 | **Account takeover** | Passwords are hashed with scrypt (Better Auth default), passkeys are supported, and email is verified. Rate-limited sign-in. Breached-password check (HIBP k-anonymity) at sign-up. Pairing codes expire after 10 minutes and need explicit approval showing the requesting browser and OS. |
| T5 | **Pairing phishing** (attacker gets the user to approve the attacker's code) | The approval screen shows the requesting device's browser, OS, approximate location (from Vercel geo headers), and time, with the copy: "Only approve if you are looking at this code on your own screen right now." |
| T6 | **Malicious content served from our origin (XSS)** | Text is always rendered as text. Shiki output is the only generated HTML, and it comes from a trusted library. Files are always served from the R2 domain, never our origin, with `attachment` disposition. Only image MIME types may be inline. There is a strict CSP. |
| T7 | **Realtime injection or eavesdropping** | Clients get subscribe/presence-only Ably tokens scoped to Spaces with valid grants. Only the server publishes. |
| T8 | **Presigned URL leakage** | PUT URLs live for 5 minutes and are bound to one exact key and content type. GET URLs live for 60 seconds and are minted per request after a grant check. |
| T9 | **Storage abuse / cost blow-up** | Quotas (50 MB/file, 1 GB/user, 10 Spaces), expiry, stale-upload cleanup, and an R2 lifecycle backstop. v1 has no public links, so the service can't be used as a public file host. |
| T10 | **CSRF** | `SameSite=Lax` cookies, `Origin` checks, and a JSON content type required on all mutations. |
| T11 | **Insider / server compromise reads content** | v1: data is encrypted at rest (Neon and R2 default) and access is limited. v2: **E2E encryption** so the server sees only ciphertext ([ADR-0007](adr/0007-e2e-encryption-v2.md)). |
| T12 | **Clipboard over-reach** | We never read the clipboard without a user gesture. We use the `paste` event, not `navigator.clipboard.read()` polling. The empty-state "clipboard type hint" only appears if permission is already granted. |

## 3. Cookies

| Cookie | Purpose | Flags |
|--------|---------|-------|
| `better-auth.session_token` | Session | HttpOnly, Secure, SameSite=Lax |
| `rz_dev` | Stable device ID | HttpOnly, Secure, SameSite=Lax, signed, 1 year |
| `rz_g_{spaceId}` | Space grant | HttpOnly, Secure, SameSite=Lax, signed (HMAC-SHA256 with `GRANT_SECRET`), expires with the grant |

## 4. HTTP headers

Set in `next.config.ts` and middleware:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{n}' 'strict-dynamic';
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https://*.r2.cloudflarestorage.com;
  connect-src 'self' https://*.r2.cloudflarestorage.com https://*.ably.io wss://*.ably.io https://*.ably-realtime.com wss://*.ably-realtime.com;
  font-src 'self';
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), clipboard-read=(self), clipboard-write=(self)
```

## 5. Privacy

- **Content is never logged.** Logs contain IDs, kinds, sizes, and durations only.
  Sentry has `sendDefaultPii: false`, and request bodies are scrubbed.
- **No third-party trackers.** We use Vercel Analytics (cookieless) only.
- **Retention:** Drops are deleted at expiry. A deleted Space is purged within
  1h. A deleted account has all data purged within 24h, including R2 prefixes.
- **Data export:** Settings has an "Export everything in orbit" option that
  produces a zip of all current Drops.
- **Workplace notice:** shown once per Device after first sign-in:
  > "Rezorb is for moving your own things between your own devices. If this is a
  > work computer, your organization's data policies still apply."

## 6. Secrets

All secrets are Vercel environment variables, scoped per environment. They are
never exposed with the `NEXT_PUBLIC_` prefix. The full list is in
[DEPLOYMENT.md](DEPLOYMENT.md#environment-variables). Rotate `GRANT_SECRET` by
supporting two keys (`GRANT_SECRET`, `GRANT_SECRET_PREV`) during rollover.

## 7. Before any sharing feature (v2) ships

- [ ] Malware scanning on uploads (for example Cloudflare or a ClamAV worker) before anything is shared
- [ ] Abuse reporting and takedown flow, plus a DMCA contact
- [ ] CSAM hash-matching for shared images
- [ ] Per-link rate limits and expiry
- [ ] Terms of Service and an Acceptable Use Policy updated
