/**
 * One-off backfill: refresh every streak record's APY using the current
 * pool model (computePoolApy). Existing rows still carry the legacy
 * tiered values (4–8 % per streak tier), but the live model uses a 3 %
 * baseline + score-weighted bonus and never wrote back.
 *
 * Does NOT advance streak counts, reset weekly counters, or emit feed
 * events — only refreshes currentApy / effectiveApy / activityScore /
 * poolBonus + the three legacy multiplier bonuses.
 */
import { PrismaClient } from "@prisma/client";
import { activityScore, computePoolApy, computeMultipliers } from "../src/modules/streaks/apy.utils.js";
import { getMorphoApy } from "../src/modules/streaks/morpho.service.js";
import { APY } from "../src/config/constants.js";

const MEAN_SCORE_KEY = "mean_activity_score";

function getLongRunThreshold(user: { targetKm: number; settings: unknown }): number {
  const s = user.settings as { runPlan?: { longRunKm?: number } } | null;
  const planned = s?.runPlan?.longRunKm;
  if (planned && planned > 0) return planned;
  return user.targetKm * APY.LONG_RUN_MULTIPLIER;
}

async function main() {
  const prisma = new PrismaClient();
  const users = await prisma.user.findMany({ include: { streak: true } });
  const vaultRate = await getMorphoApy(prisma);

  // Phase 1 — compute every user's live activityScore
  // (vacation users included: we want to migrate them off the legacy tiered values too;
  //  their streak count remains frozen, only APY math is refreshed.)
  const passOne = users.flatMap((user) => {
    if (!user.streak) return [];
    const longRunThreshold = getLongRunThreshold(user);
    const score = activityScore({
      currentCount: user.streak.currentCount,
      weekSessions: user.streak.weekSessions,
      weekLongestRun: user.streak.weekLongestRun,
      longRunThresholdKm: longRunThreshold,
      monthAvgPace: user.streak.monthAvgPace,
      prevMonthAvgPace: user.streak.prevMonthAvgPace,
    });
    return [{ userId: user.id, displayName: user.displayName, streak: user.streak, score, longRunThreshold }];
  });

  // Phase 2 — global mean
  const meanScore = passOne.length > 0
    ? passOne.reduce((s, p) => s + p.score, 0) / passOne.length
    : 0;

  await prisma.systemConfig.upsert({
    where: { key: MEAN_SCORE_KEY },
    create: { key: MEAN_SCORE_KEY, value: { value: meanScore, computedAt: new Date().toISOString(), n: passOne.length } },
    update: { value: { value: meanScore, computedAt: new Date().toISOString(), n: passOne.length } },
  });

  // Phase 3 — apply pool distribution + write
  console.log(`Vault rate: ${vaultRate.toFixed(2)}% | Mean score: ${meanScore.toFixed(3)} | Users: ${passOne.length}`);
  console.log("---");
  for (const p of passOne) {
    const apy = computePoolApy(p.score, meanScore, vaultRate);
    const m = computeMultipliers(
      apy.baseline, p.streak.weekSessions, p.streak.weekLongestRun,
      p.longRunThreshold, p.streak.monthAvgPace, p.streak.prevMonthAvgPace,
    );
    await prisma.streak.update({
      where: { userId: p.userId },
      data: {
        currentApy: apy.baseline,
        effectiveApy: apy.effective,
        activityScore: p.score,
        poolBonus: apy.bonus,
        regularityBonus: m.regularityBonus,
        longRunBonus: m.longRunBonus,
        progressionBonus: m.progressionBonus,
      },
    });
    console.log(
      `${(p.displayName ?? "(no name)").padEnd(18)} streak=${String(p.streak.currentCount).padStart(2)} score=${p.score.toFixed(2)} ` +
      `=> ${p.streak.effectiveApy.toFixed(2)}% → ${apy.effective.toFixed(2)}% (base ${apy.baseline.toFixed(2)} + bonus ${apy.bonus.toFixed(2)})`,
    );
  }
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
