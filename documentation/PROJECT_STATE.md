# Oria — Project State

_Snapshot of the codebase as of 2026-05-19. Authoritative facts (file paths, routes, schema, hardcoded values) gathered directly from the repository._

---

## 1. What Oria is today

A gamified crypto savings PWA on the EVM side (Base + Ethereum mainnet vaults, originally framed around Avalanche Fuji but the on-chain reads now go through Morpho). Users deposit USDC, the yield they earn is modulated by their weekly running consistency (Strava or manual logs), and a redistribution-pool model rewards more active users with a larger share of the bonus over a flat baseline.

The codebase covers an MVP that is **deployed and live** behind `oriamvp.cloud` (frontend) and `api.oriamvp.cloud` (backend), with seeded demo data for a small community (Talam, Eva M., Marco P., Louis D., etc.) and a dev agent account for automated testing.

---

## 2. Top-level layout

```
oria-mvp/
├── backend/                Fastify + Prisma + Postgres (Supabase)
├── frontend/               Next.js 14 App Router (PWA)
├── mockups/                Original React mockups (OriaAppMock.jsx, OriaLanding.jsx)
├── docs/                   Original spec docs (Backend Arch, Design System, Frame, Frontend Gaps)
├── documentation/          Project state docs (this file)
├── nginx/                  Reverse-proxy config snippets
├── tasks/                  todo.md / lessons.md from earlier iterations
├── AGENTS.md               Workflow rules (plan-first, subagent strategy)
├── CLAUDE.md               Codebase context for Claude
└── README.md
```

---

## 3. Tech stack

| Layer | Choice | Version | Notes |
|---|---|---|---|
| Backend runtime | Node.js + TypeScript | — | `tsx` in dev, compiled to `dist/` in prod |
| Backend framework | Fastify | 4.28 | with `@fastify/cors`, `@fastify/rate-limit` |
| ORM | Prisma | 5.22 | `prisma db push` used for schema migrations |
| Database | PostgreSQL (Supabase) | — | `aws-1-eu-west-1.pooler.supabase.com` |
| Auth | Privy | server-auth 1.14 / react-auth 3.16 | JWT verification + embedded wallets |
| Frontend framework | Next.js | 14.2.35 | App Router, `(app)` and `(onboarding)` route groups |
| Data fetching | TanStack Query | 5.90 | hooks in `frontend/src/lib/hooks.ts` |
| Charts | Recharts | 3.8 | `ProgressChart.tsx`, `PaceChart.tsx` |
| On-chain reads | viem | — | Morpho ERC-4626 vaults, multi-chain |
| Push | web-push (VAPID) | — | server in `backend/src/modules/push` |
| Process manager | PM2 | — | `oria-api` (13), `oria-frontend` (12), `oria-research` (15), `oria-telegram` (18) |
| Reverse proxy | Nginx | — | terminates TLS, proxies to PM2 |
| Telegram bot | custom Node bot | — | chat_id `886484076` (owner only) |

---

## 4. Backend (`backend/src/`)

### 4.1 Module breakdown

| Module | Responsibilities |
|---|---|
| `auth/` | `POST /api/auth/verify` — Privy JWT verification, user upsert, walletAddr + avatarUrl backfill on returning users |
| `users/` | `GET /api/users/me`, `PATCH /api/users/me`, `/discover`, `/search`, `/:id/profile`, `/:id` |
| `streaks/` | Activity log (`/api/activities`), `/api/streaks/me` (live recompute), `/streaks/recover`, `/streaks/evaluate` (weekly cron entrypoint), `/streaks/vacation`. Pool-APY math lives in `apy.utils.ts`. |
| `social/` | Friend graph (`/friends/*`), notifications (`/notifications/*`), feed (`/feed`, `/feed/:id/like`), leaderboards (`/leaderboard`, `/leaderboard/weekly`), poke. |
| `challenges/` | CRUD + join + per-week consistency grid + collective milestones. `PATCH /api/challenges/:id` is owner-only (creatorId). |
| `wallet/` | `/balance` (mock), `/deposits`, `/deposit`, `/start-earning`, `/earnings` (live APY recompute via `getMyStreak`). |
| `strava/` | OAuth exchange, manual sync, status, `last-run`. Strava data persists `weekSessions`, `weekLongestRun`, `monthAvgPace`, `prevMonthAvgPace`. |
| `cron/` | `GET /api/cron/run-reminders`, `GET /api/cron/weekly-recap` — invoked by external cron via shared secret. |
| `push/` | VAPID key endpoint, subscribe/unsubscribe. |

