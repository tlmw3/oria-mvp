import type { PrismaClient } from "@prisma/client";
import { env } from "../../config/env.js";
import { NotFoundError } from "../../lib/errors.js";
import { APY } from "../../config/constants.js";
import { getMyStreak } from "../streaks/streaks.service.js";

// Mock wallet balances for MVP
const MOCK_BALANCES = {
  USDC: 2450.0,
  AVAX: 1.25,
};

export async function getBalance(
  prisma: PrismaClient,
  userId: string,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { walletAddr: true },
  });

  if (!user) throw new NotFoundError("User");

  // In production, read from chain via viem
  // For MVP, return mock balances
  return {
    walletAddr: user.walletAddr,
    balances: MOCK_BALANCES,
    chain: "avalanche-fuji",
  };
}

export async function recordDeposit(
  prisma: PrismaClient,
  userId: string,
  amount: number,
  token: string,
) {
  const deposit = await prisma.deposit.create({
    data: {
      userId,
      amount,
      token,
      status: "confirmed",
    },
  });

  // Create feed event
  await prisma.feedEvent.create({
    data: {
      userId,
      eventType: "deposit",
      payload: { amount, token },
    },
  });

  return deposit;
}

export async function startEarning(
  prisma: PrismaClient,
  userId: string,
) {
  // Update all confirmed deposits to earning status
  const updated = await prisma.deposit.updateMany({
    where: { userId, status: "confirmed" },
    data: { status: "earning", earningAt: new Date() },
  });

  return { updated: updated.count };
}

export async function getDeposits(
  prisma: PrismaClient,
  userId: string,
) {
  return prisma.deposit.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      amount: true,
      token: true,
      status: true,
      createdAt: true,
    },
    take: 20,
  });
}

export async function getEarnings(
  prisma: PrismaClient,
  userId: string,
) {
  // Live-recomputed streak (same source as Home + APY details) so APY doesn't drift
  // between weekly cron evaluations.
  const [deposits, streakLive] = await Promise.all([
    prisma.deposit.findMany({
      where: { userId, status: "earning" },
    }),
    getMyStreak(prisma, userId).catch(() => null),
  ]);

  const totalDeposited = deposits.reduce((sum: number, d: typeof deposits[0]) => sum + d.amount, 0);
  const apy = streakLive?.effectiveApy ?? streakLive?.currentApy ?? APY.BASELINE;

  // Simple projected yield calculation
  const annualYield = totalDeposited * (apy / 100);
  const weeklyYield = annualYield / 52;
  const earningSince = deposits[0]?.earningAt ?? new Date();
  const weeksEarning =
    (Date.now() - earningSince.getTime()) / (7 * 24 * 60 * 60 * 1000);
  const totalEarned = weeklyYield * Math.max(0, weeksEarning);

  return {
    totalDeposited,
    totalEarned: Math.round(totalEarned * 100) / 100,
    currentApy: apy,
    projectedWeekly: Math.round(weeklyYield * 100) / 100,
    projectedAnnual: Math.round(annualYield * 100) / 100,
  };
}
