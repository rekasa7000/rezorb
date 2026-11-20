# Rezorb

> **Throw it into space. Catch it on the other side.**

Rezorb is a private, floating **Space** between your own devices. Open the same
Space on your work laptop and your personal laptop (or phone), **paste on one,
and catch it on the other** within a second. It handles text, AI answers, code,
screenshots, photos, and files. There's nothing to install and no emailing
yourself.

- 🔒 Every Space is locked with a **name + PIN**, on top of your account.
- ⏱ Drops **burn up** automatically after 1h, 24h, or 7d.
- 🛰 **Realtime**: see which of your devices are in the Space right now.
- 🌌 A loud, maximalist space aesthetic, with a **Calm mode** for the office.

> **Status:** planning complete, build starting. The `frontend/` (Vite) and
> `backend/` (Express) folders are the legacy *Zorb* prototype. They will be
> replaced by a single Next.js app in milestone M0.

## Documentation

| Doc | What's in it |
|-----|--------------|
| [docs/PRD.md](docs/PRD.md) | Problem, positioning, decisions, user stories, limits, metrics |
| [DESIGN.md](DESIGN.md) | The maximalist design system: brand, color, type, motion, components, Calm mode |
| [CONTEXT.md](CONTEXT.md) | Domain vocabulary (Space, Drop, Beam, Grant, …) |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design on Vercel, source layout, key flows |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md) | Postgres schema and invariants |
| [docs/API.md](docs/API.md) | REST and realtime contract |
| [docs/SECURITY.md](docs/SECURITY.md) | Threat model, headers, privacy |
| [docs/adr/](docs/adr/README.md) | Architecture decision records |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Milestones M0–M8 and the v2 backlog |
| [docs/TESTING.md](docs/TESTING.md) | Test strategy and release gates |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Vercel, Neon, R2, Ably, and the environment variables |

## Stack

Next.js (App Router) · TypeScript · Tailwind v4 · shadcn/ui · Motion ·
TanStack Query · Zustand · Zod · Drizzle + Neon Postgres · Better Auth ·
Ably · Cloudflare R2 · Upstash Redis · Resend · Vercel

## Quick start (after M0)

```bash
pnpm install
cp .env.example .env.local
pnpm db:migrate
pnpm dev
```