### 4.2 Wiring (`backend/src/app.ts`)

Prefixes:
```ts
authRoutes        → /api/auth
usersRoutes       → /api/users
streaksRoutes     → /api
socialRoutes      → /api
challengesRoutes  → /api
walletRoutes      → /api/wallet
stravaRoutes     → /api/strava
cronRoutes       → /api/cron
pushRoutes       → /api/push   (declared inline)
```

Plugins: CORS, Prisma client, custom `authPlugin` (Bearer Privy JWT, dev agent token, optional `MOCK_AUTH` shortcut).

### 4.3 Data model (`backend/prisma/schema.prisma`)

11 models — all snake_cased at the DB layer via `@@map` / `@map`:

| Model | Purpose | Notable fields |
|---|---|---|
| `User` | Privy-anchored profile | `privyId`, `walletAddr`, `displayName`, `avatarUrl`, `goalType`, `targetKm`, `dataSource`, `stravaToken`, `settings` (JSON), `runSchedule` (JSON) |
| `Streak` | 1-1 with User; gamification state | `currentCount`, `longestCount`, `lastWeekMet`, `currentApy`/`effectiveApy` (legacy + new), `activityScore`, `poolBonus`, `weekSessions`, `weekLongestRun`, `monthAvgPace`, `prevMonthAvgPace`, `vacationUntil` |
| `Activity` | Weekly aggregate per user | `weekStart`, `distanceKm`, `source`, `goalMet`, unique on `(userId, weekStart)` |
| `Deposit` | USDC deposit lifecycle | `amount`, `token`, `txHash`, `status`, `earningAt` |
| `Friendship` | Bidirectional with request flow | `requesterId`, `addresseeId`, `status` |
| `FeedEvent` | Social feed | `eventType`, `payload` (JSON), `likes`, `likedBy` (JSON array) |
| `Notification` | In-app inbox | `type`, `payload`, `read` |
| `PushSubscription` | Web Push endpoints | `endpoint`, `keys` (JSON) |
| `Challenge` | Group goals | `creatorId` (owner), `title`, `description`, `bannerUrl`, `goalKmWeek`, `startDate`, `endDate`, `maxMembers`, `status` |
| `ChallengeMember` | Join table | `weeksMet`, `weeksTotal`, `joinedAt`, unique on `(challengeId, userId)` |
| `SystemConfig` | KV store | Used for cached Morpho APY + global `mean_activity_score` |

UUID primary keys, cascading deletes, composite uniques enforce business rules (one activity per week, one friendship per pair, one membership per user per challenge).

### 4.4 Pool-based APY model (`backend/src/modules/streaks/apy.utils.ts`)

- `APY.BASELINE = 3.0%` guaranteed.
- `APY.SPREAD = 1.0%` taken by Oria off the vault rate.
- Pool = `max(0, vaultRate - SPREAD - BASELINE)` — distributed by `activityScore`.
- `activityScore ∈ [0,1]` composed of:
  - Streak weight `0.6`, linear to `MAX_STREAK = 16`.
  - Regularity `0.15` (≥ 3 sessions/week).
  - Long run `0.15` (≥ threshold km this week).
  - Pace progression `0.10` (month avg pace strictly faster than previous month).
- Individual bonus = `pool × (myScore / meanScore)`, capped at `pool × POOL_CAP_MULTIPLIER (2.0)`.
- Effective APY rounded, capped at `EFFECTIVE_CAP = 12.0%`.

The DB `currentApy` / `effectiveApy` columns are **persisted by the weekly cron** but **recomputed live** by `getMyStreak`. Wallet earnings, dashboard hero, APY-details page, and the user's own leaderboard row all go through `getMyStreak` for coherence. Friends viewed on someone else's leaderboard fall back to the persisted columns.

### 4.5 Feed events emitted

| Event | Emitter |
|---|---|
| `goal_met` | `logActivity` (real-time, when week first hits the goal) + `evaluateStreaks` (weekly) |
| `streak_milestone` | `logActivity` + `evaluateStreaks`, if `newCount ∈ STREAK_MILESTONES = [3, 5, 10, 25, 50]` |
| `streak_lost` | `evaluateStreaks` only |
| `streak_recovered` | `recoverStreak` |
| `deposit` | `recordDeposit` |
| `challenge_joined` / `challenge_completed` | _Not currently emitted in code — payload shape only documented in schema_ |

Push notifications are sent for `goal_met`; the cron also pushes for `goal_met` and `streak_milestone`. VAPID keys live in env vars.

---

## 5. Frontend (`frontend/src/`)

### 5.1 Route tree

