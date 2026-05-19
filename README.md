# Oria

**Gamified crypto savings — your running streak boosts your APY.**

Oria ties yield-bearing crypto deposits to personal fitness goals. Users deposit USDC into a Morpho vault, log their runs (Strava or manual), and earn a variable APY: a 3% baseline guaranteed for everyone, plus a redistribution bonus that grows with their weekly activity score. The most active users take a bigger slice of the pool.

🔗 Live: [oriamvp.cloud](https://oriamvp.cloud) · API: [api.oriamvp.cloud](https://api.oriamvp.cloud)

> 📄 **Need a deeper map?** [`documentation/PROJECT_STATE.md`](documentation/PROJECT_STATE.md) is the authoritative reference for modules, routes, constants, hardcoded values, deployment, and known limitations — extracted directly from the code and kept in sync.

---

## How it works

1. **Sign in** with Privy (email OTP, Google, or Apple). An embedded wallet is created automatically — no seed phrase.
2. **Set a weekly goal** in km (running, cycling, or steps).
3. **Connect Strava** so runs are verified on-chain-of-truth (OAuth, read-only).
4. **Fund your wallet** by sending USDC to your Oria address (QR + tap-to-copy).
5. **Invest** into the Morpho Steakhouse Prime USDC vault on Base, directly from the app.
6. **Run weekly** — meeting your goal grows your streak and your activity score, which lifts your APY.

---

## APY model — pool-based redistribution

Oria sources its reference yield from the **Steakhouse Prime USDC** vault on Morpho (Base). The vault's APY (`R`) determines the pool of yield available to distribute. Users can also deploy into two alternate vaults (Gauntlet USDC Prime on Base, Gauntlet USDC Frontier on Ethereum) — see `frontend/src/lib/morpho.ts`.

```
distributable  = R − 1 %                          (Oria spread = 1.00 %)
baseline       = 3.00 %                           (guaranteed for everyone)
pool           = max(0, distributable − 3 %)      (shared bonus reservoir)
your bonus     = pool × (score_i / mean_score), capped at 2 × pool
APY effective  = baseline + your bonus,            capped at 12 %
```

When `R − spread ≤ baseline`, the pool is empty and everyone falls back to whatever the market gives.

The **activity score** is a composite in `[0, 1]`:

| Component         | Weight | How to earn it                                              |
|-------------------|-------:|-------------------------------------------------------------|
| Streak            | 0.60   | Reach the 16-week max (linear ramp)                         |
| Regularity        | 0.15   | ≥ 3 sessions per week                                       |
| Long run          | 0.15   | One run ≥ your configured long-run distance                 |
| Pace progression  | 0.10   | This month's avg pace faster than last month                |

**Σ bonus_i = pool × N** by construction — the redistribution is conservative.

---

## Repository layout

```
backend/                          Fastify 4 API
  prisma/
    schema.prisma                 Postgres data model — 11 models
  scripts/                        One-shot migrations / seeds (tsx-runnable)
    backfill-pool-apy.ts          Migrate every streak to the pool APY model
    seed-challenge-activities.ts  Populate Activity rows for the demo
    backfill-feed-events.ts       Create goal_met events for past wins
  src/
    config/                       Env validation (zod), constants (APY weights, mocks)
    modules/
      auth/                       Privy JWT verification, agent dev token bypass
      users/                      Profile, settings, run schedule, run plan
      streaks/
        apy.utils.ts              Score + pool-distribution math
        morpho.service.ts         GraphQL fetcher for vault APY (24h cache)
        streaks.service.ts        logActivity + getMyStreak (live) + evaluateStreaks (weekly)
      challenges/                 CRUD + join + per-week consistency grid + milestones
                                  PATCH owner-only (banner, title, description, goal, max)
      strava/                     OAuth exchange, sync, last-run fetch
      social/                     Friendships, pokes, leaderboards, feed
      push/                       Web Push notifications (VAPID)
      cron/                       Daily reminders + weekly recap (shared-secret gated)
      wallet/                     Deposits, earnings (live APY via getMyStreak)

frontend/                         Next.js 14 (App Router) + Tailwind, mobile-first PWA
  public/avatars/                 SVG sport-themed avatar presets
  src/
    app/(app)/                    Authenticated routes
      dashboard/                  Balance + plan + weekly progress + Activity feed (moved from /social)
      apy/                        APY breakdown (vault rate, pool, your score)
      stats/                      Weekly (4 wk) / Monthly (4 mo) / All-time + Avg pace
      wallet/                     Receive, Invest, Withdraw, idle + invested per vault
      challenges/                 List
      challenges/[id]/            Detail: consistency grid, 5 milestones, weekly participation, leaderboard, owner edit modal
      social/                     Leaderboard + friend requests + discovery
      friend/[id]/                Friend profile
      activities/                 Full activity log
      streak/                     Streak detail + recovery flow
      profile/                    Avatar picker, goal, schedule, connected apps
      settings/                   Vacation, currency (USD/EUR), progression rate, notifs
    app/(onboarding)/             First-run flow (welcome → wallet → goal → fund)
    app/landing/                  Public marketing page
    app/strava/callback/          OAuth redirect
    components/
      InvestModal.tsx             On-chain approve + deposit (ERC-4626), vault picker
      WithdrawModal.tsx           On-chain redeem, vault picker
      ReceiveSheet.tsx            QR + tap-to-copy address
      PlanModal.tsx               Configurable weekly plan + auto-suggest
      EditChallengeModal.tsx      Owner-only banner + meta edit
      ReferFriendsModal.tsx       Web Share + WhatsApp/Telegram/Email
      Avatar / Card / Header / TabBar / ProgressChart / ActivityHeatmap / …
    lib/
      morpho.ts                   3 vaults config + GraphQL APY query
      useMorphoPositions.ts       Live cross-chain ERC-4626 balance reader (viem)
      useOnChainDeposit.ts        Embedded-wallet deposit flow
      hooks.ts                    Typed React Query wrappers (single client-side source of truth)
      utils.ts                    formatMoney, timeAgo, getInitials, lastNWeeks, lastNMonths

documentation/                    Project state docs
  PROJECT_STATE.md                Authoritative current-state map

docs/                             Original specs (frozen-in-time references)
mockups/                          Original React mockups
nginx/                            Reverse-proxy snippets
```

---

## Tech stack

| Layer      | What                                                                 |
|------------|----------------------------------------------------------------------|
| Frontend   | Next.js 14.2, Tailwind CSS, Privy 3.16 embedded wallets, Recharts    |
| Backend    | Fastify 4.28, TypeScript, Prisma 5.22, PostgreSQL (Supabase EU-West) |
| Auth       | Privy server-auth 1.14 JWT verification + dev-token bypass for agents |
| On-chain   | viem on Base (8453) + Ethereum mainnet (1), 3 Morpho ERC-4626 vaults  |
| Yield ref  | Morpho Steakhouse Prime USDC (Base) — drives the pool APY math       |
| Activity   | Strava OAuth (`activity:read_all`) **or** manual log via /api/activities |
| Deploy     | PM2 (oria-api, oria-frontend, oria-telegram), Nginx reverse proxy    |
| Push       | Web Push API + VAPID                                                 |

---

## Key features

- **Pool-based APY** with real-time vault rate from Morpho's Blue API (24h cached)
- **Multi-vault on-chain invest & withdraw** via the embedded Privy wallet — 3 Morpho vaults on Base + Ethereum
- **Strava sync or manual logging** — both paths bump `weekSessions`, emit feed events, and trigger pushes when the goal flips to met
- **Vacation mode**: 2-week streak freeze for travel or injury
- **Customizable run plan**: sessions/week + optional long run, with auto-suggest from goal
- **Currency toggle**: USD or EUR everywhere (`EUR_PER_USD = 0.92` static rate)
- **Monthly progression** rate: Maintain / +5% / +10% / +15% bumps your weekly target
- **Group challenges**: create, join, search, owner-only edit (banner + meta), delete
  - Detail page with **collective consistency %**, **5 team milestones**, **weekly participation chart**, and a **member × week heatmap**
- **Friend graph**: requests, accept/reject, removal, pokes, discovery
- **Activity feed on Home**: friends' goals, milestones, deposits, challenge completions — with reactions
- **Avatar presets + photo upload** (500 KB max), person-icon fallback when no name set
- **Notifications**: friend requests, pokes, run reminders, streak milestones (in-app + Web Push)
- **Stats**: last 4 consecutive weeks / months (0-km periods included), all-time, avg pace

---

## Setup (local dev)

### Prerequisites

- Node.js 20+
- pnpm
- A Postgres database (Supabase recommended)
- A Privy app (free): [dashboard.privy.io](https://dashboard.privy.io)
- A Strava API app: [strava.com/settings/api](https://strava.com/settings/api)

### Backend

```bash
cd backend
cp .env.example .env       # fill DATABASE_URL, DIRECT_URL, PRIVY_APP_ID/SECRET, etc.
pnpm install
pnpm prisma generate
pnpm prisma db push        # or `migrate deploy` if you keep formal migrations
pnpm dev                    # http://localhost:3001 (tsx watch)
```

Required env vars (`backend/.env`):

```
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
DATABASE_URL=postgresql://...   # pgbouncer URL
DIRECT_URL=postgresql://...     # direct URL for migrations
PRIVY_APP_ID=...
PRIVY_APP_SECRET=...
STRAVA_CLIENT_ID=...
STRAVA_CLIENT_SECRET=...
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:you@example.com
CRON_SECRET=any-random-string
DEV_AGENT_TOKEN=                # optional, for agent dev access
```

### Frontend

```bash
cd frontend
cp .env.local.example .env.local
pnpm install
pnpm dev                    # http://localhost:3000
```

`frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_USE_MOCK=false
NEXT_PUBLIC_PRIVY_APP_ID=...
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
```

---

## Tests

```bash
cd backend
pnpm vitest run             # APY math (computeApy, computePoolApy, computeMultipliers)
```

## One-shot scripts

```bash
cd backend
./node_modules/.bin/tsx scripts/backfill-pool-apy.ts            # migrate streaks off legacy tiered APY
./node_modules/.bin/tsx scripts/seed-challenge-activities.ts    # populate demo Activity rows per challenge
./node_modules/.bin/tsx scripts/backfill-feed-events.ts         # create goal_met events for past wins
```

---

## Production deployment

The live instance runs on a single Linux box via PM2:

- `oria-api` (PM2 id 13) — Fastify on `:3002`, behind Nginx at `api.oriamvp.cloud`
- `oria-frontend` (PM2 id 12) — Next.js prod build on `:3000`, behind Nginx at `oriamvp.cloud`
- `oria-telegram` (PM2 id 18) — owner-chat relay bot

Cron jobs hit `GET /api/cron/run-reminders` and `GET /api/cron/weekly-recap` (gated by `CRON_SECRET`).

Schema migrations are applied with `prisma db push --skip-generate`. Avatars and challenge banners are stored as base64 data URLs directly in Postgres text columns (700K-char backend cap, 500 KB raw client cap).

---

## Roadmap

- [ ] Daily cron to refresh Morpho vault rate (currently lazy 24h cache)
- [ ] Per-session activity model (currently weekly-aggregated) for proper pace tracking
- [ ] Apple Health integration (currently stubbed)
- [ ] Move avatars & challenge banners from base64 in Postgres → Vercel Blob / Supabase Storage
- [ ] Daily FX rate fetch (replace static `EUR_PER_USD = 0.92`)
- [ ] Emit `challenge_joined` / `challenge_completed` feed events (schema documented, not yet emitted)
- [ ] Encrypt `users.stravaToken` at rest
- [ ] Replace mocked `/api/wallet/balance` (`MOCK_BALANCES`) with server-side on-chain reads — currently the frontend computes idle + invested via `useMorphoPositions`
- [ ] Mobile native wrapper (iOS/Android via Capacitor or Expo)
- [ ] Slippage controls and EIP-7702 batch tx when Privy supports it

---

## License

MIT
