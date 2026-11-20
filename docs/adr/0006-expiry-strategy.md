# ADR-0006: Layered expiry

**Status:** Proposed

## Context
Drops expire after 1h, 24h, or 7d. Vercel Cron on the **Hobby** plan runs at most
**once per day**. Pro allows per-minute schedules. Expiry must *look* exact to
the user, and storage must actually be freed.

## Decision
Five layers:
1. **Read-time filter:** every query includes `expires_at > now()`. This is the
   source of truth for visibility.
2. **Client timers:** cards burn themselves at `expiresAt` (with the animation).
3. **Cron `/api/cron/burn`:** hourly on Pro (`0 * * * *`) or daily on Hobby
   (`0 3 * * *`). It deletes rows and R2 objects in batches, fixes quotas, and
   publishes `drop.burned`.
4. **Opportunistic burn:** when a Space is opened, a background task
   (`after()` in Next.js) burns that Space's expired drops. This covers Hobby's
   daily cron gap for active Spaces.
5. **R2 lifecycle rule:** deletes objects older than 8 days. This is the last
   line of defense.

## Consequences
- ✅ Expiry is exact for users. Storage is freed within hours on Pro and within a day on Hobby.
- ➖ On Hobby, quota numbers may include expired-but-unburned bytes for up to a
  day. The quota check therefore sums only unexpired drops.
- Note: Vercel Hobby is for non-commercial use. Move to Pro before charging money.
