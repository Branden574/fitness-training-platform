// scripts/backfill-trainer-client-status.ts
//
// One-shot, idempotent. Maps existing `trainerAcceptingClients=false` rows to
// trainerClientStatus=WAITLIST so that today's externally-visible behavior
// (the directory pill rendered "waitlist" for `false`) is preserved.
//
// Run locally with prod DATABASE_URL set:
//   npx tsx scripts/backfill-trainer-client-status.ts
//
// Safe to run multiple times: only updates rows where status is still the
// default ACCEPTING but the legacy boolean is false.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.user.updateMany({
    where: {
      trainerAcceptingClients: false,
      trainerClientStatus: 'ACCEPTING',
    },
    data: {
      trainerClientStatus: 'WAITLIST',
    },
  });

  console.log(`Backfilled ${result.count} trainer(s) → WAITLIST.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
