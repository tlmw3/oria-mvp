# Activity feed

The activity feed lives on the **Home** page (it used to be on /social — moved to make Home the central hub). It surfaces what your friends just did and lets you react with a single tap.

## What shows up

The feed mixes event types from your friend graph (you + accepted friends):

| Event type | When it fires | Payload |
| --- | --- | --- |
| `goal_met` | Real-time when a manual log or Strava sync flips the week to "goal met", and again at the weekly cron | `weekStart`, `distanceKm` |
| `streak_milestone` | When the streak count hits a milestone (3, 5, 10, 25, 50) | `streakCount` |
| `streak_lost` | Weekly cron, when a user fails to hit their goal | `previousCount` |
| `streak_recovered` | When a user pays the 5 USDC recovery fee to restore a lost streak | `streakCount`, `cost` |
| `deposit` | When a deposit is recorded server-side | `amount`, `token` |

`challenge_joined` and `challenge_completed` are reserved in the schema but not yet emitted.

## Anatomy of a feed item

* **Avatar** with a flame badge in the bottom-right corner: orange + 🔥 + streak count for streaks ≥ 5 weeks, purple + ✦ + count for shorter ones. Streak 0 = no badge.
* **Text** — "Eva M. completed 15.5 km this week 🏃". The emoji and verb come from the event type.
* **Meta line** — "2d ago · 10w streak" (the streak chip on the right is colored the same as the badge).
* **Cheer button** — a heart icon. Tap to like; the count appears next to the icon. Liking your own event is disabled.

## Why the streak badge

Without it, two `goal_met` events looked identical — same icon, same text pattern. The badge makes it instantly visible **who** is on a tear when their achievement scrolls by. It also serves as a subtle hierarchy cue: high-streak friends draw the eye more, which mirrors how the redistribution model actually rewards them.

## Endpoints

* `GET /api/feed?limit=N&cursor=...` — paginated, newest first, includes the author's current streak count in `user.streakCount`.
* `POST /api/feed/:id/like` — toggle a like on the current user.

## A note on demo / backfill

`scripts/backfill-feed-events.ts` walks past `Activity` rows with `goalMet=true` and creates the matching `goal_met` `FeedEvent` records if they don't exist. Idempotent. Used to make the feed look populated when seeding a fresh environment.
