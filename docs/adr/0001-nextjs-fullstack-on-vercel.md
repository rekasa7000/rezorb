# ADR-0001: Single Next.js full-stack app on Vercel

**Status:** Accepted and implemented (founder, 2026-11-20)

## Context
The current repo is a Vite + React frontend and a separate Express + socket.io
backend. The founder wants to deploy on Vercel and prefers one full-stack
codebase. Vercel runs server code as functions. They can't hold long-lived
WebSocket connections, request bodies are capped at 4.5 MB, and there's no
always-on process for `socket.io`.

## Decision
Replace both apps with **one Next.js (App Router) app** at the repo root. Pages
are React Server Components. The API is Route Handlers on the Node.js runtime.
Realtime and file bytes move to managed services (ADR-0004, ADR-0005).

## Consequences
- Pro: One deploy, one set of env vars, preview deployments per PR, shared Zod types.
- Pro: The current frontend's choices (React 19, Tailwind v4, shadcn/ui, TanStack
  Query, Zustand, Zod, React Hook Form) carry over directly.
- Con: TanStack Router is replaced by the Next.js file router.
- Con: The Express code (controllers, middleware, Mongo models) is retired. Its
  logic (error handler, response helper, auth guard) is re-expressed as
  route-handler helpers.
- Risk: No server-held sockets, so realtime needs a third-party service.

## Alternatives considered
- **Keep Express and deploy it elsewhere (Railway/Fly)** while the frontend is on Vercel:
  two deploys and CORS/cookie complexity, against the founder's preference.
- **SvelteKit / Remix on Vercel:** viable, but the existing code and libraries are React and Next-friendly.

## Update (as built)
- Next.js 16.4 / React 19. **TypeScript is pinned to 5.9**, not 7: `typescript-eslint` doesn't
  support TS 7 yet and `pnpm lint` crashes on it. Revisit when it does.
- shadcn/ui was **not** used (see [ARCHITECTURE §9](../ARCHITECTURE.md#9-decisions-that-departed-from-the-original-plan)).
- Build-time vs runtime env: `NEXT_PUBLIC_*` values are inlined at build, so server code reads
  runtime variables (`BETTER_AUTH_URL`) first. This bit us once ("Invalid origin") and is why
  `BETTER_AUTH_URL` is required on a custom domain.

