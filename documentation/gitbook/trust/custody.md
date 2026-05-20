# Custody & security

Short version: Oria never touches your USDC. The wallet is yours; the vault shares are yours; we manage the meta — friendships, the activity feed, the APY model.

## Who holds your funds

* **Privy** provisions an embedded EVM wallet for every user. The wallet is non-custodial by design — Privy stores key shards across user device + their infrastructure using MPC, but no single party (including Oria) can move funds unilaterally.
* **Morpho** ERC-4626 vaults are the destination of every deposit. Vault shares are minted directly to the user's wallet. Withdrawal goes through `redeem` on the vault itself.

If Oria's servers disappear tomorrow, you still own your USDC and your vault shares. You can interact with Morpho directly from any wallet client (MetaMask, Rabby, etc.) using the same address.

## Auth

* `POST /api/auth/verify` requires a Privy JWT. The backend verifies it against Privy's JWKS and never sees the user's password or social account credentials.
* The auth plugin supports a single static `DEV_AGENT_TOKEN` env var for automated testing (resolves to a fixed user id). It's optional and unset in production.

## API surface

* CORS is locked to `CORS_ORIGIN` (the frontend domain).
* Rate limiting via `@fastify/rate-limit` on the most-hit endpoints.
* No admin endpoints exposed publicly — `POST /api/streaks/evaluate` and `/api/cron/*` require the shared `CRON_SECRET` header.

## What we store

* Privy id, wallet address, display name, avatar (base64 data URL), goal type, target km, optional Strava refresh token.
* Per-week distance, streak count, activity score, APY columns.
* Friendships and feed events.

We **don't store**:

* The user's private key or any seed material.
* USDC balances (we read them on-chain via viem when the dashboard renders).
* Strava OAuth access tokens (only the refresh token, used to mint short-lived access tokens at sync time).

## What needs hardening before scale

* `users.strava_token` is currently stored in plain text. Production should encrypt at rest.
* `CRON_SECRET` defaults to a placeholder in code; production overrides via env, but the placeholder is committed which is fine only because the cron endpoints don't expose anything sensitive.
* Avatars and challenge banners stored as base64 in Postgres — fine for an MVP, should move to object storage (Vercel Blob / Supabase Storage) when usage grows.
* No formal Prisma migrations (we use `db push`). Acceptable for the iteration phase.

## Smart-contract risk

Inherited from the Morpho vaults themselves. Steakhouse Prime and Gauntlet are reputable curators with audited strategies, but the contract risk is non-zero and unrelated to Oria — we're just a UI on top.
