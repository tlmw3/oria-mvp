export const APY = {
  BASE: 4.0,
  MAX: 8.0,
  MAX_STREAK: 16,
  EFFECTIVE_CAP: 12.0,
  REGULARITY_BONUS: 0.3,
  REGULARITY_MIN_SESSIONS: 3,
  LONG_RUN_BONUS: 0.2,
  LONG_RUN_MULTIPLIER: 1.5,
  PROGRESSION_BONUS: 0.2,
  /// New pool-based model
  BASELINE: 3.0,             // guaranteed for everyone
  SPREAD: 1.0,               // Oria keeps 1% of vault APY
  POOL_CAP_MULTIPLIER: 4.0,  // max individual bonus = pool × this. The hard ceiling is the vault rate itself (see computePoolApy), so this just shapes the curve below it.
  FALLBACK_VAULT_APY: 5.5,   // used if Morpho fetch fails (rough Steakhouse Prime USDC avg)
  /// Score weights (must sum to 1.0)
  SCORE_STREAK_WEIGHT: 0.6,
  SCORE_REGULARITY_WEIGHT: 0.15,
  SCORE_LONGRUN_WEIGHT: 0.15,
  SCORE_PROGRESSION_WEIGHT: 0.10,
} as const;

export const MORPHO_VAULT = {
  ADDRESS: "0xBEEFE94c8aD530842bfE7d8B397938fFc1cb83b2",
  CHAIN_ID: 8453, // Base
  NAME: "Steakhouse Prime USDC",
} as const;

// Streak → base APY tiers. Picked for rounded values + quick early wins.
// Lookup is "first tier whose threshold the streak meets, descending".
export const APY_TIERS: ReadonlyArray<readonly [number, number]> = [
  [16, 8.0],
  [12, 7.5],
  [8, 7.0],
  [6, 6.5],
  [4, 6.0],
  [2, 5.5],
  [1, 5.0],
  [0, 4.0],
] as const;

export const STREAK_MILESTONES = [3, 5, 10, 25, 50] as const;

export const MOCK_USER_ID = "00000000-0000-0000-0000-000000000001";
export const MOCK_PRIVY_ID = "did:privy:mock-user-001";

export const AGENT_USER_ID = "00000000-0000-0000-0000-0000000000a9";
export const AGENT_PRIVY_ID = "did:privy:agent-claude";
