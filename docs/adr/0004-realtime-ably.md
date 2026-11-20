# ADR-0004: Ably for realtime

**Status:** Accepted; implemented but **not yet run against Ably**

## Context
Text pasted on one device must appear on another in under 1s (p95). Vercel
functions can't hold sockets, so socket.io can't run there. We need per-Space
authorization, presence (the Constellation), and no client-side publishing.

## Decision
Use **Ably** Channels. The server mints **TokenRequests** whose capabilities are
limited to `subscribe` + `presence` on `space:{id}` for Spaces with valid grants.
**Only the server publishes**, through Ably REST from Route Handlers. If the
connection drops, the client falls back to polling with `?since=`.

## Consequences
- ✅ Fine-grained capability tokens, presence built in, and connection recovery with message history.
- ✅ The free tier covers early usage. Usage is mostly connection-minutes and messages.
- ➖ Another vendor and another set of keys.
- Keep the realtime module behind a small interface (`publish(channel, event, data)`,
  `createToken(capabilities)`) so the provider can be swapped.

## Alternatives considered
- **Pusher Channels:** similar and simpler, with private channels via an auth
  endpoint. A good fallback choice.
- **Supabase Realtime:** good if Supabase is adopted for the DB (see ADR-0002).
- **PartyKit / Cloudflare Durable Objects:** most flexible, but it means a second
  deploy target.
- **Polling only:** simplest, but misses the "instant" promise.

## Update (as built)
- Without `ABLY_API_KEY` the token route answers `{mode:"poll"}` and the client polls every 2.5 s.
  This is also the **safety net** when Ably is configured but unreachable for 10 s, and it is how a
  device in poll mode learns it lost access (PIN changed, device revoked, Space deleted).
- All end-to-end tests ran in poll mode (time-to-catch ≈ 2.7–2.9 s). The sub-second target is
  **unmeasured** until an Ably key is available.
- Ably `clientId` = device id, so presence maps directly onto the Constellation.

