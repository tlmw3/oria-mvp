import type { PrismaClient } from "@prisma/client";
import type { VerifyBody } from "./auth.schemas.js";
import { APY } from "../../config/constants.js";

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
    // Backfill missing walletAddr / avatarUrl when the verify payload now carries them.
    // Handles older accounts created before walletAddr was reliably captured at signup.
    const patch: { walletAddr?: string; avatarUrl?: string } = {};
    if (!existing.walletAddr && body.walletAddr) patch.walletAddr = body.walletAddr;
    if (!existing.avatarUrl && body.avatarUrl) patch.avatarUrl = body.avatarUrl;
    if (Object.keys(patch).length > 0) {
      const updated = await prisma.user.update({
        where: { privyId },
        data: patch,
        include: { streak: true },
      });
      return { user: updated, streak: updated.streak, isNew: false };
    }
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
          // Pool-model baseline: every brand-new user starts at 3 %, not the
          // legacy 4 % the tiered APY function returned.
          currentApy: APY.BASELINE,
          effectiveApy: APY.BASELINE,
        },
      },
    },
    include: { streak: true },
  });

  return { user, streak: user.streak, isNew: true };
}
