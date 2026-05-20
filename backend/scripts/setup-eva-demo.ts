/**
 * Demo setup: turn the "Eva" account into a credible POV for a leaderboard
 * demo by tuning her friends' streaks and making sure they're all connected.
 *
 *   Talam D. → 3-week streak
 *   Louis D. → 18-week streak (caps the streak component of the score)
 *   Emma D.  → 8-week streak
 *
 * Friendships: every pair (Eva ↔ each friend) is forced to status="accepted",
 * regardless of whether anything existed before (pending request, no row at
 * all, or the friendship is sitting on the other side).
 *
 * Idempotent: re-running just re-asserts the same state.
 */
import { PrismaClient } from "@prisma/client";

interface FriendSpec {
  displayName: string;
  streakCount: number;
  weekSessions: number;
  weekLongestRunKm: number;
}

const EVA_NAME = "Eva";
const FRIENDS: FriendSpec[] = [
  { displayName: "Talam D.", streakCount: 3, weekSessions: 3, weekLongestRunKm: 12 },
  { displayName: "Louis D.", streakCount: 18, weekSessions: 4, weekLongestRunKm: 18 },
  { displayName: "Emma D.", streakCount: 8, weekSessions: 3, weekLongestRunKm: 14 },
];

async function main() {
  const prisma = new PrismaClient();

  const eva = await prisma.user.findFirst({ where: { displayName: EVA_NAME }, include: { streak: true } });
  if (!eva) {
    console.error(`Eva account not found (looking for displayName = "${EVA_NAME}")`);
    process.exit(1);
  }
  console.log(`Eva: id=${eva.id} · current streak ${eva.streak?.currentCount ?? "(none)"}`);

  for (const spec of FRIENDS) {
    const friend = await prisma.user.findFirst({ where: { displayName: spec.displayName } });
    if (!friend) {
      console.error(`  ! ${spec.displayName} not found — skipping`);
      continue;
    }

    // 1) Streak update (creates the row if it doesn't exist yet)
    await prisma.streak.upsert({
      where: { userId: friend.id },
      create: {
        userId: friend.id,
        currentCount: spec.streakCount,
        longestCount: spec.streakCount,
        lastWeekMet: true,
        weekSessions: spec.weekSessions,
        weekLongestRun: spec.weekLongestRunKm,
      },
      update: {
        currentCount: spec.streakCount,
        longestCount: { set: Math.max(0, spec.streakCount) },
        lastWeekMet: true,
        weekSessions: spec.weekSessions,
        weekLongestRun: spec.weekLongestRunKm,
      },
    });
    // longest may have been higher already; fetch + max to be safe
    const cur = await prisma.streak.findUnique({ where: { userId: friend.id } });
    if (cur && cur.longestCount < cur.currentCount) {
      await prisma.streak.update({ where: { userId: friend.id }, data: { longestCount: cur.currentCount } });
    }

    // 2) Friendship: collapse any existing row (either direction) into a single
    //    accepted relationship, recreating if necessary.
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: eva.id, addresseeId: friend.id },
          { requesterId: friend.id, addresseeId: eva.id },
        ],
      },
    });
    if (existing) {
      await prisma.friendship.update({
        where: { id: existing.id },
        data: { status: "accepted" },
      });
    } else {
      await prisma.friendship.create({
        data: { requesterId: eva.id, addresseeId: friend.id, status: "accepted" },
      });
    }

    console.log(`  ✓ ${spec.displayName.padEnd(10)} streak=${spec.streakCount}  friendship=accepted`);
  }

  await prisma.$disconnect();
  console.log("---");
  console.log("Done. Run backfill-pool-apy.ts next to refresh activityScore + effective APY.");
}

main().catch((e) => { console.error(e); process.exit(1); });
