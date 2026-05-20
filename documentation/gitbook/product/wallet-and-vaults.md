# Wallet & vaults

The Wallet tab is where deposits, investments, and withdrawals happen — and where you see your real on-chain balances in real time.

## Receive

Receive sheet with:

* A QR code containing your Privy-issued wallet address.
* Tap-to-copy address with a "Copied!" toast confirmation.
* A note that the app is multi-chain (Base + Ethereum mainnet) and the same address works on both.

## Invest

Three Morpho ERC-4626 vaults are exposed. The user picks one in the Invest modal:

| Vault | Address | Chain |
| --- | --- | --- |
| Steakhouse Prime USDC | `0xBEEFE94c8aD530842bfE7d8B397938fFc1cb83b2` | Base |
| Gauntlet USDC Prime | `0xeE8F4eC5672F09119b96Ab6fB59C27E1b7e44b61` | Base |
| Gauntlet USDC Frontier | `0xc582F04d8a82795aa2Ff9c8bb4c1c889fe7b754e` | Ethereum mainnet |

The flow:

1. Approve USDC on the chosen chain (only the first time, or after the previous allowance is spent).
2. `deposit(assets, receiver)` on the vault contract.
3. The vault mints ERC-4626 shares to the user's wallet.
4. Live position is reflected on the dashboard within seconds via `useMorphoPositions`.

## Withdraw

Same flow in reverse: pick a vault, enter an amount (or "Max"), and the Withdraw modal calls `redeem(shares, receiver, owner)`. USDC lands back in your wallet immediately.

## Earnings

The "Earning status" card on the Wallet page shows three numbers:

* **Invested** — sum of your live ERC-4626 share value across all vaults (computed client-side via viem).
* **Earned** — projected earnings since funds went into "earning" status, computed server-side using your live `effectiveApy`.
* **Your APY** — your current `effectiveApy`, recomputed every request via `getMyStreak` so it matches what Home / APY details / friends leaderboard show.

The "Idle USDC" card surfaces tokens sitting on your wallet but not yet invested, broken down per chain, with a "Tap Invest to deploy" prompt.

## Balance fallback

`GET /api/wallet/balance` still returns mock balances (`USDC: 2450, AVAX: 1.25`) — a legacy endpoint that's effectively unused. The Wallet UI ignores it and reads real balances directly via `useMorphoPositions`. Listed under "known limitations".
