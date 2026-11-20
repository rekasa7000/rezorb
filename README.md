# Rezorb

> **Throw it into space. Catch it on the other side.**

Rezorb is a private, floating **Space** between your own devices. Open the same Space on your
work laptop and your personal laptop (or phone), **paste on one, and catch it on the other**.
It handles text, AI answers, code, screenshots, photos and files. There's nothing to install and
no emailing yourself.

- 🔒 Every Space is locked with a **name + PIN**, on top of your account (Argon2id, lockout, per-device grants).
- ⏱ Drops **burn up** automatically after 1 hour, 24 hours or 7 days.
- 🛰 **Realtime** presence: see which of your devices are in the Space.
- 📲 **Pair a device with a code or QR**, so you never type a password on a machine you don't trust.
- 🌌 A loud, maximalist space aesthetic with a **Calm mode** for the office, plus a Daylight theme.

> **Status:** v1 is built and tested locally (33 unit, 49 integration, 14 end-to-end tests, axe-clean
> in both themes). It has **not been deployed**, and Neon, R2, Ably, Resend and Upstash have not
> been exercised for real. Read [docs/TESTING.md](docs/TESTING.md#not-verified) and
> [docs/ROADMAP.md](docs/ROADMAP.md) before launching. **Don't launch without a CSP.**

## Quick start

Requires Node ≥ 20.19, pnpm, and a Postgres (15+).

```bash
pnpm install
cp .env.example .env.local        # set DATABASE_URL, BETTER_AUTH_SECRET, GRANT_SECRET
createdb rezorb && pnpm db:migrate
pnpm dev                          # http://localhost:3000
```

With nothing else configured, files are stored on disk, realtime falls back to polling, email is
printed to the console, and sign-up signs you straight in. To try it: sign up, make a Space, then
open a private window, sign in, and unlock the same Space.

| Command | What it does |
|---------|--------------|
| `pnpm test` | Unit tests |
| `pnpm test:int` | Integration tests against Postgres (`rezorb_test`) |
| `pnpm e2e` | Playwright, two browser contexts = two devices |
| `pnpm typecheck` / `pnpm lint` | |
| `pnpm db:generate` / `pnpm db:migrate` | Drizzle migrations |

## Stack

Next.js 16 (App Router) · React 19 · TypeScript 5.9 · Tailwind v4 · three.js (react-three-fiber) · Motion · TanStack Query ·
Zustand · Zod · Drizzle + Postgres (Neon) · Better Auth · Ably · Cloudflare R2 · Upstash Redis ·
Resend · Vercel.

## Documentation

| Doc | What's in it |
|-----|--------------|
| [docs/PRD.md](docs/PRD.md) | Problem, positioning, decisions, user stories, limits, metrics |
| [DESIGN.md](DESIGN.md) | The maximalist design system: brand, colour, type, motion, components, Calm mode, as-built notes |
| [CONTEXT.md](CONTEXT.md) | Domain vocabulary (Space, Drop, Beam, Grant, …) |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | The system as built: flows, layout, fallbacks, departures from the plan |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md) | Postgres schema, invariants, quota accounting |
| [docs/API.md](docs/API.md) | REST and realtime contract |
| [docs/SECURITY.md](docs/SECURITY.md) | Threat model with implemented / tested / open status |
| [docs/adr/](docs/adr/README.md) | Architecture decision records |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Milestone status (done / unverified / open) and the v2 backlog |
| [docs/TESTING.md](docs/TESTING.md) | What the tests prove, and what they don't |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Vercel, Neon, R2, Ably, env vars, first-deploy checklist |
| [docs/ASSETS.md](docs/ASSETS.md) | "Vogue in orbit" art direction, the logo set, and every image prompt to generate |

## History

This repo began as *Zorb*, a Vite + Express + MongoDB chat prototype. That code is preserved at
commit `3c84314` (the last commit before the restructure).
