'use client';

import { useMemo, useState } from 'react';
import type { Difficulty } from '@prisma/client';
import { AthletePh, Chip } from '@/components/ui/mf';
import ExerciseCardActionsClient from './exercise-card-actions-client';

export interface ExerciseItem {
  id: string;
  name: string;
  difficulty: Difficulty;
  imageUrl: string | null;
  videoUrl: string | null;
  muscleGroups: unknown;
  equipment: unknown;
  description: string | null;
}

type Category = 'ALL' | 'STRENGTH' | 'HYPERTROPHY' | 'CONDITIONING' | 'MOBILITY';
const CATEGORIES: Category[] = [
  'ALL',
  'STRENGTH',
  'HYPERTROPHY',
  'CONDITIONING',
  'MOBILITY',
];

interface Props {
  exercises: ExerciseItem[];
  totalCount: number;
}

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

// All exercise card rendering lives inside this client component so the
// server page only passes plain serializable data (the exercises array +
// totalCount). Previous render-prop pattern crashed with digest
// 4291459032 — React Server Components can't serialize functions across
// the boundary. Same class of bug as the roster crash earlier this week.
export default function ExerciseCategoryFilterClient({
  exercises,
  totalCount,
}: Props) {
  const [active, setActive] = useState<Category>('ALL');

  const counts = useMemo(() => {
    const c: Record<Category, number> = {
      ALL: exercises.length,
      STRENGTH: 0,
      HYPERTROPHY: 0,
      CONDITIONING: 0,
      MOBILITY: 0,
    };
    for (const e of exercises) {
      const desc = (e.description ?? '').toUpperCase();
      if (desc.includes('STRENGTH')) c.STRENGTH += 1;
      if (desc.includes('HYPERTROPHY')) c.HYPERTROPHY += 1;
      if (desc.includes('CONDITIONING')) c.CONDITIONING += 1;
      if (desc.includes('MOBILITY')) c.MOBILITY += 1;
    }
    return c;
  }, [exercises]);

  const filtered = useMemo(() => {
    if (active === 'ALL') return exercises;
    return exercises.filter((e) =>
      (e.description ?? '').toUpperCase().includes(active),
    );
  }, [active, exercises]);

  return (
    <>
      <div
        className="flex items-center gap-3"
        style={{ marginBottom: 16, flexWrap: 'wrap' }}
      >
        <div className="mf-eyebrow" style={{ marginRight: 8 }}>
          LOCAL
        </div>
        <div className="mf-card flex gap-1" style={{ padding: 4 }}>
          {CATEGORIES.map((t) => {
            const isActive = t === active;
            const count = counts[t];
            return (
              <button
                key={t}
                type="button"
                onClick={() => setActive(t)}
                className="mf-font-mono"
                style={{
                  padding: '6px 12px',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  borderRadius: 4,
                  background: isActive ? 'var(--mf-accent)' : 'transparent',
                  color: isActive
                    ? 'var(--mf-accent-ink)'
                    : 'var(--mf-fg-dim)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {t}{' '}
                {t === 'ALL' ? `· ${totalCount}` : count > 0 ? `· ${count}` : ''}
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
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
      )}
    </>
  );
}
