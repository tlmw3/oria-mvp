# Challenges

A challenge is a shared weekly goal with a fixed start and end date. Members commit to hitting the same km/week target across the challenge window. Challenges are the most communal surface of the app: a real-time team consistency grid plus five collective milestones that the whole group can chase together.

Challenges don't grant an APY multiplier — they're purely a social and motivational construct. The thinking: real emulation comes from watching a teammate hit their goal, not from a marginal yield bonus.

## Creating a challenge

* **Title** (e.g. "Summer 10K").
* **Weekly goal** in km (used to compute "goal met" for each member each week).
* **Duration** in weeks.
* **Max members** (optional, defaults to unlimited).
* **Description** (optional).

The creator becomes the **owner**. They're the only one who can edit the challenge or delete it.

## Joining

Tap "Join" on any challenge card on the Challenges page. Member count updates in real time. If `max_members` is reached, the button becomes "Full".

## Detail page

Each challenge has its own route (`/challenges/:id`) that opens when you tap a card. The detail page shows:

* **Hero** — the team's collective consistency percentage (= weeks-met across all members ÷ total possible weeks).
* **Milestones timeline** — five collective milestones with achieved / pending states:
  * **Kickoff** (challenge started)
  * **First wave** — first week where ≥ 50 % of members hit the goal
  * **Halfway** — collective weeks-met crosses half of the total possible
  * **All-in week** — first week where 100 % of members hit the goal
  * **Finish line** — challenge ended
* **Weekly participation chart** — per-week bars showing what % of members hit the goal that week.
* **Consistency grid** — heatmap, rows = members ordered by weeks-met, columns = weeks. Filled cells = met, empty cells = missed, dashed cells = still upcoming. Hover a cell to see the member's km that week.
* **Leaderboard** — members sorted by weeks-met, with a per-member progress bar.

## Owner edit

If you're the creator, a pencil icon appears in the header and (when the banner is empty) an "Add a banner" placeholder. Tapping either opens the edit modal:

* **Banner image** — base64 data URL stored on the challenge row (max 500 KB raw; 700 K char cap on the server). The detail page shows it in a 16:5 strip at the top with a "Edit" overlay in the corner for the owner.
* **Title**, **description**, **goal km/week**, **max members**.

`PATCH /api/challenges/:id` rejects with 403 if the caller isn't the creator.

## Backend mechanics

`getChallengeDetails` does the heavy lifting on read:

1. Builds the list of ISO weeks from `startDate` to `endDate`.
2. Joins all members with their `Activity` rows in that window.
3. Computes per-member, per-week `goalMet` against `challenge.goalKmWeek` (not the user's personal `targetKm` — challenges have their own bar).
4. Aggregates the weekly participation %, the collective ratio, and the five milestones.

Everything is computed live; no challenge-specific cron job is needed.
