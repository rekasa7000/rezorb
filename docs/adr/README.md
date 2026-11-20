# Architecture Decision Records

| # | Decision | Status |
|---|----------|--------|
| [0001](0001-nextjs-fullstack-on-vercel.md) | Single Next.js full-stack app on Vercel (replace Vite + Express) | Accepted, implemented |
| [0002](0002-postgres-neon-drizzle.md) | Postgres on Neon with Drizzle (replace MongoDB/Mongoose) | Accepted, implemented* |
| [0003](0003-better-auth.md) | Better Auth for accounts, passkeys, magic links; custom device pairing | Accepted, implemented* |
| [0004](0004-realtime-ably.md) | Ably for realtime (replace socket.io), with a polling fallback | Accepted, implemented* |
| [0005](0005-storage-cloudflare-r2.md) | Cloudflare R2 with presigned URLs for files (replace Cloudinary) | Accepted, implemented* |
| [0006](0006-expiry-strategy.md) | Layered expiry: read filter + opportunistic burn + cron + lifecycle rule | Accepted, implemented |
| [0007](0007-e2e-encryption-v2.md) | End-to-end encryption in v2, schema-ready in v1 | Deferred |
| [0008](0008-quota-by-sum.md) | Storage quota computed with SUM, not a stored counter | Accepted, implemented |
| [0009](0009-dev-fallbacks-and-test-switch.md) | Local fallbacks behind interfaces + a guarded e2e switch | Accepted, implemented |

\* Implemented and tested against local services only. See each ADR's **Update (as built)**
and [TESTING.md](../TESTING.md#not-verified) for what is not yet verified against the real
service (Neon, Ably, R2, Resend).

Template: Context → Decision → Consequences → Alternatives considered.
