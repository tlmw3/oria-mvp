import type { PrismaClient } from "@prisma/client";
import { computeApy, computeMultipliers, activityScore, computePoolApy } from "./apy.utils.js";
import { getMorphoApy } from "./morpho.service.js";
import { STREAK_MILESTONES, APY } from "../../config/constants.js";
import { BadRequestError, NotFoundError } from "../../lib/errors.js";
import { sendPushToUser } from "../push/push.service.js";
import type { LogActivityBody } from "./streaks.schemas.js";

interface UserSettings {
  runPlan?: { sessionsPerWeek: number; longRunKm: number };
}

function getLongRunThreshold(user: { targetKm: number; settings: unknown }): number {
  const s = (user.settings as UserSettings) ?? {};
  if (s.runPlan?.longRunKm && s.runPlan.longRunKm > 0) return s.runPlan.longRunKm;
  return user.targetKm * APY.LONG_RUN_MULTIPLIER;
}

const MEAN_SCORE_KEY = "mean_activity_score";

function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? 6 : day - 1; // Monday = 0
  d.setUTCDate(d.getUTCDate() - diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function logActivity(
  prisma: PrismaClient,
  userId: string,
  body: LogActivityBody,
) {
  const weekStart = body.weekStart
    ? getWeekStart(new Date(body.weekStart))
    : getWeekStart();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { targetKm: true },
  });
  if (!user) throw new NotFoundError("User");

  // Accumulate distance for the week (don't replace)
  const previousActivity = await prisma.activity.findUnique({
    where: { userId_weekStart: { userId, weekStart } },
  });
  const previousDistance = previousActivity?.distanceKm ?? 0;
  const wasGoalAlreadyMet = previousActivity?.goalMet ?? false;
  const totalDistance = previousDistance + body.distanceKm;
  const goalMet = totalDistance >= user.targetKm;

  const activity = await prisma.activity.upsert({
    where: {
      userId_weekStart: { userId, weekStart },
    },
    update: {
      distanceKm: totalDistance,
      source: body.source,
      goalMet,
    },
    create: {
      userId,
      weekStart,
      distanceKm: body.distanceKm,
      source: body.source,
      goalMet,
    },
  });

  // Update streak in real-time only when goal transitions to met for the first time this week
  if (goalMet && !wasGoalAlreadyMet) {
    const streak = await prisma.streak.findUnique({ where: { userId } });
    if (streak) {
      const newCount = streak.currentCount + 1;
      // APY is now computed live via getMyStreak; just bump the count + mark met
      await prisma.streak.update({
        where: { userId },
        data: {
          currentCount: newCount,
          longestCount: Math.max(streak.longestCount, newCount),
          lastWeekMet: true,
        },
      });

      // Push notification for goal met
      sendPushToUser(prisma, userId, {
        title: "Weekly Goal Crushed!",
        body: `You hit ${totalDistance.toFixed(1)}km — streak is now ${newCount} weeks!`,
        url: "/streak",
        tag: "goal-met",
      }).catch(() => {});
    }
  }

  return activity;
}

export async function getActivities(
  prisma: PrismaClient,
  userId: string,
  weeks: number,
) {
  const since = new Date();
  since.setDate(since.getDate() - weeks * 7);

  return prisma.activity.findMany({
    where: {
      userId,
      weekStart: { gte: since },
    },
    orderBy: { weekStart: "desc" },
  });
}