```
(app)/
  dashboard/                Home — balance, weekly progress, plan, Activity feed (moved from /social)
  wallet/                   Idle + invested across vaults, deposits log, Avg APY (effectiveApy)
  social/                   Leaderboard, friend requests, discovery
  friend/[id]/              Friend profile
  challenges/               List
  challenges/[id]/          Detail (consistency grid, milestones, weekly participation, leaderboard, edit modal)
  activities/               Full activity log
  apy/                      APY breakdown page
  stats/                    Weekly / Monthly / All-time stats, Avg pace card
  streak/                   Streak deep-dive
  profile/                  Edit name + avatar, Strava connect
  settings/                 Notifications, currency, plan config
(onboarding)/
  onboarding/               First-run flow
landing/                    Marketing landing page (signed-out)
strava/callback/            OAuth redirect
api/...                     Next route handlers that proxy to the Fastify API (used so the frontend can hit relative URLs)
```

### 5.2 Key components (`frontend/src/components/`)

- `Avatar`, `Card`, `Header`, `TabBar` — design-system primitives.
- `ProgressChart` (Recharts area), `ActivityHeatmap`, `PaceChart`, `WeekDots`, `ProgressRing`, `SavingsJar`, `MiniJar`, `Celebration`.
- Modals: `InvestModal`, `WithdrawModal`, `ReceiveSheet`, `PlanModal`, `LogActivityModal`, `EditChallengeModal`, `ReferFriendsModal`, `RunWelcome`.
- `Toast`, `Skeleton`, `InstallPrompt`, `QuickAction`.

### 5.3 Data layer

- `lib/api.ts` — `apiFetch` wrapper; injects Privy bearer token, handles 401 + auto-logout.
- `lib/hooks.ts` — every backend endpoint wrapped in a typed TanStack Query / mutation. Single source of truth for client-side types.
- `lib/morpho.ts` — VAULTS array, GraphQL query for net APYs, `useMorphoPositions` for live cross-chain balances.
- `lib/useOnChainDeposit.ts` / `lib/deposit.ts` — viem-driven deposits.
- `lib/push.ts` — Web Push subscription.
- `lib/providers.tsx` — Privy + React Query providers + auth bridge.
- `lib/utils.ts` — formatters, `lastNWeeks`, `lastNMonths` (pad consecutive periods so 0-km weeks are visible), feed event templating.

---

## 6. Integrations

### 6.1 Privy
- Embedded wallets, social login.
- Server-side JWT verification via `@privy-io/server-auth` in `authPlugin`.
- On returning-user verify, the backend backfills `walletAddr` + `avatarUrl` from Privy if they were missing.

### 6.2 Strava
- OAuth: `/api/strava/exchange` (called from `frontend/src/app/strava/callback`).
- Sync: `/api/strava/sync` (manually triggered + auto-synced on dashboard mount).
- `last-run`: hits Strava API directly for the most recent activity card.
- Aggregates per-week distance + computes `weekSessions`, `weekLongestRun`, current + previous month avg pace.
- For users on `dataSource = "manual"`, all pace-derived UI shows placeholders (no per-session time available).

### 6.3 Morpho vaults

Frontend `lib/morpho.ts` (the source of truth for the wallet page):

| Name | Address | Chain |
|---|---|---|
| Steakhouse Prime USDC | `0xBEEFE94c8aD530842bfE7d8B397938fFc1cb83b2` | Base (8453) |
| Gauntlet USDC Prime | `0xeE8F4eC5672F09119b96Ab6fB59C27E1b7e44b61` | Base (8453) |
| Gauntlet USDC Frontier | `0xc582F04d8a82795aa2Ff9c8bb4c1c889fe7b754e` | Ethereum (1) |

Backend `MORPHO_VAULT` constant still points at the Steakhouse Prime address — it's the **reference vault** whose rate seeds the pool model.

### 6.4 Web Push
- VAPID keys in env vars.
- Subscription stored in `push_subscriptions`.
- Per-user `sendPushToUser` helper sends to all the user's endpoints concurrently.

---

## 7. Hardcoded values & mocks

### 7.1 Constants (`backend/src/config/constants.ts`)

