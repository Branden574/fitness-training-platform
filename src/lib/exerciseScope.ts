import 'server-only';
import type { Prisma } from '@prisma/client';

/**
 * Prisma where-clause fragment that scopes an Exercise query to what the
 * given user is allowed to see.
 *
 * - Null `createdByUserId` rows are the stock / shared library (seeded from
 *   free-exercise-db) and are visible to every trainer.
 * - Rows with a `createdByUserId` are private custom exercises belonging to
 *   that specific trainer.
 * - Admins see everything.
 */
export function visibleExercisesFilter(user: {
  id: string;
  role: 'CLIENT' | 'TRAINER' | 'ADMIN';
}): Prisma.ExerciseWhereInput {
  if (user.role === 'ADMIN') return {};
  return {
    OR: [
      { createdByUserId: null },
      { createdByUserId: user.id },
    ],
  };
}

/**
 * Returns true when `user` is allowed to mutate the given exercise —
 * admins can mutate anything, trainers can only mutate exercises they
 * personally created. Shared/stock exercises (createdByUserId = null)
 * are admin-only.
 */
export function canMutateExercise(
  user: { id: string; role: 'CLIENT' | 'TRAINER' | 'ADMIN' },
  exercise: { createdByUserId: string | null },
): boolean {
  if (user.role === 'ADMIN') return true;
  if (user.role !== 'TRAINER') return false;
  return exercise.createdByUserId === user.id;
}