export async function getMyStreak(prisma: PrismaClient, userId: string) {
  const streak = await prisma.streak.findUnique({ where: { userId } });
  if (!streak) throw new NotFoundError("Streak");
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { targetKm: true, settings: true } });

  const weekStart = getWeekStart();
  const activity = await prisma.activity.findUnique({
    where: { userId_weekStart: { userId, weekStart } },
  });

  // Live compute the user's score + APY breakdown so changes show up before next weekly eval
  const longRunThresholdKm = user ? getLongRunThreshold(user) : streak.weekLongestRun;
  const score = activityScore({
    currentCount: streak.currentCount,
    weekSessions: streak.weekSessions,
    weekLongestRun: streak.weekLongestRun,
    longRunThresholdKm,
    monthAvgPace: streak.monthAvgPace,
    prevMonthAvgPace: streak.prevMonthAvgPace,
  });

  const vaultRate = await getMorphoApy(prisma);
  const meanCfg = await prisma.systemConfig.findUnique({ where: { key: MEAN_SCORE_KEY } });
  const meanScore = (meanCfg?.value as { value?: number })?.value ?? score; // first-user fallback = own score
  const apy = computePoolApy(score, meanScore, vaultRate);

  return {
    ...streak,
    activityScore: Math.round(score * 1000) / 1000,
    poolBonus: apy.bonus,
    currentApy: apy.baseline,
    effectiveApy: apy.effective,
    apyBreakdown: {
      vaultRate: apy.vaultRate,
      spread: APY.SPREAD,
      baseline: apy.baseline,
      poolRate: apy.poolRate,
      bonus: apy.bonus,
      effective: apy.effective,
      meanScore: Math.round(meanScore * 1000) / 1000,
    },
    currentWeek: {
      weekStart,
      distanceKm: activity?.distanceKm ?? 0,
      goalMet: activity?.goalMet ?? false,
    },
  };
}

const VACATION_DURATION_WEEKS = 2;

export async function startVacation(prisma: PrismaClient, userId: string) {
  const streak = await prisma.streak.findUnique({ where: { userId } });
  if (!streak) throw new NotFoundError("Streak");
  if (streak.vacationUntil && streak.vacationUntil > new Date()) {
    throw new BadRequestError("Vacation mode is already active");
  }
  const until = new Date(Date.now() + VACATION_DURATION_WEEKS * 7 * 24 * 60 * 60 * 1000);
  return prisma.streak.update({
    where: { userId },
    data: { vacationUntil: until },
    select: { vacationUntil: true },
  });
}

export async function endVacation(prisma: PrismaClient, userId: string) {
  const streak = await prisma.streak.findUnique({ where: { userId } });
  if (!streak) throw new NotFoundError("Streak");
  return prisma.streak.update({
    where: { userId },
    data: { vacationUntil: null },
    select: { vacationUntil: true },
  });
}

export async function recoverStreak(prisma: PrismaClient, userId: string) {
  const streak = await prisma.streak.findUnique({ where: { userId } });
  if (!streak) throw new NotFoundError("Streak");
  if (streak.lastWeekMet) throw new BadRequestError("Your streak is active — no recovery needed!");
  if (streak.currentCount === 0) throw new BadRequestError("No streak to recover");

  // Check if user has enough deposit balance (5 USDC cost)
  const RECOVERY_COST = 5;
  const deposits = await prisma.deposit.aggregate({
    where: { userId, status: "earning" },
    _sum: { amount: true },
  });
  const balance = deposits._sum.amount ?? 0;
  if (balance < RECOVERY_COST) throw new BadRequestError(`Need at least $${RECOVERY_COST} deposited to recover streak`);

  // Restore the streak
  await prisma.streak.update({
    where: { userId },
    data: { lastWeekMet: true },
  });

  // Create a feed event
  await prisma.feedEvent.create({
    data: {
      userId,
      eventType: "streak_recovered",
      payload: { streakCount: streak.currentCount, cost: RECOVERY_COST },
    },
  });

  return { recovered: true, streakCount: streak.currentCount, cost: RECOVERY_COST };
}

