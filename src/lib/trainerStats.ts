import 'server-only';
import type { PrismaClient } from '@prisma/client';

export interface TrainerStats {
  activeClients: number;
  prsThisYear: number;
  yearsOnPlatform: number;
}

/**
 * Computed read-only stats for a trainer's public profile. Returns null if
 * the user isn't found. activeClients may be 0 for brand-new trainers.
 */
export async function computeTrainerStats(
  trainerUserId: string,
  prisma: PrismaClient,
): Promise<TrainerStats | null> {
  const user = await prisma.user.findUnique({
    where: { id: trainerUserId },
    select: { createdAt: true },
  });
  if (!user) return null;

  const activeClients = await prisma.user.count({
    where: { trainerId: trainerUserId, isActive: true, role: 'CLIENT' },
  });

  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const prsThisYearRows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) AS count
    FROM (
      SELECT
        wp."userId",
        wp."exerciseId",
        wp.weight,
        wp."date",
        LAG(MAX(wp.weight)) OVER (
          PARTITION BY wp."userId", wp."exerciseId"
          ORDER BY wp."date"
        ) AS prior_max
      FROM "workout_progress" wp
      JOIN "users" u ON u.id = wp."userId"
      WHERE u."trainerId" = ${trainerUserId}
        AND wp.weight IS NOT NULL
        AND wp."date" >= ${yearStart}
      GROUP BY wp."userId", wp."exerciseId", wp.weight, wp."date"
    ) s
    WHERE s.weight > COALESCE(s.prior_max, 0)
  `;
  const prsThisYear = Number(prsThisYearRows[0]?.count ?? BigInt(0));

  const yearsOnPlatform = Math.max(
    0,
    new Date().getFullYear() - user.createdAt.getFullYear(),
  );

  return { activeClients, prsThisYear, yearsOnPlatform };
}