```
APY.BASELINE = 3.0           guaranteed floor
APY.SPREAD = 1.0             Oria's cut off the vault rate
APY.MAX_STREAK = 16
APY.EFFECTIVE_CAP = 12.0
APY.POOL_CAP_MULTIPLIER = 2.0
APY.FALLBACK_VAULT_APY = 5.5   used if the Morpho GraphQL query fails
APY.SCORE_STREAK_WEIGHT = 0.6
APY.SCORE_REGULARITY_WEIGHT = 0.15
APY.SCORE_LONGRUN_WEIGHT = 0.15
APY.SCORE_PROGRESSION_WEIGHT = 0.10
APY.REGULARITY_MIN_SESSIONS = 3
APY.LONG_RUN_MULTIPLIER = 1.5

MORPHO_VAULT.ADDRESS = "0xBEEFE94c8aD530842bfE7d8B397938fFc1cb83b2"
MORPHO_VAULT.CHAIN_ID = 8453
MORPHO_VAULT.NAME = "Steakhouse Prime USDC"

APY_TIERS = [16:8.0, 12:7.5, 8:7.0, 6:6.5, 4:6.0, 2:5.5, 1:5.0, 0:4.0]   legacy tiered model, kept for compat
STREAK_MILESTONES = [3, 5, 10, 25, 50]

MOCK_USER_ID = "00000000-0000-0000-0000-000000000001"   Talam
MOCK_PRIVY_ID = "did:privy:mock-user-001"
AGENT_USER_ID = "00000000-0000-0000-0000-0000000000a9"   Claude Agent (dev token)
AGENT_PRIVY_ID = "did:privy:agent-claude"
```

### 7.2 Service-level mocks

- `wallet.service.ts`: `MOCK_BALANCES = { USDC: 2450.0, AVAX: 1.25 }` returned by `/api/wallet/balance` — the real per-chain balances come from `useMorphoPositions` on the client.
- `streaks.service.ts`: `VACATION_DURATION_WEEKS = 2`, `RECOVERY_COST = 5` (USDC).
- `morpho.service.ts`: 24-hour cache TTL on the vault rate (`CACHE_TTL_MS`).

### 7.3 Frontend constants

- `lib/utils.ts`: `EUR_PER_USD = 0.92` (static fx rate).
- `lib/morpho.ts`: VAULTS array (3 vaults above).
- `lib/defaultAvatars.ts`: preset avatar URLs.

### 7.4 Env / runtime switches (`backend/src/config/env.ts`)

| Var | Default | What it does |
|---|---|---|
| `PORT` | 3001 | Fastify listen (prod uses 3002 via env) |
| `MOCK_AUTH` | `false` | Bypass Privy in dev; all requests authenticated as `MOCK_USER_ID` |
| `MOCK_STRAVA` | `true` | Stub Strava OAuth/sync — required because real tokens aren't configured for all users |
| `MOCK_YIELD` | `true` | Yield numbers come from the APY model, not on-chain yield streams |
| `CRON_SECRET` | `"oria-cron-secret-2026"` | Shared secret for `/api/cron/*` — **override in prod** |
| `DEV_AGENT_TOKEN` | optional | Static bearer that the auth plugin maps to `AGENT_USER_ID` |
| `VAPID_*` | optional | Web Push keys |
| `STRAVA_CLIENT_ID/SECRET/REDIRECT_URI` | optional | OAuth credentials |

---

## 8. Deployment

- **Frontend** `oriamvp.cloud` → PM2 `oria-frontend` (id 12) running `next start`.
- **Backend** `api.oriamvp.cloud` → PM2 `oria-api` (id 13) running compiled `dist/server.js` on port 3002.
- **Telegram bot** PM2 `oria-telegram` (id 18) — owner-chat relay.
- **Research worker** PM2 `oria-research` (id 15) — currently stopped.
- **Nginx** terminates TLS, proxies to PM2 ports.
- **Cron** an external scheduler hits `/api/cron/run-reminders` and `/api/cron/weekly-recap` with the shared secret.
- **Database** Supabase Postgres EU-West, pooler connection from the app.
- **Image storage** None — avatars and challenge banners are base64 data URLs stored directly in the `users.avatarUrl` / `challenges.banner_url` text columns. Backend caps: avatar 700 KB chars, banner 700 KB chars. Client caps: avatar 500 KB raw, banner 500 KB raw.

---

## 9. Scripts (`backend/scripts/`)

| Script | Purpose |
|---|---|
| `backfill-pool-apy.ts` | Recompute every streak row's APY columns under the current pool model. One-shot migration off the legacy tiered values (4 / 5 / 5.5 / 6 / 6.5 / 7 %). Vacation users included (only their APY math is migrated, the streak count stays frozen). |
| `seed-challenge-activities.ts` | For each ChallengeMember, upsert one Activity per past week of the challenge with a per-user consistency rate so the challenge consistency grid + weekly participation chart look populated in the demo. |
| `backfill-feed-events.ts` | Scan past `Activity` rows with `goalMet=true` and create matching `goal_met` `FeedEvent`s if missing. Idempotent. |

