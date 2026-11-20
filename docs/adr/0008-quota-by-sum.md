# ADR-0008: Storage quota is computed with SUM, not stored

**Status:** Accepted and implemented (changed from the original plan)

## Context
The first design kept `user.storage_used_bytes`, incremented on upload and decremented on burn in the
same transaction, plus a nightly recompute to fix drift. Every code path that creates, completes,
extends, burns or cascades a drop would have to maintain it, and a late cron (Vercel Hobby: daily)
would leave expired bytes counted, locking users out of space they no longer use.

## Decision
No counter. Usage = `SUM(size_bytes + thumb_bytes)` over the user's drops where `expires_at > now()`
and (`status = 'ready'` or created within the last hour). Checks run in a transaction holding
`pg_advisory_xact_lock(hashtext(user_id))`, so two parallel uploads can't both pass the check.
In-flight uploads reserve their declared size (plus 256 KB if a thumbnail is coming) and are trued
up on `complete`; an upload abandoned for over an hour stops counting.

## Consequences
- Pro: Cannot drift; expiry is exact for quota even when cleanup is late; one fewer column to maintain.
- Pro: No migration or recompute job to write.
- Con: One aggregate query per upload/beam. At ≤ 500 drops per Space and ≤ 10 Spaces this is small and
  uses the `(space_id, id)` index; revisit if limits grow by orders of magnitude.
- Con: The advisory lock serialises a single user's concurrent writes. Fine for a self-transfer product.
