# ADR-0002: Postgres (Neon) + Drizzle

**Status:** Proposed

## Context
The current backend uses MongoDB/Mongoose. Rezorb's data is small and
relational (user → device, space → drop, grant ↔ device). It needs
transactional quota accounting and efficient `expires_at` range deletes.
Vercel's Marketplace has a first-party Neon integration with a database branch
per preview deployment.

## Decision
Use **Neon Postgres** with **Drizzle ORM** and `drizzle-kit` migrations. Use the
pooled connection string for the app and the unpooled one for migrations. Use
the `@neondatabase/serverless` driver, or `pg` with pooling.

## Consequences
- ✅ Transactions for quota changes, unique constraints (`owner_id, name_key`), and cheap range indexes.
- ✅ A DB branch per preview deployment makes reviewing migrations easy.
- ✅ Better Auth has a first-class Drizzle adapter.
- ➖ The Mongo models are dropped. There is no production data to migrate.

## Alternatives considered
- **MongoDB Atlas + Mongoose** (keep the current stack): works on Vercel, but has weaker
  transactional ergonomics and no preview branching.
- **Supabase:** a good all-in-one (it could cover realtime and storage too), but it
  would lock three concerns to one vendor. Reasonable to revisit if you want fewer vendors.
