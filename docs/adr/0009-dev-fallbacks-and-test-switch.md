# ADR-0009: Local fallbacks behind interfaces, and a guarded test switch

**Status:** Accepted and implemented

## Context
Rezorb depends on four paid/hosted services (R2, Ably, Resend, Upstash). Development, CI and the
automated tests need to run without credentials, and a bug or a missing secret in production must
**fail loudly, not silently degrade**.

## Decision
Each service sits behind a small module with a development fallback that is chosen **only when its
credentials are absent and the app isn't in production**:

| Service | Fallback |
|---------|----------|
| R2 | Filesystem store in `.dev-storage/`, served via HMAC-signed tokens at `/api/dev-storage/[token]` |
| Ably | `{mode:"poll"}` and a no-op publisher |
| Resend | Console + `devOutbox` |
| Upstash | In-memory sliding window |

In production, a missing R2 configuration or Resend key **throws**. The Playwright suite runs a
*production build* (to test what ships), so it needs those requirements relaxed: `REZORB_E2E=1` does
that, and `isE2E()` **throws if `VERCEL_ENV=production`**. The dev-storage route also 404s unless it is
the active store.

## Consequences
- Pro: The full app, including multipart uploads, runs and is tested with just Postgres.
- Pro: A misconfigured production deploy errors instead of quietly writing files to a lambda's disk.
- Con: The fallbacks are not the real thing: R2/Ably/Resend/Upstash behaviour is **untested** until run
  against the real services (see [TESTING.md](../TESTING.md#not-verified)).
- Con: `REZORB_E2E` is a deliberate hole in the production checks. It is guarded, documented, and
  should never be set outside the test runner.
