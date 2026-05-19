/**
 * One-off backfill: for every Activity row with goalMet=true that doesn't
 * already have a matching FeedEvent (same userId + same weekStart), create
 * a "goal_met" event so existing seeded data shows up in the new dashboard
 * Activity feed.
 *
 * Idempotent: re-running won't duplicate events.
 */
import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  const wins = await prisma.activity.findMany({
    where: { goalMet: true },
    select: { userId: true, weekStart: true, distanceKm: true },
    orderBy: { weekStart: "desc" },
  });

  let created = 0, skipped = 0;
  for (const a of wins) {
    const iso = a.weekStart.toISOString();
    const existing = await prisma.feedEvent.findFirst({
      where: {
        userId: a.userId,
        eventType: "goal_met",
        // Json column — Prisma can filter on path equality
        payload: { path: ["weekStart"], equals: iso },
      },
      select: { id: true },
    });
    if (existing) { skipped += 1; continue; }
    await prisma.feedEvent.create({
      data: {
        userId: a.userId,
        eventType: "goal_met",
        payload: { weekStart: iso, distanceKm: a.distanceKm },
        // pin createdAt to the end of that week so the feed orders chronologically
        createdAt: new Date(a.weekStart.getTime() + 6 * 86400_000),
      },
    });
    created += 1;
  }
  console.log(`Done. Created ${created} feed events, skipped ${skipped} duplicates.`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
