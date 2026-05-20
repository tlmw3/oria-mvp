# Architecture

Two services, one Postgres, one process manager. Nothing fancy.

## Topology

```
┌────────────────────┐         ┌─────────────────────┐
│  oria-frontend     │         │  oria-api           │
│  Next.js 14        │ HTTPS → │  Fastify 4.28       │
│  PWA, App Router   │         │  TypeScript         │
└────────────────────┘         └─────────┬───────────┘
        │                                │
        │                                ▼
        │                       ┌─────────────────────┐
        │                       │  Postgres (Supabase)│
        │                       │  EU-West, pooler    │
        ▼                       └─────────────────────┘
   Privy SDK
   viem (Morpho vaults)
   web-push (VAPID)
```

* Both processes run on a single Linux box behind Nginx (TLS termination + proxy).
* PM2 supervises them: `oria-api` (id 13) on port 3002, `oria-frontend` (id 12) on port 3000.
* `oria-telegram` (id 18) is an owner-only relay bot, unrelated to user traffic.
* An external scheduler hits `/api/cron/*` endpoints daily, gated by a shared `CRON_SECRET`.

## Backend modules

Each module is a self-contained folder under `backend/src/modules`:

| Module | Responsibility |
| --- | --- |
| `auth` | Privy JWT verification (`/api/auth/verify`), agent dev-token bypass. |
| `users` | Profile CRUD, friend discovery and search, profile-by-id reads. |
| `streaks` | Activity logging, live APY recompute (`getMyStreak`), weekly evaluator (`evaluateStreaks`), pool-APY math (`apy.utils.ts`), Morpho vault APY fetcher (`morpho.service.ts`). |
| `social` | Friendships (request/accept/reject/remove), notifications, the feed (`/feed`, `/feed/:id/like`), leaderboards, pokes. |
| `challenges` | CRUD, join, per-week consistency grid + collective milestones. Owner-only PATCH guarded by `creatorId`. |
| `wallet` | Earnings (`/earnings` — uses `getMyStreak` for live APY), deposit history, the mock `/balance` endpoint. |
| `strava` | OAuth exchange, sync, last-run fetch, dominant-discipline classification for pace. |
| `cron` | Daily run reminders + weekly recap, both shared-secret gated. |
| `push` | VAPID keys, subscribe / unsubscribe. |

## Frontend layout

* `app/(app)/*` — authenticated routes (Home, Wallet, Social, Challenges, Stats, Profile, Settings, Streak, etc.).
* `app/(onboarding)/onboarding` — the four-step first-run flow.
* `app/landing` — public marketing page.
* `app/strava/callback` — OAuth redirect target.
* `app/api/*` — thin Next route handlers that proxy the Fastify API (so the frontend can use relative URLs).

All client-side data flows through `lib/hooks.ts` — every backend endpoint has a typed React Query wrapper or mutation. That file is the single source of truth for client-side types.

## Deployment

* `prisma db push` for schema changes (no formal migration directory; the demo iterates fast).
* `pnpm build` then `pm2 restart <name>` for both services.
* `documentation/PROJECT_STATE.md` mirrors the current shape of the code in case you forget which version of the model is shipped.
