# Baseline + bonus pool

Every user's APY has two parts. A **guaranteed baseline** that doesn't depend on behavior, and a **bonus** funded by a shared pool that's redistributed based on how active each user is.

## The numbers

```
distributable  = vaultRate − spread          (vault rate minus the operating margin)
baseline       = 3.00 %                       guaranteed for everyone
pool           = max(0, distributable − 3 %)  shared bonus reservoir
your bonus     = pool × (score_i / mean_score)
APY effective  = min(vaultRate, baseline + your bonus)
```

The `vaultRate` is the live APY of the underlying Morpho vault, fetched and cached for 24 hours. The `mean_score` is recomputed every week across the user base.

## Why an effective ceiling at the vault rate

Without a ceiling, a very active user could earn more than the underlying vault generates, subsidized by inactive users. That's mathematically consistent (the pool is finite, just unevenly distributed) but it reads as suspicious — "how is Oria paying more than Morpho?". So we cap at `vaultRate`: no user ever sees an APY higher than what the underlying produces.

## A concrete example

Imagine the Morpho vault is yielding **4.89 %** and there are five users with these activity scores:

| User    | Streak | Activity score | Raw bonus | Effective APY |
| ------- | ------ | -------------- | --------- | ------------- |
| Louis   | 18 w   | 0.90           | 3.57 %    | **4.89 %** ← capped at vault rate |
| Emma D. | 8 w    | 0.45           | 2.47 %    | **4.89 %** ← capped at vault rate |
| Talam   | 3 w    | 0.26           | 1.44 %    | **4.44 %**    |
| Sarah   | 5 w    | 0.19           | 1.03 %    | **4.03 %**    |
| Lina    | 1 w    | 0.04           | 0.21 %    | **3.21 %**    |
| Inactive user | 0 w | 0           | 0.00 %    | **3.00 %**    |

High-streak users plateau at the vault rate. Mid-streak users spread out below it. Inactive users stay at the baseline.

## What the user sees on `/apy`

The breakdown card on the APY page deliberately doesn't expose `vaultRate − spread`. It shows:

* **Baseline (guaranteed)** — 3.00 %
* **Bonus pool available** — the pool size
* **Your activity bonus** — what you take
* **Your total** — the effective APY

We don't surface the raw Morpho rate so that the experience doesn't push a savvy user to bypass Oria and go straight to the vault. The math is honest, the framing is product-side.
