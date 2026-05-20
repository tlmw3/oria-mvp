# On-chain

Oria is non-custodial. The only thing that lives on-chain is the user's USDC + ERC-4626 vault shares. Activity tracking and the APY model are entirely off-chain.

## Wallets

* Privy embedded wallets — provisioned automatically at signup, no seed phrase exposed to the user.
* The same address works on Base and Ethereum mainnet (the two chains Oria supports today). No bridging in-app.

## Vaults

Three Morpho ERC-4626 vaults are integrated. All hold USDC.

| Name | Address | Chain ID | Use |
| --- | --- | ---: | --- |
| Steakhouse Prime USDC | `0xBEEFE94c8aD530842bfE7d8B397938fFc1cb83b2` | 8453 | Default vault + reference rate for the pool model |
| Gauntlet USDC Prime | `0xeE8F4eC5672F09119b96Ab6fB59C27E1b7e44b61` | 8453 | Alt option, Base |
| Gauntlet USDC Frontier | `0xc582F04d8a82795aa2Ff9c8bb4c1c889fe7b754e` | 1 | Alt option, Ethereum mainnet |

The Steakhouse Prime rate is what feeds the pool model — the other two are just convenience deposit options.

## Reads

`frontend/src/lib/useMorphoPositions.ts` is the client-side hook that aggregates positions across all three vaults using viem multicall. It returns:

* `idle` — per-chain USDC balances sitting in the wallet, not yet invested.
* `positions` — per-vault assets (vault.convertToAssets(shareBalance)) and the vault's live APY (fetched via Morpho's GraphQL).
* `invested` — sum of `positions[].assets`.
* `total` — `invested + sum(idle.usdc)`.

This runs entirely client-side, so the Wallet page reflects on-chain state in real time without going through the backend.

## Writes

Two flows:

* **Deposit**: `approve(vault, amount)` on USDC, then `deposit(amount, receiver)` on the vault. Vault mints shares to the user.
* **Withdraw**: `redeem(shares, receiver, owner)` on the vault. USDC lands in the user's wallet.

Both go through `lib/useOnChainDeposit.ts` which wraps viem's wallet client with the embedded Privy account.

## Server-side

The backend reads the **vault APY** (not balances) via `backend/src/modules/streaks/morpho.service.ts`, which calls Morpho's GraphQL endpoint and caches the result for 24 hours in `SystemConfig`. Balances are never queried on-chain server-side — the only on-chain entry point is the client.

## What's NOT on-chain

* The activity score and APY breakdown — entirely off-chain.
* Friendships, challenges, the feed — all in Postgres.
* The 3 % baseline guarantee is a *product promise*, not a smart-contract commitment. There's no on-chain payer of last resort if the Morpho vault rate drops below 3 % + spread.
