# ADR-0004: Ably for realtime

**Status:** Proposed

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