All three are tsx-runnable: `./node_modules/.bin/tsx scripts/<name>.ts`.

---

## 10. Key flows

### 10.1 First-time login (Privy → onboarding)

1. Privy embedded wallet created; SDK calls `/api/auth/verify` with the JWT.
2. Backend upserts the User, sets `privyId`. If `walletAddr`/`avatarUrl` are missing on a returning user, they're backfilled from the Privy token claims.
3. Onboarding flow (`(onboarding)/onboarding`) collects display name, goal type, target km, run schedule.
4. PATCH `/api/users/me` persists; redirects to dashboard.

### 10.2 Logging a run (manual or Strava)

- **Manual** — `LogActivityModal` POSTs `/api/activities` with `{ distanceKm, weekStart? }`.
- **Strava** — `useStravaSync` auto-fires on dashboard mount; the backend aggregates Strava sessions into the per-week Activity row.

Either path:
- Upserts the week's `Activity` row, accumulating distance.
- Increments `weekSessions` on the current ISO week (manual = +1 per log, Strava = the count computed from sessions).
- If the weekly goal flips to met for the first time: bumps `currentCount` + `lastWeekMet`, emits `goal_met` FeedEvent (and `streak_milestone` if applicable), fires Web Push.

### 10.3 Weekly evaluation (`POST /api/cron/...` or `POST /api/streaks/evaluate`)

Three-pass algorithm in `evaluateStreaks`:
1. Compute every active user's `activityScore` (skipping vacation).
2. Compute global `meanScore`, persist to `SystemConfig`.
3. For each user: `computePoolApy` → write `currentApy`, `effectiveApy`, `activityScore`, `poolBonus`, multiplier bonuses; reset `weekSessions` + `weekLongestRun`; emit milestone / `streak_lost` events.

### 10.4 Challenge detail

`GET /api/challenges/:id`:
- Builds the list of ISO weeks between `startDate` and `endDate`.
- Joins each member with their `Activity` rows in that window.
- Computes per-week `goalMet` against `challenge.goalKmWeek` (not the user's personal `targetKm`).
- Aggregates: total weeks met, weekly participation %, 5 collective milestones (Kickoff, First wave at ≥50%, Halfway, All-in week, Finish line).

`PATCH /api/challenges/:id` — owner (creatorId) only; allows updating title, description, bannerUrl, goalKmWeek, maxMembers.

---

## 11. Known limitations & open items

- **Currency conversion** is a static `EUR_PER_USD = 0.92` — needs a daily-cached fetch.
- **Wallet `MOCK_BALANCES`** is still returned by `/api/wallet/balance`; the real on-chain idle balances come from the client via `useMorphoPositions`. The backend balance endpoint is effectively unused but still wired.
- **Apple Health** is mocked in the frontend only; no backend integration.
- **MOCK_YIELD** is true by default — earnings are projected by the APY model, not by reading yield from the vaults.
- **CRON_SECRET** default value lives in code — must be overridden in prod env.
- **Friend-list APYs on someone else's leaderboard** read the persisted `effectiveApy` column, which only refreshes during the weekly cron. The viewing user's own row is live-recomputed.
- **Image storage** as base64 in Postgres is fine for an MVP but should be moved to Vercel Blob / Supabase Storage when usage grows.
- **`challenge_joined` / `challenge_completed`** feed events are documented in the schema but never emitted in code.
- **Default ProgressChart on Home** is hidden when all of the last 8 weeks are 0 km — intentional, may want to revisit for brand-new users.
- **Strava token storage** is plain text in `users.strava_token` — should be encrypted at rest in production.

---

## 12. Useful commands

```bash
# Backend dev
cd backend && pnpm dev                       # tsx watch
cd backend && pnpm build && pm2 restart oria-api

# Frontend dev
cd frontend && pnpm dev
cd frontend && pnpm build && pm2 restart oria-frontend

# DB
cd backend && ./node_modules/.bin/prisma db push --skip-generate
cd backend && ./node_modules/.bin/prisma generate

# One-shot migrations / seeds
cd backend && ./node_modules/.bin/tsx scripts/backfill-pool-apy.ts
cd backend && ./node_modules/.bin/tsx scripts/seed-challenge-activities.ts
cd backend && ./node_modules/.bin/tsx scripts/backfill-feed-events.ts

# Logs
pm2 logs oria-api --lines 100
pm2 logs oria-frontend --lines 100
```

---

_Maintained alongside the code. When schemas, route prefixes, or core constants change, update sections 4.3, 4.2, and 7 respectively._
