import { APY, APY_TIERS } from "../../config/constants.js";

/// Legacy tier-based APY (kept for compatibility; new model uses pool distribution).
export function computeApy(streakCount: number): number {
  if (streakCount <= 0) return APY.BASE;
  for (const [threshold, apy] of APY_TIERS) {
    if (streakCount >= threshold) return apy;
  }
  return APY.BASE;
}

export interface ScoreInputs {
  currentCount: number;       // streak weeks (0..MAX_STREAK)
  weekSessions: number;
  weekLongestRun: number;
  longRunThresholdKm: number; // user's plan long-run target (km), or 0 if none
  monthAvgPace: number;
  prevMonthAvgPace: number;
}

/// Composite activity score in [0, 1]. Higher = more active.
export function activityScore(s: ScoreInputs): number {
  // Streak component (linear interp between 0w and MAX_STREAK)
  const streakNorm = Math.min(1, Math.max(0, s.currentCount / APY.MAX_STREAK));
  const streakComp = APY.SCORE_STREAK_WEIGHT * streakNorm;

  // Regularity: ≥ N sessions/week
  const regularityComp =
    s.weekSessions >= APY.REGULARITY_MIN_SESSIONS ? APY.SCORE_REGULARITY_WEIGHT : 0;

  // Long run: weekly longest run ≥ user-configured threshold (skip if no threshold)
  const longRunComp =
    s.longRunThresholdKm > 0 && s.weekLongestRun >= s.longRunThresholdKm
      ? APY.SCORE_LONGRUN_WEIGHT
      : 0;

  // Pace progression: month avg pace strictly faster than previous month
  const progressionComp =
    s.monthAvgPace > 0 && s.prevMonthAvgPace > 0 && s.monthAvgPace < s.prevMonthAvgPace
      ? APY.SCORE_PROGRESSION_WEIGHT
      : 0;

  const total = streakComp + regularityComp + longRunComp + progressionComp;
  return Math.min(1, Math.max(0, total));
}

export interface PoolApyResult {
  baseline: number;     // baseline percentage (3%)
  poolRate: number;     // available bonus pool rate (percentage points)
  bonus: number;        // user's bonus from the pool (percentage points)
  effective: number;    // baseline + bonus, rounded
  vaultRate: number;    // reference Morpho rate (%)
}

/// Compute a user's effective APY using the redistribution-pool model.
/// - baseline (3%) guaranteed for everyone
/// - pool = max(0, (vaultRate - spread) - baseline) distributed proportionally to activity score
/// - bonus per user = pool × (score / meanScore), capped at pool × POOL_CAP_MULTIPLIER
/// - When market rate < baseline + spread, pool is 0 and everyone falls back to whatever is left.
export function computePoolApy(
  score: number,
  meanScore: number,
  vaultRate: number,
): PoolApyResult {
  const distributable = Math.max(0, vaultRate - APY.SPREAD);

  // Low-rate market: everyone gets what's available, no bonus
  if (distributable <= APY.BASELINE) {
    const eff = Math.round(distributable * 100) / 100;
    return { baseline: eff, poolRate: 0, bonus: 0, effective: eff, vaultRate };
  }

  const poolRate = distributable - APY.BASELINE;

  // No one is active yet, or solo user case
  if (meanScore <= 0) {
    return {
      baseline: APY.BASELINE,
      poolRate,
      bonus: 0,
      effective: APY.BASELINE,
      vaultRate,
    };
  }

  const rawBonus = poolRate * (score / meanScore);
  const cap = poolRate * APY.POOL_CAP_MULTIPLIER;
  const bonus = Math.max(0, Math.min(cap, rawBonus));
  // Hard ceiling: no user can ever earn more than what the underlying vault
  // is generating. Without this an active user could be subsidised by
  // inactive users into "beating Morpho", which reads as suspicious.
  const effective = Math.min(
    APY.EFFECTIVE_CAP,
    vaultRate,
    Math.round((APY.BASELINE + bonus) * 100) / 100,
  );

  return {
    baseline: APY.BASELINE,
    poolRate: Math.round(poolRate * 100) / 100,
    bonus: Math.round(bonus * 100) / 100,
    effective,
    vaultRate: Math.round(vaultRate * 100) / 100,
  };
}

/// Legacy multiplier function, kept for compatibility with callers that still
/// reference the binary bonuses. New evaluators should use computePoolApy.
export interface MultiplierResult {
  regularityBonus: number;
  longRunBonus: number;
  progressionBonus: number;
  effectiveApy: number;
}

export function computeMultipliers(
  baseApy: number,
  weekSessions: number,
  weekLongestRunKm: number,
  longRunThresholdKm: number,
  monthAvgPace: number,
  prevMonthAvgPace: number,
): MultiplierResult {
  const regularity =
    weekSessions >= APY.REGULARITY_MIN_SESSIONS ? APY.REGULARITY_BONUS : 0;
  const longRun =
    longRunThresholdKm > 0 && weekLongestRunKm >= longRunThresholdKm
      ? APY.LONG_RUN_BONUS
      : 0;
  const progression =
    monthAvgPace > 0 && prevMonthAvgPace > 0 && monthAvgPace < prevMonthAvgPace
      ? APY.PROGRESSION_BONUS
      : 0;
  const effective = Math.min(
    APY.EFFECTIVE_CAP,
    Math.round((baseApy + regularity + longRun + progression) * 100) / 100,
  );
  return {
    regularityBonus: regularity,
    longRunBonus: longRun,
    progressionBonus: progression,
    effectiveApy: effective,
  };
}
