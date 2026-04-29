/**
 * scripts/delete-demo-trainers.ts
 *
 * One-shot cleanup. Deletes the 8 demo trainers seeded by prisma/seed.ts —
 * accounts whose email ends in `@demo.mf`. These were placeholder profiles
 * to populate the directory during early development; they reference photo
 * URLs that were never uploaded, so they 404 in the trainers grid.
 *
 * The `@demo.mf` suffix is unambiguous — no real user has that email
 * domain — so the script can safely run without an explicit allowlist.
 *
 * Usage:
 *   npx tsx scripts/delete-demo-trainers.ts            (preview only — lists users, no changes)
 *   npx tsx scripts/delete-demo-trainers.ts --commit   (actually delete)
 *
 * Idempotent — running twice does nothing on the second pass.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const commit = process.argv.includes('--commit');

  const targets = await prisma.user.findMany({
    where: { email: { endsWith: '@demo.mf' } },
    select: { id: true, email: true, name: true, role: true, trainerSlug: true },
    orderBy: { email: 'asc' },
  });

  if (targets.length === 0) {
    console.log('No @demo.mf users found. Already clean.');
    return;
  }

  console.log(`Found ${targets.length} demo user(s):`);
  for (const u of targets) {
    console.log(
      `  - ${u.name ?? '(no name)'} <${u.email}> · role=${u.role}` +
        (u.trainerSlug ? ` · slug=${u.trainerSlug}` : ''),
    );
  }

  if (!commit) {
    console.log(
      '\n💡 PREVIEW MODE — no users were deleted. Re-run with `--commit` to actually delete.',
    );
    return;
  }

  // Delete by exact id list. Cascades handle related rows (sessions,
  // messages, workout sessions, etc.) per the @relation onDelete: Cascade
  // directives in prisma/schema.prisma.
  const result = await prisma.user.deleteMany({
    where: { id: { in: targets.map((u) => u.id) } },
  });

  console.log(`\n✅ Deleted ${result.count} user(s).`);
}

main()
  .catch((err) => {
    console.error('❌ Script failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
