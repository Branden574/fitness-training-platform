import 'server-only';
import type { PrismaClient, Trainer } from '@prisma/client';

/**
 * Auto-create a Trainer row for a TRAINER/ADMIN user if they don't have one.
 * Matches the Phase 1 ensureTrainerIdentity pattern: safe to call multiple
 * times, returns the current Trainer row.
 */
export async function ensureTrainerRow(
  userId: string,
  prisma: PrismaClient,
): Promise<Trainer> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, trainer: { select: { id: true } } },
  });
  if (!user) throw new Error('User not found');
  if (user.role !== 'TRAINER' && user.role !== 'ADMIN') {
    throw new Error('Only trainers or admins can have a Trainer row');
  }
  if (user.trainer) {
    return prisma.trainer.findUniqueOrThrow({ where: { userId } });
  }
  return prisma.trainer.create({ data: { userId } });
}
