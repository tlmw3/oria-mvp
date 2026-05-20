# Activity score

The activity score sits in `[0, 1]` and drives your slice of the bonus pool. It's a weighted sum of four components, each tied to a behavior we want to reward.

| Component | Weight | How you unlock it |
| --- | ---: | --- |
| Streak | 0.60 | Linear ramp from 0 to 16 consecutive weeks of hitting your goal |
| Regularity | 0.15 | At least 3 sessions in the current week |
| Long run | 0.15 | One session ≥ your configured long-run target |
| Pace progression | 0.10 | This month's average pace strictly faster than last month |

The weights are configured in `backend/src/config/constants.ts` and sum to 1.

## Why these four

* **Streak** captures the long-term commitment. It's the dominant factor on purpose: showing up week after week is the hardest thing to fake.
* **Regularity** rewards within-week consistency, not just one heroic Sunday run.
* **Long run** rewards stretching yourself — at least once a week you went past your usual range.
* **Pace progression** rewards getting better, not just maintaining. Computed from Strava session times, so it only contributes if you've connected the integration.

## Recomputation cadence

* **Live** — the dashboard, the APY details page, your wallet earnings, and your row on the friends leaderboard all call `getMyStreak`, which recomputes your score on every request. Your APY reflects this week's behavior immediately.
* **Weekly cron** — once a week, the evaluator persists the new score to the database, advances the streak count if the goal was met, and emits feed events.
* **Friends' rows on your leaderboard** read the persisted score (cheaper, refreshed weekly). Your own row is always live.

## A common question

> "Why does Talam (3 weeks) have an APY of 4.44 % but Eva (1 week) only 3.21 %?"

The streak component scales with `min(1, streak / 16)`:

* Talam: `0.60 × 3/16 = 0.1125` from streak alone, plus regularity / long run / progression if those hit.
* Eva: `0.60 × 1/16 = 0.0375` — much smaller contribution before any of the other components.

Multiplied by `pool / meanScore`, that becomes the bonus on top of the 3 % baseline.

## Pace and discipline-mixing

Pace is averaged only within your **dominant Strava discipline** — running or cycling. Mixing a 5 min/km run with a 2 min/km ride gives a meaningless number, so the sync classifies each activity, picks whichever has more sessions, and only averages within that bucket. The chosen category is shown on the Stats page next to your average pace ("running this month", "cycling this month").
