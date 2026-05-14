import type { PrismaClient } from "@prisma/client";
import type { VerifyBody } from "./auth.schemas.js";
import { computeApy } from "../streaks/apy.utils.js";

export async function verifyAndUpsertUser(
  prisma: PrismaClient,
  privyId: string,
  body: VerifyBody,
) {
  const existing = await prisma.user.findUnique({
    where: { privyId },
    include: { streak: true },
  });

  if (existing) {
    return { user: existing, streak: existing.streak, isNew: false };
  }

  const user = await prisma.user.create({
    data: {
      privyId,
      walletAddr: body.walletAddr,
      displayName: body.displayName,
      avatarUrl: body.avatarUrl ?? undefined,
      streak: {
        create: {
          currentCount: 0,
          longestCount: 0,
          lastWeekMet: false,
          currentApy: computeApy(0),
        },
      },
    },
    include: { streak: true },
  });

  return { user, streak: user.streak, isNew: true };
}