export async function evaluateStreaks(prisma: PrismaClient) {
  const weekStart = getWeekStart();
  const users = await prisma.user.findMany({
    include: { streak: true },
  });

  const results = [];

  // Phase 1 — first pass: update counts/streaks, compute each user's new score
  const vaultRate = await getMorphoApy(prisma);
  const passOne: Array<{ userId: string; score: number; newCount: number; newLongest: number; goalMet: boolean; longRunThreshold: number }> = [];

  for (const user of users) {
    if (!user.streak) continue;

    // Vacation mode: freeze streak — skip evaluation entirely while active.
    if (user.streak.vacationUntil && user.streak.vacationUntil > new Date()) {
      continue;
    }

    const activity = await prisma.activity.findUnique({
      where: { userId_weekStart: { userId: user.id, weekStart } },
    });

    const goalMet = activity?.goalMet ?? false;
    const alreadyIncremented = user.streak.lastWeekMet && goalMet;
    const newCount = goalMet ? (alreadyIncremented ? user.streak.currentCount : user.streak.currentCount + 1) : 0;
    const newLongest = Math.max(user.streak.longestCount, newCount);
    const longRunThreshold = getLongRunThreshold(user);

    const score = activityScore({
      currentCount: newCount,
      weekSessions: user.streak.weekSessions,
      weekLongestRun: user.streak.weekLongestRun,
      longRunThresholdKm: longRunThreshold,
      monthAvgPace: user.streak.monthAvgPace,
      prevMonthAvgPace: user.streak.prevMonthAvgPace,
    });

    passOne.push({ userId: user.id, score, newCount, newLongest, goalMet, longRunThreshold });
  }

  // Phase 2 — compute global mean score
  const meanScore = passOne.length > 0
    ? passOne.reduce((s, p) => s + p.score, 0) / passOne.length
    : 0;
  await prisma.systemConfig.upsert({
    where: { key: MEAN_SCORE_KEY },
    create: { key: MEAN_SCORE_KEY, value: { value: meanScore, computedAt: new Date().toISOString(), n: passOne.length } },
    update: { value: { value: meanScore, computedAt: new Date().toISOString(), n: passOne.length } },
  });

  // Phase 3 — apply pool distribution to each user
  for (const p of passOne) {
    const u = users.find((x) => x.id === p.userId);
    if (!u || !u.streak) continue;
    const apy = computePoolApy(p.score, meanScore, vaultRate);

    // Keep legacy bonus fields populated (for older UIs)
    const m = computeMultipliers(
      apy.baseline, u.streak.weekSessions, u.streak.weekLongestRun,
      p.longRunThreshold, u.streak.monthAvgPace, u.streak.prevMonthAvgPace,
    );

    await prisma.streak.update({
      where: { userId: p.userId },
      data: {
        currentCount: p.newCount,
        longestCount: p.newLongest,
        lastWeekMet: p.goalMet,
        currentApy: apy.baseline,
        effectiveApy: apy.effective,
        activityScore: p.score,
        poolBonus: apy.bonus,
        regularityBonus: m.regularityBonus,
        longRunBonus: m.longRunBonus,
        progressionBonus: m.progressionBonus,
        weekSessions: 0,
        weekLongestRun: 0,
      },
    });

    // Emit feed events for milestones
    if (p.goalMet) {
      const activity = await prisma.activity.findUnique({ where: { userId_weekStart: { userId: p.userId, weekStart } } });
      await prisma.feedEvent.create({
        data: {
          userId: p.userId,
          eventType: "goal_met",
          payload: {
            weekStart: weekStart.toISOString(),
            distanceKm: activity?.distanceKm ?? 0,
          },
        },
      });

      if ((STREAK_MILESTONES as readonly number[]).includes(p.newCount)) {
        await prisma.feedEvent.create({
          data: {
            userId: p.userId,
            eventType: "streak_milestone",
            payload: { streakCount: p.newCount },
          },
        });
      }
    } else if (u.streak.currentCount > 0) {
      await prisma.feedEvent.create({
        data: {
          userId: p.userId,
          eventType: "streak_lost",
          payload: { previousCount: u.streak.currentCount },
        },
      });
    }

    results.push({
      userId: p.userId,
      goalMet: p.goalMet,
      newCount: p.newCount,
      newApy: apy.effective,
    });
  }

  return results;
}
