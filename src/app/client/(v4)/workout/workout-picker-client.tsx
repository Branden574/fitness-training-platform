'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Clock, Dumbbell, Play } from 'lucide-react';
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

      {/* Desktop grid */}
      <div
        className="hidden md:grid"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}
      >
        {items.map((w) => {
          const busy = startingId === w.id;
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => start(w.id)}
              disabled={startingId !== null}
              className="mf-card-elev"
              style={{
                padding: 20,
                textAlign: 'left',
                cursor: startingId ? 'default' : 'pointer',
                opacity: startingId && !busy ? 0.6 : 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                border: '1px solid var(--mf-hairline)',
              }}
            >
              <div
                className="flex items-center justify-between"
                style={{ gap: 8 }}
              >
                <div className="mf-eyebrow">{(w.type ?? 'TRAIN').toUpperCase()}</div>
                <Chip kind="default">{(w.difficulty ?? 'BEGINNER').toUpperCase()}</Chip>
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
                {w.title}
              </div>
              {w.description ? (
                <div
                  className="mf-fg-dim"
                  style={{
                    fontSize: 12,
                    lineHeight: 1.5,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
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
                <span className="flex items-center gap-1">
                  <Dumbbell size={12} />
                  {w.exerciseCount} EX
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {w.duration} MIN
                </span>
              </div>
              <div
                className="flex items-center justify-between"
                style={{
                  paddingTop: 12,
                  borderTop: '1px solid var(--mf-hairline)',
                }}
              >
                <span
                  className="mf-font-mono mf-accent"
                  style={{ fontSize: 11, letterSpacing: '0.1em' }}
                >
                  {busy ? 'STARTING…' : 'START SESSION'}
                </span>
                {busy ? null : <ChevronRight size={14} className="mf-accent" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Mobile stacked list */}
      <div
        className="md:hidden"
        style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        {items.map((w) => {
          const busy = startingId === w.id;
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => start(w.id)}
              disabled={startingId !== null}
              className="mf-card"
              style={{
                padding: 14,
                textAlign: 'left',
                cursor: startingId ? 'default' : 'pointer',
                opacity: startingId && !busy ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                border: '1px solid var(--mf-hairline)',
              }}
            >
              <div
                className="grid place-items-center shrink-0"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 6,
                  background: 'var(--mf-surface-3)',
                }}
              >
                <Play size={16} className="mf-accent" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    lineHeight: 1.2,
                    textTransform: 'uppercase',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {w.title}
                </div>
                <div
                  className="mf-font-mono mf-fg-mute"
                  style={{ fontSize: 10, marginTop: 4 }}
                >
                  {w.exerciseCount} EX · {w.duration} MIN ·{' '}
                  {(w.difficulty ?? 'BEGINNER').toUpperCase()}
                </div>
              </div>
              <div className="shrink-0">
                {busy ? (
                  <span
                    className="mf-font-mono mf-accent"
                    style={{ fontSize: 10, letterSpacing: '0.1em' }}
                  >
                    …
                  </span>
                ) : (
                  <ChevronRight size={16} className="mf-fg-mute" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
