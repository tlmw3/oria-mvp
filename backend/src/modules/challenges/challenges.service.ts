import type { PrismaClient } from "@prisma/client";
import type { CreateChallengeBody } from "./challenges.schemas.js";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../lib/errors.js";

export async function createChallenge(
  prisma: PrismaClient,
  userId: string,
  body: CreateChallengeBody,
) {
  const challenge = await prisma.challenge.create({
    data: {
      creatorId: userId,
      title: body.title,
      description: body.description,
      goalKmWeek: body.goalKmWeek,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      maxMembers: body.maxMembers,
      members: {
        create: { userId },
      },
    },
    include: { members: { include: { user: true } } },
  });

  return challenge;
}

export async function listChallenges(
  prisma: PrismaClient,
  userId: string,
) {
  return prisma.challenge.findMany({
    where: {
      status: "active",
      OR: [
        { members: { some: { userId } } },
        { maxMembers: null },
        {
          maxMembers: {
            gt: 0,
          },
        },
      ],
    },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, displayName: true, avatarUrl: true },
          },
        },
      },
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function joinChallenge(
  prisma: PrismaClient,
  userId: string,
  challengeId: string,
) {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: { _count: { select: { members: true } } },
  });

  if (!challenge) throw new NotFoundError("Challenge");
  if (challenge.status !== "active") {
    throw new BadRequestError("Challenge is not active");
  }
  if (challenge.maxMembers && challenge._count.members >= challenge.maxMembers) {
    throw new BadRequestError("Challenge is full");
  }

  return prisma.challengeMember.create({
    data: { challengeId, userId },
  });
}

export async function deleteChallenge(
  prisma: PrismaClient,
  userId: string,
  challengeId: string,
) {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    select: { id: true, creatorId: true },
  });
  if (!challenge) throw new NotFoundError("Challenge");
  if (challenge.creatorId !== userId) {
    throw new ForbiddenError("Only the creator can delete this challenge");
  }
  await prisma.challenge.delete({ where: { id: challengeId } });
  return { ok: true };
}

export async function getChallengeDetails(
  prisma: PrismaClient,
  challengeId: string,
) {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      },
      creator: {
        select: { id: true, displayName: true },
      },
    },
  });

  if (!challenge) throw new NotFoundError("Challenge");
  return challenge;
}
