# Onboarding

Four steps, designed to be done in under two minutes.

## Step 1 — Connect Your Wallet

Privy handles login: email OTP, Google, or Apple. An embedded EVM wallet is provisioned automatically — no seed phrase, no MetaMask install, no chain switching prompts.

Under the hood, this hits `POST /api/auth/verify`. If the user already exists, we skip the rest of onboarding and route to the dashboard. If they're new, we create the User row with no displayName and no avatar so the next step can collect them properly.

## Step 2 — Pick a name your friends will recognize

A required step. We pre-fill with whatever Privy returned (Google name, then email prefix as a fallback) and ask the user to confirm or edit. Continue is disabled until at least 2 trimmed characters are in the input.

**Why required**: previously we auto-derived a default like `Runner-XYZ` when Privy returned nothing, but users who ignored editing it later became impossible to find in friend search. Forcing the name choice up-front cleans that up.

A profile photo is optional. The default is a neutral bust-silhouette placeholder in the same purple ring used throughout the app. Users can upload a photo (≤ 500 KB raw) or skip; there's no preset avatar gallery anymore.

## Step 3 — Set Your Goal

Pick a discipline:

* Running
* Cycling
* Steps

Then set a weekly km target. The UI suggests sensible defaults (5–20 km for running, 20–80 km for cycling) but you can type anything between 1 and 200.

The `runSchedule` (which days of the week you typically train) is optional — it's used to size the "Plan" tile on the dashboard. If you skip it, we auto-suggest 3–5 sessions per week based on your target.

## Step 4 — Fund your Oria wallet

A receive sheet with your wallet address, a QR code, and tap-to-copy. The user funds the wallet with USDC (on Base or Ethereum), then comes back to the app and triggers an investment from the Wallet tab.

If they want to do that later, the "I've sent funds (or do it later)" button takes them straight to the dashboard.

## What happens behind the scenes

* `verifyAndUpsertUser` creates the User and a paired Streak row (`currentApy` and `effectiveApy` default to 3 %, the pool-model baseline).
* The display name and avatar are written via `PATCH /api/users/me` during step 2.
* The goal type and target km are persisted during step 3, also via `PATCH /api/users/me`.
* An onboarding cookie (`oria_onboarded=1`) is set on completion so returning users skip the flow.
