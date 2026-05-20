# FAQ

### How is the bonus pool funded?

The pool is exactly `vaultRate − spread − baseline`, where:

* `vaultRate` is the Morpho vault's APY.
* `spread` is Oria's operating margin (1 % at the time of writing).
* `baseline` is 3 %, guaranteed for everyone.

Whatever's left over from the vault yield, after the spread and the universal baseline, is what the bonus pool redistributes among active users in proportion to their activity score.

### Can my APY ever go below 3 %?

Only if the underlying vault itself is yielding less than 3 % + spread. In that case the distributable amount is below the baseline, and everyone — active or not — sees `vaultRate − spread`. No bonus is paid, and the model falls back to "everyone gets whatever the market gives." This is rare with USDC vaults but a safety: Oria never pays out more than the vault generates.

### Can my APY go above the vault rate?

No. The effective APY is capped at the vault rate itself. The math could in theory push a very active user above that ceiling (the inactive users' share would "flow" to them via the pool), but we deliberately clamp it. The reason: showing an APY higher than the underlying Morpho rate reads as suspicious to anyone who knows where the yield comes from, even though it's internally consistent.

### Why don't all top-streak users see the same APY then?

They do, once they reach the ceiling. Louis at 18 weeks and Emma D. at 8 weeks both hit the vault-rate cap because their `score / meanScore` ratio is high enough to claim the maximum bonus. That's a feature: the message is "you've maxed out your share of the pool." Below the cap, mid-streak users still differentiate clearly.

### What happens if I miss a week?

Your streak count resets to 0. The next time the weekly evaluator runs, your activity score drops to whatever the non-streak components contribute (regularity, long run, progression). If you go fully inactive, your score goes to 0 and your APY drops to the 3 % baseline.

### Can I recover a lost streak?

Yes — once. The streak recovery flow costs 5 USDC out of your earning deposits and restores the streak you had before the miss. Sized so it's a meaningful commitment, not a free reset.

### How often is the vault rate refreshed?

Every 24 hours via a cached fetch to Morpho's GraphQL API. Internally we also store a fallback rate (5.5 %) used only if the Morpho API is unreachable for a long stretch.

### What happens during the demo when the vault rate is, say, 4.89 %?

* Baseline: 3 %
* Distributable: 4.89 − 1 = 3.89 %
* Pool: 3.89 − 3 = 0.89 %
* Per-user bonus: `0.89 % × (score / meanScore)`, capped at `vaultRate` overall
* Most active users land at 4.89 %, the mid-tier at 4.0–4.6 %, low-activity at 3.2 %, inactive at 3.0 %.
