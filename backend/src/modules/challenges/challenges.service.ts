import type { PrismaClient } from "@prisma/client";
import type { CreateChallengeBody, UpdateChallengeBody } from "./challenges.schemas.js";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../lib/errors.js";

function toWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function weeksBetween(start: Date, end: Date): Date[] {
  const weeks: Date[] = [];
  let cur = toWeekStart(start);
  const last = toWeekStart(end);
  while (cur.getTime() <= last.getTime()) {
    weeks.push(new Date(cur));
    cur = new Date(cur);
    cur.setUTCDate(cur.getUTCDate() + 7);
  }
  return weeks;
}

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

export async function updateChallenge(
  prisma: PrismaClient,
  userId: string,
  challengeId: string,
  body: UpdateChallengeBody,
) {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    select: { id: true, creatorId: true },
  });
  if (!challenge) throw new NotFoundError("Challenge");
  if (challenge.creatorId !== userId) {
    throw new ForbiddenError("Only the owner can edit this challenge");
  }
  return prisma.challenge.update({
    where: { id: challengeId },
    data: body,
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

  // Build the weekly grid: per-member, per-week progress vs the challenge goal.
  const weeks = weeksBetween(challenge.startDate, challenge.endDate);
  const memberIds = challenge.members.map((m) => m.userId);

  const activities = memberIds.length > 0 && weeks.length > 0
    ? await prisma.activity.findMany({
        where: {
          userId: { in: memberIds },
          weekStart: { gte: weeks[0], lte: weeks[weeks.length - 1] },
        },
        select: { userId: true, weekStart: true, distanceKm: true },
      })
    : [];

  const byUserWeek = new Map<string, number>();
  for (const a of activities) {
    const key = `${a.userId}|${a.weekStart.toISOString().slice(0, 10)}`;
    byUserWeek.set(key, a.distanceKm);
  }

  const goal = challenge.goalKmWeek;
  const now = Date.now();

  const members = challenge.members.map((m) => {
    const weekly = weeks.map((w) => {
      const iso = w.toISOString().slice(0, 10);
      const km = byUserWeek.get(`${m.userId}|${iso}`) ?? 0;
      const isPast = w.getTime() + 7 * 86400_000 <= now;
      return { weekStart: iso, distanceKm: km, goalMet: km >= goal, isPast };
    });
    const weeksMet = weekly.filter((w) => w.goalMet).length;
    const weeksElapsed = weekly.filter((w) => w.isPast).length;
    return {
      id: m.id,
      userId: m.userId,
      joinedAt: m.joinedAt,
      user: m.user,
      weeksMet,
      weeksElapsed,
      weekly,
    };
  });

  // Per-week collective participation: % of members who hit the goal
  const weeklyParticipation = weeks.map((w, i) => {
    const iso = w.toISOString().slice(0, 10);
    const isPast = w.getTime() + 7 * 86400_000 <= now;
    let met = 0;
    for (const m of members) if (m.weekly[i].goalMet) met += 1;
    return {
      weekStart: iso,
      isPast,
      metCount: met,
      total: members.length,
      ratio: members.length > 0 ? met / members.length : 0,
    };
  });

  // Aggregate stats
  const totalWeeksMet = members.reduce((s, m) => s + m.weeksMet, 0);
  const totalWeeksPossible = members.length * weeks.length;
  const elapsedWeeks = weeks.filter((w) => w.getTime() + 7 * 86400_000 <= now).length;

  // Milestones (collective)
  const halfwayTarget = Math.floor(totalWeeksPossible / 2);
  const firstAllInIdx = weeklyParticipation.findIndex((w) => w.isPast && w.ratio >= 1 && w.total > 0);
  const firstHalfWaveIdx = weeklyParticipation.findIndex((w) => w.isPast && w.ratio >= 0.5 && w.total > 0);

  const milestones = [
    {
      key: "kickoff",
      label: "Kickoff",
      achieved: weeks.length > 0 && weeks[0].getTime() <= now,
      sub: weeks[0]?.toISOString().slice(0, 10) ?? null,
    },
    {
      key: "first_wave",
      label: "First wave",
      sub: "≥ 50% members hit the goal in a week",
      achieved: firstHalfWaveIdx !== -1,
      at: firstHalfWaveIdx !== -1 ? weeklyParticipation[firstHalfWaveIdx].weekStart : null,
    },
    {
      key: "halfway",
      label: "Halfway",
      sub: `${totalWeeksMet}/${halfwayTarget} collective weeks`,
      achieved: totalWeeksMet >= halfwayTarget && halfwayTarget > 0,
    },
    {
      key: "all_in",
      label: "All-in week",
      sub: "100% members hit the goal in a single week",
      achieved: firstAllInIdx !== -1,
      at: firstAllInIdx !== -1 ? weeklyParticipation[firstAllInIdx].weekStart : null,
    },
    {
      key: "finish_line",
      label: "Finish line",
      sub: weeks[weeks.length - 1]?.toISOString().slice(0, 10) ?? null,
      achieved: weeks.length > 0 && weeks[weeks.length - 1].getTime() + 7 * 86400_000 <= now,
    },
  ];

  return {
    id: challenge.id,
    creatorId: challenge.creatorId,
    title: challenge.title,
    description: challenge.description,
    bannerUrl: challenge.bannerUrl,
    goalKmWeek: challenge.goalKmWeek,
    startDate: challenge.startDate,
    endDate: challenge.endDate,
    maxMembers: challenge.maxMembers,
    status: challenge.status,
    creator: challenge.creator,
    weeks: weeks.map((w) => w.toISOString().slice(0, 10)),
    elapsedWeeks,
    members,
    weeklyParticipation,
    aggregate: {
      totalWeeksMet,
      totalWeeksPossible,
      ratio: totalWeeksPossible > 0 ? totalWeeksMet / totalWeeksPossible : 0,
    },
    milestones,
  };
}
