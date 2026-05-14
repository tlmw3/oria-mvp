# Oria

**Gamified crypto savings — your running streak boosts your APY.**

Oria ties yield-bearing crypto deposits to personal fitness goals. Users deposit USDC into a Morpho vault, connect Strava, and earn a variable APY: a 3% baseline guaranteed for everyone, plus a redistribution bonus that grows with their weekly activity score. The most active users take a bigger slice of the pool.

🔗 Live: [oriamvp.cloud](https://oriamvp.cloud) · API: [api.oriamvp.cloud](https://api.oriamvp.cloud)

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

Oria sources its yield from the **Sentora rlUSD Main** vault on Morpho (Ethereum). The vault's APY (`R`) determines the pool of yield available to distribute.

```
distributable  = R                            (no Oria spread for now)
baseline       = 3.00 %                       (guaranteed for everyone)
pool           = max(0, distributable − 3 %)  (shared bonus reservoir)
your bonus     = pool × (score_i / mean_score), capped at 2 × pool
APY effective  = baseline + your bonus,        capped at 12 %
```

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
backend/                          Fastify 5 API
  prisma/
    schema.prisma                 Postgres data model
  src/
    config/                       Env validation (zod), constants (APY tiers, etc.)
    modules/
      auth/                       Privy JWT verification, agent dev token bypass
      users/                      Profile, settings, run schedule, run plan
      streaks/
        apy.utils.ts              Score + pool-distribution math
        morpho.service.ts         GraphQL fetcher for vault APY (24h cache)
        streaks.service.ts        Weekly evaluation cron (3-phase: scores → mean → distribute)
      challenges/                 Create / join / delete with creator-only check
      strava/                     OAuth exchange, sync, last-run fetch
      social/                     Friendships, pokes, leaderboards, feed
      push/                       Web Push notifications

frontend/                         Next.js 14 (App Router) + Tailwind, mobile-first PWA
  public/avatars/                 8 SVG sport-themed avatar presets
  src/
    app/(app)/                    Authenticated routes
      dashboard/                  Streak + balance + plan + projection + last activity
      apy/                        APY breakdown (vault rate, pool, your score)
      stats/                      Weekly/Monthly/All-time charts
      wallet/                     Receive, Invest, Withdraw, balance, deposits list
      challenges/                 Browse / create / search / delete
      profile/                    Avatar picker, goal, schedule, connected apps
      settings/                   Vacation, currency (USD/EUR), progression rate, notifs
      streak/                     Streak detail + recovery flow
    app/(onboarding)/             First-run flow (welcome → wallet → goal → fund)
    app/landing/                  Public marketing page
    components/
      InvestModal.tsx             On-chain approve + deposit (ERC-4626) on Base
      WithdrawModal.tsx           On-chain redeem
      ReceiveSheet.tsx            QR + tap-to-copy address
      PlanModal.tsx               Configurable weekly plan + auto-suggest
    lib/
      morpho.ts                   ABI selectors + RPC calls (no viem dependency)
      hooks.ts                    React Query wrappers
      utils.ts                    formatMoney(currency), timeAgo, getInitials
```

---

## Tech stack

| Layer      | What                                                                |
|------------|---------------------------------------------------------------------|
| Frontend   | Next.js 14, Tailwind CSS, Privy embedded wallets, qrcode.react      |
| Backend    | Fastify 5, TypeScript, Prisma 5, PostgreSQL (Supabase)              |
| Auth       | Privy JWT verification + dev-token bypass for agents                |
| On-chain   | Base (chainId 8453), raw EIP-1193 calls, Morpho ERC-4626 vault      |
| Yield      | Morpho — Steakhouse Prime USDC and Sentora rlUSD (rate reference)   |
| Activity   | Strava OAuth (`activity:read_all`), weekly aggregated activities    |
| Deploy     | PM2 self-hosted (api.oriamvp.cloud, oriamvp.cloud), Nginx reverse proxy |
| Push       | Web Push API + VAPID                                                |

---

## Key features

- **Pool-based APY** with real-time vault rate from Morpho's Blue API
- **On-chain invest & withdraw** to/from Morpho directly via the embedded Privy wallet (Base)
- **Strava-only activity source** (manual entries removed for data integrity)
- **Vacation mode**: 2-week streak freeze for travel or injury
- **Customizable run plan**: sessions/week + optional long run, with auto-suggest from goal
- **Currency toggle**: USD or EUR everywhere
- **Monthly progression** rate: Maintain / +5% / +10% / +15% bumps your weekly target
- **Group challenges**: create, join, search, delete (creator-only)
- **8 sport-themed avatars** + photo upload, person-icon fallback when no name set
- **Notifications**: friend requests, pokes, run reminders, streak milestones (in-app + Web Push)
- **Stats**: weekly/monthly/all-time distance and active-period charts

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
pnpm prisma migrate deploy
pnpm dev                    # http://localhost:3001
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

---

## Production deployment

The live instance runs on a single Linux box via PM2:

- `oria-api` — Fastify on `:3002`, behind Nginx at `api.oriamvp.cloud`
- `oria-frontend` — Next.js prod build on `:3000`, behind Nginx at `oriamvp.cloud`

Cron jobs hit `POST /api/cron/...` endpoints daily (gated by `CRON_SECRET`).

---

## Roadmap

- [ ] Daily cron to refresh Morpho vault rate (currently lazy 24h cache)
- [ ] Per-session activity model (currently weekly-aggregated) for proper pace tracking
- [ ] Apple Health integration (currently stubbed)
- [ ] Sentora rlUSD vault used as APY reference — switch yield deposits to it
- [ ] Mobile native wrapper (iOS/Android via Capacitor or expo)
- [ ] Slippage controls and EIP-7702 batch tx when Privy supports it

---

## License

MIT
