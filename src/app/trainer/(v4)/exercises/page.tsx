import { requireTrainerSession } from '@/lib/trainer-data';
import { prisma } from '@/lib/prisma';
import { visibleExercisesFilter } from '@/lib/exerciseScope';
import { DesktopShell } from '@/components/ui/mf';
import LibrarySearchClient from './library-search-client';
import FillGifsClient from './fill-gifs-client';
import NewExerciseClient from './new-exercise-client';
import ExerciseCategoryFilterClient, {
  type ExerciseItem,
} from './category-filter-client';

export const dynamic = 'force-dynamic';

export default async function TrainerExercisesPage() {
  const session = await requireTrainerSession();

  // Trainers see the shared stock library (createdByUserId = null) merged
  // with their own custom exercises. Other trainers' customs stay private.
  const scope = visibleExercisesFilter({
    id: session.user.id,
    role: session.user.role as 'CLIENT' | 'TRAINER' | 'ADMIN',
  });

  const exercises = await prisma.exercise.findMany({
    where: scope,
    orderBy: { name: 'asc' },
    take: 120,
    select: {
      id: true,
      name: true,
      difficulty: true,
      imageUrl: true,
      videoUrl: true,
      muscleGroups: true,
      equipment: true,
      description: true,
    },
  });

  const total = await prisma.exercise.count({ where: scope });
  const missingGifs = await prisma.exercise.count({
    where: {
      AND: [scope, { OR: [{ imageUrl: null }, { imageUrl: '' }] }],
    },
  });

  const items: ExerciseItem[] = exercises.map((e) => ({
    id: e.id,
    name: e.name,
    difficulty: e.difficulty,
    imageUrl: e.imageUrl,
    videoUrl: e.videoUrl,
    muscleGroups: e.muscleGroups,
    equipment: e.equipment,
    description: e.description,
  }));

  // The server page only passes serializable props — the category filter AND
  // the card grid both live inside ExerciseCategoryFilterClient, which is a
  // 'use client' component. No render-prop children across the RSC boundary
  // (that was the 4291459032 crash).
  return (
    <DesktopShell
      role="trainer"
      active="exercises"
      title="Exercise Library"
      breadcrumbs="TRAINER / EXERCISES"
      headerRight={<NewExerciseClient />}
    >
      <div style={{ padding: 24, maxWidth: 1400 }}>
        <LibrarySearchClient />
        <FillGifsClient missingCount={missingGifs} totalCount={total} />
        <ExerciseCategoryFilterClient exercises={items} totalCount={total} />
      </div>
    </DesktopShell>
  );
}
