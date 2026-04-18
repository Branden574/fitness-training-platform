import { Plus } from 'lucide-react';
import { requireTrainerSession } from '@/lib/trainer-data';
import { prisma } from '@/lib/prisma';
import {
  AthletePh,
  Btn,
  Chip,
  DesktopShell,
} from '@/components/ui/mf';

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

const CATEGORIES = ['ALL', 'STRENGTH', 'HYPERTROPHY', 'CONDITIONING', 'MOBILITY'] as const;

export default async function TrainerExercisesPage() {
  await requireTrainerSession();

  const exercises = await prisma.exercise.findMany({
    orderBy: { name: 'asc' },
    take: 120,
  });

  const total = await prisma.exercise.count();

  return (
    <DesktopShell
      role="trainer"
      active="exercises"
      title="Exercise Library"
      breadcrumbs="TRAINER / EXERCISES"
      headerRight={<Btn variant="primary" icon={Plus}>New exercise</Btn>}
    >
      <div style={{ padding: 24, maxWidth: 1400 }}>
        <div className="flex items-center gap-3" style={{ marginBottom: 16 }}>
          <div className="mf-card flex gap-1" style={{ padding: 4 }}>
            {CATEGORIES.map((t, i) => {
              const active = i === 0;
              return (
                <button
                  key={t}
                  className="mf-font-mono"
                  style={{
                    padding: '6px 12px',
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    borderRadius: 4,
                    background: active ? 'var(--mf-accent)' : 'transparent',
                    color: active ? 'var(--mf-accent-ink)' : 'var(--mf-fg-dim)',
                    border: 'none',
                    cursor: 'default',
                  }}
                >
                  {t} {t === 'ALL' ? `· ${total}` : ''}
                </button>
              );
            })}
          </div>
        </div>

        {exercises.length === 0 ? (
          <div
            className="mf-card mf-fg-mute mf-font-mono"
            style={{
              padding: 48,
              textAlign: 'center',
              fontSize: 12,
              letterSpacing: '0.1em',
            }}
          >
            NO EXERCISES YET. SEED THE LIBRARY OR CLICK &quot;NEW EXERCISE&quot;.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {exercises.map((e) => {
              const muscles = muscleString(e.muscleGroups);
              const equip = equipString(e.equipment);
              const diffLabel = e.difficulty.toString().toUpperCase();
              const chipKind =
                e.difficulty === 'ADVANCED' ? 'warn' : e.difficulty === 'INTERMEDIATE' ? 'ok' : 'default';
              return (
                <div key={e.id} className="mf-card" style={{ overflow: 'hidden' }}>
                  <AthletePh
                    label={e.name.split(' ').slice(0, 2).join(' ').toUpperCase()}
                    h={140}
                  />
                  <div style={{ padding: 12 }}>
                    <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
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
        )}
      </div>
    </DesktopShell>
  );
}
