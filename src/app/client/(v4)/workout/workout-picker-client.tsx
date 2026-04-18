'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Dumbbell } from 'lucide-react';
import { Chip } from '@/components/ui/mf';

export interface WorkoutPickerItem {
  id: string;
  title: string;
  description: string | null;
  difficulty: string;
  type: string;
  duration: number;
  exerciseCount: number;
}

export default function WorkoutPickerClient({
  items,
}: {
  items: WorkoutPickerItem[];
}) {
  const router = useRouter();
  const [startingId, setStartingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start(workoutId: string) {
    if (startingId) return;
    setStartingId(workoutId);
    setError(null);
    try {
      const res = await fetch('/api/client/workout/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workoutId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        sessionId?: string;
        error?: string;
      };
      if (!res.ok || !data.sessionId) {
        setError(data.error ?? 'Could not start workout.');
        setStartingId(null);
        return;
      }
      router.push(`/client/workout/${data.sessionId}`);
      router.refresh();
    } catch {
      setError('Network error. Try again.');
      setStartingId(null);
    }
  }

  return (
    <div>
      {error && (
        <div
          className="mf-chip mf-chip-bad"
          style={{
            height: 'auto',
            padding: '8px 12px',
            display: 'block',
            marginBottom: 12,
          }}
        >
          {error}
        </div>
      )}

      {/* Single uniform grid: mobile stacks, expands across full desktop width */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 w-full">
        {items.map((w) => {
          const busy = startingId === w.id;
          const dimmed = startingId !== null && !busy;
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => start(w.id)}
              disabled={startingId !== null}
              className="mf-card"
              style={{
                padding: 20,
                textAlign: 'left',
                cursor: startingId ? 'default' : 'pointer',
                opacity: dimmed ? 0.6 : 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                minHeight: 200,
                width: '100%',
                border: '1px solid var(--mf-hairline)',
                transition: 'border-color 120ms, background 120ms',
              }}
            >
              <div className="mf-eyebrow">
                {(w.type ?? 'TRAIN').toUpperCase()}
              </div>
              <div
                className="mf-font-display"
                style={{
                  fontSize: 20,
                  lineHeight: 1.1,
                  letterSpacing: '-0.01em',
                  textTransform: 'uppercase',
                }}
              >
                {busy ? 'STARTING…' : w.title}
              </div>
              {w.description ? (
                <div
                  className="mf-fg-dim"
                  style={{
                    fontSize: 12,
                    lineHeight: 1.5,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {w.description}
                </div>
              ) : null}
              <div
                className="flex items-center gap-3 mf-font-mono mf-fg-mute"
                style={{ fontSize: 11, marginTop: 'auto' }}
              >
                <Chip kind="default">
                  {(w.difficulty ?? 'BEGINNER').toUpperCase()}
                </Chip>
                <span className="flex items-center gap-1">
                  <Dumbbell size={12} />
                  {w.exerciseCount} EX
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {w.duration} MIN
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
