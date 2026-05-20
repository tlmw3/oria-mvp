/**
 * One-off cleanup: drop preset SVG avatars from existing users so the profile
 * surface falls back to the neutral silhouette placeholder. Uploaded photos
 * (base64 data URLs) are kept untouched.
 *
 * "Preset" = anything that points at a static path or external URL, e.g.
 *   /avatars/avatar-1.svg, https://example.com/foo.png. Uploaded photos start
 * with data:image/... so they survive.
 */
import { PrismaClient } from "@prisma/client";

function isUploadedPhoto(url: string): boolean {
  return url.startsWith("data:image/");
}

async function main() {
  const prisma = new PrismaClient();
  const users = await prisma.user.findMany({
    where: { avatarUrl: { not: null } },
    select: { id: true, displayName: true, avatarUrl: true },
  });

  let cleared = 0;
  let kept = 0;
  for (const u of users) {
    const url = u.avatarUrl ?? "";
    if (isUploadedPhoto(url)) {
      kept += 1;
      continue;
    }
    await prisma.user.update({ where: { id: u.id }, data: { avatarUrl: null } });
    console.log(`cleared: ${u.displayName ?? "(no name)"} ← ${url.slice(0, 60)}${url.length > 60 ? "…" : ""}`);
    cleared += 1;
  }

  console.log(`---`);
  console.log(`Done. Cleared ${cleared} preset avatars, kept ${kept} uploaded photos.`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
