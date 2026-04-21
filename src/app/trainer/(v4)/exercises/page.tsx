import { requireTrainerSession } from '@/lib/trainer-data';
import { prisma } from '@/lib/prisma';
import {
  AthletePh,
  Chip,
  DesktopShell,
} from '@/components/ui/mf';
import LibrarySearchClient from './library-search-client';
import FillGifsClient from './fill-gifs-client';
import ExerciseCardActionsClient from './exercise-card-actions-client';
import NewExerciseClient from './new-exercise-client';
import ExerciseCategoryFilterClient, {
  type ExerciseItem,
} from './category-filter-client';

export const dynamic = 'force-dynamic';

function muscleString(mg: unknown): string {
  if (!mg) return '';
  if (Array.isArray(mg)) return mg.map(String).join(', ');
  if (typeof mg === 'string') return mg;
  return String(mg);
}

function equipString(eq: unknown): string {
  if (!eq) return '';
  if (Array.isArray(eq)) return eq.map(String).join(', ');
  if (typeof eq === 'string') return eq;
  return String(eq);
}

export default async function TrainerExercisesPage() {
  await requireTrainerSession();

  const exercises = await prisma.exercise.findMany({
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

  const total = await prisma.exercise.count();
  const missingGifs = await prisma.exercise.count({
    where: { OR: [{ imageUrl: null }, { imageUrl: '' }] },
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

        <ExerciseCategoryFilterClient exercises={items} totalCount={total}>
          {({ filtered }) =>
            filtered.length === 0 ? (
              <div
                className="mf-card mf-fg-mute mf-font-mono"
                style={{
                  padding: 48,
                  textAlign: 'center',
                  fontSize: 12,
                  letterSpacing: '0.1em',
                }}
              >
                NO EXERCISES IN THIS CATEGORY. CLICK &quot;NEW EXERCISE&quot; OR
                IMPORT FROM THE LIBRARY.
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 12,
                }}
              >
                {filtered.map((e) => {
                  const muscles = muscleString(e.muscleGroups);
                  const equip = equipString(e.equipment);
                  const diffLabel = e.difficulty.toString().toUpperCase();
                  const chipKind =
                    e.difficulty === 'ADVANCED'
                      ? 'warn'
                      : e.difficulty === 'INTERMEDIATE'
                        ? 'ok'
                        : 'default';
                  return (
                    <div
                      key={e.id}
                      className="mf-card"
                      style={{ overflow: 'hidden', position: 'relative' }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          zIndex: 2,
                        }}
                      >
                        <ExerciseCardActionsClient
                          id={e.id}
                          name={e.name}
                          difficulty={e.difficulty}
                          imageUrl={e.imageUrl}
                          videoUrl={e.videoUrl}
                          muscleGroups={muscles}
                          equipment={equip}
                        />
                      </div>
                      {e.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={e.imageUrl}
                          alt={e.name}
                          style={{
                            width: '100%',
                            height: 140,
                            objectFit: 'cover',
                            display: 'block',
                            background: 'var(--mf-surface-3)',
                          }}
                        />
                      ) : (
                        <AthletePh
                          label={e.name
                            .split(' ')
                            .slice(0, 2)
                            .join(' ')
                            .toUpperCase()}
                          h={140}
                        />
                      )}
                      <div style={{ padding: 12 }}>
                        <div
                          className="flex items-center justify-between"
                          style={{ marginBottom: 4 }}
                        >
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {e.name}
                          </div>
                          <Chip kind={chipKind}>{diffLabel.slice(0, 3)}</Chip>
                        </div>
                        <div
                          className="mf-font-mono mf-fg-mute"
                          style={{
                            fontSize: 10,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {(muscles || 'UNSPECIFIED').toUpperCase()}
                        </div>
                        {equip && (
                          <div
                            className="mf-font-mono mf-fg-mute"
                            style={{
                              fontSize: 10,
                              marginTop: 2,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {equip.toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          }
        </ExerciseCategoryFilterClient>
      </div>
    </DesktopShell>
  );
}
