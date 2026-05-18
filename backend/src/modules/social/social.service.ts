import type { PrismaClient } from "@prisma/client";
import { BadRequestError, NotFoundError } from "../../lib/errors.js";
import { sendPushToUser } from "../push/push.service.js";

interface UserSettings {
  notifRunReminders?: boolean;
  notifPokes?: boolean;
  notifFriendRequests?: boolean;
  notifWeeklySummary?: boolean;
  privacyShowOnLeaderboard?: boolean;
  privacyShowActivityToFriends?: boolean;
  unitsKm?: boolean;
}

function getUserSetting(settings: unknown, key: keyof UserSettings): boolean {
  if (!settings || typeof settings !== "object") return true; // default: all on
  return (settings as UserSettings)[key] !== false; // opt-out model
}

export async function sendFriendRequest(
  prisma: PrismaClient,
  requesterId: string,
  addresseeId: string,
) {
  if (requesterId === addresseeId) {
    throw new BadRequestError("Cannot send friend request to yourself");
  }

  // Check if friendship already exists in either direction
  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId, addresseeId },
        { requesterId: addresseeId, addresseeId: requesterId },
      ],
    },
  });

  if (existing) {
    throw new BadRequestError("Friendship already exists");
  }

  const requester = await prisma.user.findUnique({
    where: { id: requesterId },
    select: { displayName: true, avatarUrl: true },
  });

  const friendship = await prisma.friendship.create({
    data: { requesterId, addresseeId },
  });

  await prisma.notification.create({
    data: {
      userId: addresseeId,
      type: "friend_request",
      payload: {
        friendshipId: friendship.id,
        fromUserId: requesterId,
        fromDisplayName: requester?.displayName ?? "Someone",
        fromAvatarUrl: requester?.avatarUrl,
      },
    },
  });

  // Push notification
  sendPushToUser(prisma, addresseeId, {
    title: "New Friend Request",
    body: `${requester?.displayName ?? "Someone"} wants to be your friend!`,
    url: "/social",
    tag: "friend-request",
  }).catch(() => {});

  return friendship;
}

export async function acceptFriendRequest(
  prisma: PrismaClient,
  userId: string,
  friendshipId: string,
) {
  const friendship = await prisma.friendship.findUnique({
    where: { id: friendshipId },
  });
  if (!friendship) throw new NotFoundError("Friendship");
  if (friendship.addresseeId !== userId) {
    throw new BadRequestError("Not authorized to accept this request");
  }

  const accepter = await prisma.user.findUnique({
    where: { id: userId },
    select: { displayName: true, avatarUrl: true },
  });

  const updated = await prisma.friendship.update({
    where: { id: friendshipId },
    data: { status: "accepted" },
  });

  await prisma.notification.create({
    data: {
      userId: friendship.requesterId,
      type: "friend_accepted",
      payload: {
        friendshipId: friendship.id,
        fromUserId: userId,
        fromDisplayName: accepter?.displayName ?? "Someone",
        fromAvatarUrl: accepter?.avatarUrl,
      },
    },
  });

  // Push notification
  sendPushToUser(prisma, friendship.requesterId, {
    title: "Friend Request Accepted!",
    body: `${accepter?.displayName ?? "Someone"} accepted your friend request`,
    url: "/social",
    tag: "friend-accepted",
  }).catch(() => {});

  return updated;
}

export async function rejectFriendRequest(
  prisma: PrismaClient,
  userId: string,
  friendshipId: string,
) {
  const friendship = await prisma.friendship.findUnique({
    where: { id: friendshipId },
  });
  if (!friendship) throw new NotFoundError("Friendship");
  if (friendship.addresseeId !== userId) {
    throw new BadRequestError("Not authorized to reject this request");
  }

  return prisma.friendship.update({
    where: { id: friendshipId },
    data: { status: "rejected" },
  });
}

export async function removeFriend(
  prisma: PrismaClient,
  userId: string,
  friendshipId: string,
) {
  const friendship = await prisma.friendship.findUnique({
    where: { id: friendshipId },
  });
  if (!friendship) throw new NotFoundError("Friendship");
  if (
    friendship.requesterId !== userId &&
    friendship.addresseeId !== userId
  ) {
    throw new BadRequestError("Not part of this friendship");
  }

  return prisma.friendship.delete({ where: { id: friendshipId } });
}

