/**
 * Demo seed: populate Activity records so the challenge consistency grid +
 * weekly-participation chart show something interesting.
 *
 * For each ChallengeMember, generates one Activity row per past week of the
 * challenge with a randomized distance that "usually" meets the goal — biased
 * by user, so some members are way more consistent than others.
 */
import { PrismaClient } from "@prisma/client";

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

// Stable per-user "consistency rate" so each member has a different pattern
function consistencyRate(userId: string): number {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0;
  return 0.45 + ((h % 100) / 100) * 0.5; // 0.45..0.95
}

function rng(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function main() {
  const prisma = new PrismaClient();
  const challenges = await prisma.challenge.findMany({
    include: { members: true },
  });
  const now = Date.now();
  let created = 0;
  let skipped = 0;

  for (const c of challenges) {
    const weeks = weeksBetween(c.startDate, c.endDate);
    for (const m of c.members) {
      const rate = consistencyRate(m.userId);
      const r = rng(`${m.userId}|${c.id}`);
      for (const w of weeks) {
        if (w.getTime() + 7 * 86400_000 > now) continue; // not past yet
        // Hit goal at `rate` probability; either way pick a distance
        const hit = r() < rate;
        const goal = c.goalKmWeek;
        const distance = hit
          ? goal + r() * goal * 0.3
          : r() * goal * 0.9;
        try {
          await prisma.activity.upsert({
            where: { userId_weekStart: { userId: m.userId, weekStart: w } },
            create: {
              userId: m.userId,
              weekStart: w,
              distanceKm: Math.round(distance * 10) / 10,
              source: "manual",
              goalMet: hit,
            },
            update: {
              distanceKm: Math.round(distance * 10) / 10,
              goalMet: hit,
            },
          });
          created += 1;
        } catch {
          skipped += 1;
        }
      }
    }
  }

  console.log(`Done. Upserted ${created} activities, skipped ${skipped}.`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
