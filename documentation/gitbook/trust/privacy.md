# Privacy

A short page covering what we collect, what we share, and what stays between the user and the platform.

## What we collect

* **Profile** — display name, avatar (if you upload one), goal type, weekly km target, optional run schedule, optional unit preference.
* **Activity** — weekly distance aggregates (km) and a per-week `goalMet` flag. If you connect Strava, we also derive average pace (current month + last month) and a per-week longest session length.
* **Social** — your accepted friendships and the events you generate on the feed (goals met, streak milestones, deposits, recoveries).
* **Wallet** — your EVM address. Balances aren't stored; the dashboard reads them on-chain in real time.
* **Privy id and email/Google/Apple subject** — needed for authentication.

## What we don't collect

* Per-session GPS traces or routes. The Strava integration uses `activity:read_all`, but we keep only weekly totals and pace averages — no map data, no individual workout details persisted.
* Your seed phrase or any key material — by design, Privy holds the shards.
* Heart rate, weight, age, or any health metric beyond what's required to compute the activity score.

## Visibility

* **Your weekly km, streak count, and effective APY** are visible to your accepted friends on the leaderboard and in their activity feed.
* **Your wallet address** is visible on your profile if you share the link; it's not searchable.
* **Your goals (target km, discipline)** are private.
* **Your deposits and earnings** are private (your friends see "X deposited 100 USDC" if a deposit event is emitted, but not the running balance).

The Settings page exposes two privacy toggles:

* `privacyShowOnLeaderboard` — hide your row from the friends leaderboard while staying able to view others.
* `privacyShowActivityToFriends` — suppress your goal-met / streak / challenge events from the feed.

## Sharing

* We don't sell or share user data with third parties.
* Strava sees only the read calls we make (their standard terms).
* Privy sees the auth events.
* Morpho sees the on-chain deposits / withdrawals — same as if you used their UI directly.

## Deletion

Account deletion isn't self-service yet — for now, write to support and we'll cascade-delete your User row (which removes Streak, Activities, Deposits, Friendships, FeedEvents, Notifications, PushSubscriptions, ChallengeMembers, and any Challenge you own).