export async function getFriends(prisma: PrismaClient, userId: string) {
  const friendships = await prisma.friendship.findMany({
    where: {
      status: "accepted",
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    include: {
      requester: { include: { streak: true } },
      addressee: { include: { streak: true } },
    },
  });

  return friendships.map((f: typeof friendships[0]) => {
    const friend =
      f.requesterId === userId ? f.addressee : f.requester;
    return {
      friendshipId: f.id,
      user: {
        id: friend.id,
        displayName: friend.displayName,
        avatarUrl: friend.avatarUrl,
        streak: friend.streak,
      },
    };
  });
}

export async function getFeed(
  prisma: PrismaClient,
  userId: string,
  limit: number,
  cursor?: string,
) {
  // Get friend IDs
  const friendships = await prisma.friendship.findMany({
    where: {
      status: "accepted",
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
  });

  const friendIds = friendships.map((f: typeof friendships[0]) =>
    f.requesterId === userId ? f.addresseeId : f.requesterId,
  );

  // Include own events too
  const userIds = [userId, ...friendIds];

  return prisma.feedEvent.findMany({
    where: {
      userId: { in: userIds },
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getPendingRequests(prisma: PrismaClient, userId: string) {
  const pending = await prisma.friendship.findMany({
    where: { addresseeId: userId, status: "pending" },
    include: {
      requester: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          streak: { select: { currentCount: true, currentApy: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return pending.map((f: typeof pending[0]) => ({
    friendshipId: f.id,
    user: {
      id: f.requester.id,
      displayName: f.requester.displayName,
      avatarUrl: f.requester.avatarUrl,
      streak: f.requester.streak,
    },
    createdAt: f.createdAt,
  }));
}

export async function getSentRequests(prisma: PrismaClient, userId: string) {
  const sent = await prisma.friendship.findMany({
    where: { requesterId: userId, status: "pending" },
    include: {
      addressee: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          streak: { select: { currentCount: true, currentApy: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return sent.map((f: typeof sent[0]) => ({
    friendshipId: f.id,
    user: {
      id: f.addressee.id,
      displayName: f.addressee.displayName,
      avatarUrl: f.addressee.avatarUrl,
      streak: f.addressee.streak,
    },
    createdAt: f.createdAt,
  }));
}

export async function cancelFriendRequest(
  prisma: PrismaClient,
  userId: string,
  friendshipId: string,
) {
  const friendship = await prisma.friendship.findUnique({
    where: { id: friendshipId },
  });
  if (!friendship) throw new NotFoundError("Friendship");
  if (friendship.requesterId !== userId) {
    throw new BadRequestError("Not authorized to cancel this request");
  }
  if (friendship.status !== "pending") {
    throw new BadRequestError("Can only cancel pending requests");
  }

  return prisma.friendship.delete({ where: { id: friendshipId } });
}

export async function getNotifications(prisma: PrismaClient, userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
}

export async function getUnreadCount(prisma: PrismaClient, userId: string) {
  return prisma.notification.count({
    where: { userId, read: false },
  });
}

export async function markNotificationsRead(prisma: PrismaClient, userId: string) {
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}

export async function getFriendsWeeklyProgress(
  prisma: PrismaClient,
  userId: string,
) {
  // Get current week start (Monday)
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  const weekStart = new Date(now);
  weekStart.setUTCDate(weekStart.getUTCDate() - diff);
  weekStart.setUTCHours(0, 0, 0, 0);

  // Get friend IDs
  const friendships = await prisma.friendship.findMany({
    where: {
      status: "accepted",
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
  });
  const friendIds = friendships.map((f: typeof friendships[0]) =>
    f.requesterId === userId ? f.addresseeId : f.requesterId,
  );

  // Include self
  const allIds = [userId, ...friendIds];

  // Get users with their current week activity and streak
  const users = await prisma.user.findMany({
    where: { id: { in: allIds } },
    select: {
      id: true,
      displayName: true,
      avatarUrl: true,
      targetKm: true,
      streak: {
        select: {
          currentCount: true,
          weekSessions: true,
          weekLongestRun: true,
        },
      },
      activities: {
        where: { weekStart },
        select: { distanceKm: true, goalMet: true },
      },
    },
  });

  return users.map((u: typeof users[0]) => {
    const activity = u.activities[0];
    return {
      id: u.id,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      targetKm: u.targetKm,
      isMe: u.id === userId,
      distanceKm: activity?.distanceKm ?? 0,
      goalMet: activity?.goalMet ?? false,
      streakCount: u.streak?.currentCount ?? 0,
      weekSessions: u.streak?.weekSessions ?? 0,
    };
  }).sort((a: { distanceKm: number }, b: { distanceKm: number }) => b.distanceKm - a.distanceKm);
}

// ── Poke ──

const POKE_MESSAGES_NOT_STARTED = [
  "Hey {name}, those shoes aren't gonna run themselves! Time to hit {target}km this week!",
  "{name}! Your running shoes just filed a missing person report. Go save them!",
  "Psst {name}... your streak is getting lonely. {target}km won't run itself!",
  "{name}, the pavement misses you! It told me personally. Go run {target}km!",
  "Breaking news: {name}'s running shoes seen gathering dust. Experts recommend a {target}km rescue mission!",
];

const POKE_MESSAGES_IN_PROGRESS = [
  "{name}, you're at {done}km out of {target}km — so close! Just {left}km more, you got this!",
  "Only {left}km left for {name}! That's basically a warm-up. Let's go!",
  "{name} is {pct}% done with their goal — come on, finish strong!",
  "Hey {name}, {done}km down, {left}km to go. Your streak is counting on you!",
  "{name}, you're crushing it at {done}km! Just a little {left}km sprint to the finish line!",
];

const POKE_MESSAGES_DONE = [
  "{name} already crushed their {target}km goal! Legend! Keep that streak alive!",
  "No poke needed — {name} is already a beast with {done}km this week!",
  "{name} hit their goal! But hey, bonus km = bonus bragging rights!",
];

function pickPokeMessage(
  friendName: string,
  targetKm: number,
  distanceKm: number,
): string {
  const done = distanceKm.toFixed(1);
  const left = Math.max(0, targetKm - distanceKm).toFixed(1);
  const pct = Math.min(100, Math.round((distanceKm / targetKm) * 100));

  let pool: string[];
  if (distanceKm >= targetKm) pool = POKE_MESSAGES_DONE;
  else if (distanceKm > 0.5) pool = POKE_MESSAGES_IN_PROGRESS;
  else pool = POKE_MESSAGES_NOT_STARTED;

  const template = pool[Math.floor(Math.random() * pool.length)];
  return template
    .replace(/{name}/g, friendName)
    .replace(/{target}/g, String(targetKm))
    .replace(/{done}/g, done)
    .replace(/{left}/g, left)
    .replace(/{pct}/g, String(pct));
}

export async function pokeFriend(
  prisma: PrismaClient,
  userId: string,
  friendUserId: string,
) {
  if (userId === friendUserId) throw new BadRequestError("Can't poke yourself!");

  // Verify they are friends
  const friendship = await prisma.friendship.findFirst({
    where: {
      status: "accepted",
      OR: [
        { requesterId: userId, addresseeId: friendUserId },
        { requesterId: friendUserId, addresseeId: userId },
      ],
    },
  });
  if (!friendship) throw new BadRequestError("You can only poke friends");

  // Rate limit: 1 poke per friend per day
  const oneDayAgo = new Date(Date.now() - 86400_000);
  const recentPoke = await prisma.notification.findFirst({
    where: {
      userId: friendUserId,
      type: "poke",
      createdAt: { gte: oneDayAgo },
      payload: { path: ["fromUserId"], equals: userId },
    },
  });
  if (recentPoke) throw new BadRequestError("You already poked them today — give them a chance!");

  // Get poker info
  const poker = await prisma.user.findUnique({
    where: { id: userId },
    select: { displayName: true, avatarUrl: true },
  });

  // Get friend's goal + current week progress
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  const weekStart = new Date(now);
  weekStart.setUTCDate(weekStart.getUTCDate() - diff);
  weekStart.setUTCHours(0, 0, 0, 0);

  const friend = await prisma.user.findUnique({
    where: { id: friendUserId },
    select: {
      displayName: true,
      targetKm: true,
      settings: true,
      activities: {
        where: { weekStart },
        select: { distanceKm: true },
      },
    },
  });
  if (!friend) throw new NotFoundError("User");

  // Respect friend's notification preferences
  if (!getUserSetting(friend.settings, "notifPokes")) {
    return { poked: true, message: `${friend.displayName ?? "Your friend"} has poke notifications turned off` };
  }

  const distanceKm = friend.activities[0]?.distanceKm ?? 0;
  const message = pickPokeMessage(
    friend.displayName ?? "friend",
    friend.targetKm,
    distanceKm,
  );

  await prisma.notification.create({
    data: {
      userId: friendUserId,
      type: "poke",
      payload: {
        fromUserId: userId,
        fromDisplayName: poker?.displayName ?? "Someone",
        fromAvatarUrl: poker?.avatarUrl,
        message,
      },
    },
  });

  // Push notification
  sendPushToUser(prisma, friendUserId, {
    title: `${poker?.displayName ?? "A friend"} poked you!`,
    body: message,
    url: "/social",
    tag: "poke",
  }).catch(() => {});

  return { poked: true, message };
}

export async function getWeeklyLeaderboard(
  prisma: PrismaClient,
  userId: string,
) {
  // Get current week Monday
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  const weekStart = new Date(now);
  weekStart.setUTCDate(weekStart.getUTCDate() - diff);
  weekStart.setUTCHours(0, 0, 0, 0);

  // Get friends
  const friendships = await prisma.friendship.findMany({
    where: { status: "accepted", OR: [{ requesterId: userId }, { addresseeId: userId }] },
  });
  const friendIds = friendships.map((f: typeof friendships[0]) =>
    f.requesterId === userId ? f.addresseeId : f.requesterId,
  );
  const allIds = [userId, ...friendIds];

  const users = await prisma.user.findMany({
    where: { id: { in: allIds } },
    select: {
      id: true, displayName: true, avatarUrl: true, targetKm: true,
      activities: { where: { weekStart }, select: { distanceKm: true, goalMet: true } },
    },
  });

  return users
    .map((u: typeof users[0]) => ({
      id: u.id, displayName: u.displayName, avatarUrl: u.avatarUrl,
      targetKm: u.targetKm, isMe: u.id === userId,
      distanceKm: u.activities[0]?.distanceKm ?? 0,
      goalMet: u.activities[0]?.goalMet ?? false,
    }))
    .sort((a: { distanceKm: number }, b: { distanceKm: number }) => b.distanceKm - a.distanceKm)
    .map((u, i) => ({ ...u, rank: i + 1 }));
}

export async function likeFeedEvent(
  prisma: PrismaClient,
  userId: string,
  eventId: string,
) {
  const event = await prisma.feedEvent.findUnique({ where: { id: eventId } });
  if (!event) throw new NotFoundError("Feed event");

  const likedBy = (event.likedBy as string[]) ?? [];
  if (likedBy.includes(userId)) {
    // Unlike
    return prisma.feedEvent.update({
      where: { id: eventId },
      data: { likes: Math.max(0, event.likes - 1), likedBy: likedBy.filter((id: string) => id !== userId) },
    });
  }
  // Like
  return prisma.feedEvent.update({
    where: { id: eventId },
    data: { likes: event.likes + 1, likedBy: [...likedBy, userId] },
  });
}

export async function getLeaderboard(
  prisma: PrismaClient,
  userId: string,
) {
  // Get friend IDs
  const friendships = await prisma.friendship.findMany({
    where: {
      status: "accepted",
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
  });

  const friendIds = friendships.map((f: typeof friendships[0]) =>
    f.requesterId === userId ? f.addresseeId : f.requesterId,
  );

  const userIds = [userId, ...friendIds];

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    include: { streak: true },
    orderBy: { streak: { currentCount: "desc" } },
  });

  return users.map((u: typeof users[0], i: number) => ({
    rank: i + 1,
    id: u.id,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
    streak: u.streak?.currentCount ?? 0,
    apy: u.streak?.effectiveApy ?? u.streak?.currentApy ?? 4.0,
    isMe: u.id === userId,
  }));
}
