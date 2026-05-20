# Data model

Eleven Prisma models, all snake_cased at the database layer (`@@map` and `@map`), UUID primary keys, cascading deletes on every foreign key.

## Tables

| Model | Purpose | Notable fields |
| --- | --- | --- |
| `User` | Privy-anchored profile | `privyId`, `walletAddr`, `displayName`, `avatarUrl`, `goalType`, `targetKm`, `dataSource`, `stravaToken`, `runSchedule` (JSON), `settings` (JSON) |
| `Streak` | One-to-one with User; gamification + APY state | `currentCount`, `longestCount`, `lastWeekMet`, `currentApy` (default 3 %), `effectiveApy` (default 3 %), `activityScore`, `poolBonus`, `weekSessions`, `weekLongestRun`, `monthAvgPace`, `prevMonthAvgPace`, `paceCategory`, `vacationUntil` |
| `Activity` | Weekly aggregate per user | `weekStart` (Monday), `distanceKm`, `source` (`manual` / `strava`), `goalMet`. Unique on `(userId, weekStart)`. |
| `Deposit` | USDC deposit lifecycle | `amount`, `token`, `txHash`, `status` (`pending` / `confirmed` / `earning` / `withdrawn` / `failed`), `earningAt` |
| `Friendship` | Bidirectional with request/accept flow | `requesterId`, `addresseeId`, `status` (`pending` / `accepted` / `rejected`). Unique on the requester/addressee pair. |
| `FeedEvent` | Social feed | `eventType`, `payload` (JSON), `likes`, `likedBy` (JSON array of user ids) |
| `Notification` | In-app inbox | `type`, `payload`, `read` |
| `PushSubscription` | Web Push endpoint registry | `endpoint`, `keys` (JSON) |
| `Challenge` | Group goals | `creatorId` (owner), `title`, `description`, `bannerUrl`, `goalKmWeek`, `startDate`, `endDate`, `maxMembers`, `status` |
| `ChallengeMember` | Join table | `weeksMet`, `weeksTotal`, `joinedAt`. Unique on `(challengeId, userId)`. |
| `SystemConfig` | KV store | Used for the cached Morpho vault APY and the global `mean_activity_score`. |

## Things to know

* **Avatars and challenge banners** are base64 data URLs stored directly in text columns. 700 K char backend cap, 500 KB raw client cap. Acceptable for an MVP; should move to Vercel Blob / Supabase Storage as usage grows.
* **`Streak.currentApy` and `Streak.effectiveApy`** are persisted but always live-recomputed by `getMyStreak`. The persisted columns matter mainly for friends-of-friends scenarios where the cheaper read path is preferred. The weekly cron writes them back too.
* **`Activity` is week-aggregated**. Per-session detail isn't stored; pace numbers come straight from Strava's API at sync time and live on the `Streak` row (monthly averages, not per-session).
* **`SystemConfig.mean_activity_score`** is the global mean recomputed by the weekly evaluator and used to scale individual bonuses. If it's 0, everyone falls back to the baseline.

## Migrations

There's no `prisma/migrations` directory — schema changes are applied with `prisma db push --skip-generate` against the Supabase instance. This is fine for the iteration speed of the MVP but should be tightened (formal migrations) once schemas stabilize.
