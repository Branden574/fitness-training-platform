'use client';

import { useMemo, useState, type ReactNode } from 'react';
import type { Difficulty } from '@prisma/client';

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
  children: (args: { filtered: ExerciseItem[] }) => ReactNode;
}

export default function ExerciseCategoryFilterClient({
  exercises,
  totalCount,
  children,
}: Props) {
  const [active, setActive] = useState<Category>('ALL');

  // Per-category counts for the tab labels. Memoized so changing category
  // doesn't force the reducer to rerun.
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

      {children({ filtered })}
    </>
  );
}
