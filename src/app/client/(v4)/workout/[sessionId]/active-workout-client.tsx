'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Plus, Minus, Check, X, ChevronRight, MoreHorizontal, Video } from 'lucide-react';
import { Chip } from '@/components/ui/mf';
import { Btn } from '@/components/ui/mf';

interface ExerciseDef {
  id: string;
  exerciseId: string;
  name: string;
  targetSets: number;
  targetReps: number;
  targetWeight: number | null;
  restSeconds: number;
  order: number;
  muscleGroup: string;
  imageUrl?: string | null;
  previous: { weight: number | null; reps: number | null; sets: number | null } | null;
}

interface FormVideo {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  embedUrl: string;
}

interface InitialPayload {
  id: string;
  completed: boolean;
  startedAt: string;
  workout: {
    id: string;
    title: string;
    type: string;
    difficulty: string;
    duration: number;
    exercises: ExerciseDef[];
  };
}

interface SetLog {
  setNum: number;
  reps: number;
  weight: number;
  rpe: number | null;
  done: boolean;
}

const RPE_VALUES = [6, 6.5, 7, 7.5, 8, 8.5, 9] as const;

export default function ActiveWorkoutClient({ initial }: { initial: InitialPayload }) {
  const router = useRouter();
  const [exerciseIdx, setExerciseIdx] = useState(0);
  const [logsByExercise, setLogsByExercise] = useState<Record<string, SetLog[]>>(() =>
    Object.fromEntries(
      initial.workout.exercises.map((e) => [
        e.id,
        Array.from({ length: e.targetSets }, (_, i) => ({
          setNum: i + 1,
          reps: e.previous?.reps ?? e.targetReps,
          weight: e.previous?.weight ?? e.targetWeight ?? 0,
          rpe: null,
          done: false,
        })),
      ]),
    ),
  );
  const [activeSetIdx, setActiveSetIdx] = useState(0);
  const [rest, setRest] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prs, setPrs] = useState<Array<{ exerciseName: string; newWeight: number; previousWeight: number | null }> | null>(null);
  const [formVideoOpen, setFormVideoOpen] = useState(false);
  const [formVideo, setFormVideo] = useState<FormVideo | null>(null);
  const [formVideoLoading, setFormVideoLoading] = useState(false);
  const [formVideoError, setFormVideoError] = useState<string | null>(null);

  const startedAtMs = useRef(Date.now() - (Date.now() - new Date(initial.startedAt).getTime()));

  // Total elapsed timer
  useEffect(() => {
    const id = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startedAtMs.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Rest countdown
  useEffect(() => {
    if (rest <= 0) return;
    const id = setInterval(() => setRest((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [rest]);

  const currentExercise = initial.workout.exercises[exerciseIdx]!;
  const currentLogs = logsByExercise[currentExercise.id]!;
  const activeSet = currentLogs[activeSetIdx]!;

  function mutateSet(partial: Partial<SetLog>) {
    setLogsByExercise((prev) => {
      const copy = { ...prev };
      const arr = [...copy[currentExercise.id]!];
      arr[activeSetIdx] = { ...arr[activeSetIdx]!, ...partial };
      copy[currentExercise.id] = arr;
      return copy;
    });
  }

  async function openFormVideo() {
    setFormVideoOpen(true);
    setFormVideo(null);
    setFormVideoError(null);
    setFormVideoLoading(true);
    try {
      const res = await fetch(
        `/api/exercises/form-video?name=${encodeURIComponent(currentExercise.name)}`,
      );
      if (res.status === 404) {
        setFormVideoError('No form video available for this exercise.');
        return;
      }
      if (res.status === 503) {
        setFormVideoError('Form video lookup is not configured on the server.');
        return;
      }
      if (!res.ok) {
        setFormVideoError('Could not load form video. Try again later.');
        return;
      }
      const data = (await res.json()) as FormVideo;
      setFormVideo(data);
    } catch {
      setFormVideoError('Network error while loading form video.');
    } finally {
      setFormVideoLoading(false);
    }
  }

  function completeSet() {
    mutateSet({ done: true });
    const nextSet = activeSetIdx + 1;
    if (nextSet < currentLogs.length) {
      setActiveSetIdx(nextSet);
      setRest(currentExercise.restSeconds);
    } else {
      // Move to next exercise automatically
      const nextEx = exerciseIdx + 1;
      if (nextEx < initial.workout.exercises.length) {
        setExerciseIdx(nextEx);
        setActiveSetIdx(0);
        setRest(currentExercise.restSeconds);
      } else {
        // Last set of last exercise — no rest needed
        setRest(0);
      }
    }
  }

  async function handleFinish() {
    setFinishing(true);
    setError(null);
    try {
      // Aggregate completed sets per exercise into a single WorkoutProgress row
      const payload = initial.workout.exercises
        .map((ex) => {
          const logs = logsByExercise[ex.id]!.filter((s) => s.done);
          if (!logs.length) return null;
          const maxWeight = Math.max(...logs.map((s) => s.weight || 0));
          const totalReps = logs.reduce((a, s) => a + s.reps, 0);
          return {
            exerciseId: ex.exerciseId,
            sets: logs.length,
            reps: logs[0]!.reps,
            weight: maxWeight,
            notes: `Sets: ${logs
              .map((s) => `${s.weight}×${s.reps}${s.rpe ? ` @${s.rpe}` : ''}`)
              .join(', ')} · total reps ${totalReps}`,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      let detectedPrs: Array<{ exerciseName: string; newWeight: number; previousWeight: number | null }> = [];
      if (payload.length > 0) {
        const res = await fetch('/api/workout-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workoutSessionId: initial.id,
            exercises: payload.map((p) => ({
              ...p,
              exerciseName: initial.workout.exercises.find((e) => e.exerciseId === p.exerciseId)?.name,
            })),
          }),
        });
        if (!res.ok) throw new Error('Could not save progress');
        const data = (await res.json()) as {
          prs?: Array<{ exerciseName: string; newWeight: number; previousWeight: number | null }>;
        };
        detectedPrs = data.prs ?? [];
      }

      const patch = await fetch('/api/workout-sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: initial.id,
          completed: true,
          endTime: new Date().toISOString(),
        }),
      });
      if (!patch.ok) throw new Error('Could not close session');

      if (detectedPrs.length > 0) {
        setPrs(detectedPrs);
        // Brief celebration, then redirect
        setTimeout(() => router.push('/client'), 3200);
      } else {
        router.push('/client');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setFinishing(false);
    }
  }

  const doneSets = currentLogs.filter((s) => s.done).length;
  const totalVolume = Object.values(logsByExercise)
    .flat()
    .filter((s) => s.done)
    .reduce((acc, s) => acc + s.weight * s.reps, 0);

  const mins = Math.floor(rest / 60);
  const secs = rest % 60;
  const elapsedM = Math.floor(elapsedSec / 60);
  const elapsedS = elapsedSec % 60;

  return (
    <main
      className="flex flex-col md:hidden"
      style={{
        height: '100vh',
        position: 'relative',
        paddingBottom: 76,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between shrink-0"
        style={{
          padding: '8px 16px',
          borderBottom: '1px solid var(--mf-hairline)',
        }}
      >
        <button
          onClick={() => router.push('/client')}
          className="mf-btn mf-btn-ghost"
          style={{ height: 32, width: 32, padding: 0 }}
          aria-label="Exit"
        >
          <ChevronLeft size={16} />
        </button>
        <div style={{ textAlign: 'center' }}>
          <div className="mf-eyebrow">
            {initial.workout.title.toUpperCase()} · EXERCISE {exerciseIdx + 1}/
            {initial.workout.exercises.length}
          </div>
          <div style={{ fontSize: 12, fontWeight: 600 }}>
            {String(elapsedM).padStart(2, '0')}:{String(elapsedS).padStart(2, '0')} ELAPSED
          </div>
        </div>
        <button
          className="mf-btn mf-btn-ghost"
          style={{ height: 32, width: 32, padding: 0 }}
          aria-label="More"
        >
          <MoreHorizontal size={16} />
        </button>
      </div>

      {/* Rest banner */}
      {rest > 0 && (
        <div
          style={{
            background: 'var(--mf-accent)',
            color: 'var(--mf-accent-ink)',
            padding: '12px 16px',
            flexShrink: 0,
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div
                className="mf-font-mono"
                style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.7 }}
              >
                REST
              </div>
              <div
                className="mf-font-display mf-tnum"
                style={{ fontSize: 36, lineHeight: 1 }}
              >
                {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
              </div>
            </div>
            <button
              onClick={() => setRest(0)}
              className="mf-btn"
              style={{
                height: 36,
                padding: '0 12px',
                background: '#0A0A0B',
                borderColor: '#0A0A0B',
                color: '#fff',
              }}
            >
              <X size={14} /> SKIP
            </button>
          </div>
        </div>
      )}

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ padding: '12px 16px 12px' }}>
          <div className="flex items-start justify-between">
            <div>
              <div className="mf-eyebrow">
                EXERCISE{currentExercise.muscleGroup ? ` · ${currentExercise.muscleGroup.toUpperCase()}` : ''}
              </div>
              <div
                className="mf-font-display"
                style={{
                  fontSize: 26,
                  lineHeight: 0.95,
                  letterSpacing: '-0.01em',
                  marginTop: 4,
                  textTransform: 'uppercase',
                }}
              >
                {currentExercise.name}
              </div>
            </div>
            <button
              onClick={openFormVideo}
              className="mf-btn mf-btn-ghost"
              style={{ height: 32, width: 32, padding: 0 }}
              aria-label="Form video"
            >
              <Video size={16} />
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap" style={{ marginTop: 6 }}>
            <Chip>
              TARGET · {currentExercise.targetSets}×{currentExercise.targetReps}
              {currentExercise.targetWeight ? ` @ ${currentExercise.targetWeight} LB` : ''}
            </Chip>
            {currentExercise.previous?.weight ? (
              <Chip>
                LAST · {currentExercise.previous.sets ?? ''}×{currentExercise.previous.reps ?? ''}
                {currentExercise.previous.weight ? ` @ ${currentExercise.previous.weight}` : ''}
              </Chip>
            ) : null}
          </div>
        </div>

        {/* Exercise demo GIF */}
        {currentExercise.imageUrl ? (
          <div style={{ padding: '0 16px 12px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentExercise.imageUrl}
              alt={currentExercise.name}
              style={{
                width: '100%',
                aspectRatio: '1 / 1',
                objectFit: 'cover',
                borderRadius: 6,
                display: 'block',
                background: 'var(--mf-surface-3)',
              }}
            />
          </div>
        ) : null}

        {/* Scoreboard — current set */}
        <div style={{ padding: '0 16px 16px' }}>
          <div
            className="mf-card-elev"
            style={{ padding: 16, borderColor: 'var(--mf-accent)' }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
              <div className="mf-eyebrow">
                SET {activeSetIdx + 1} / {currentLogs.length}
              </div>
              <div className="flex gap-1">
                {currentLogs.map((s, i) => (
                  <div
                    key={i}
                    style={{
                      width: 20,
                      height: 4,
                      borderRadius: 2,
                      background: s.done
                        ? 'var(--mf-accent)'
                        : i === activeSetIdx
                          ? 'var(--mf-fg)'
                          : 'var(--mf-hairline-strong)',
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 items-center">
              <div>
                <div
                  className="mf-eyebrow flex items-center justify-between"
                  style={{ marginBottom: 8 }}
                >
                  <span>WEIGHT</span>
                  <span className="mf-font-mono">LB</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => mutateSet({ weight: Math.max(0, activeSet.weight - 5) })}
                    className="mf-btn"
                    style={{ height: 40, width: 40, padding: 0 }}
                    aria-label="Decrease weight"
                  >
                    <Minus size={16} />
                  </button>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div
                      className="mf-font-display mf-tnum mf-accent"
                      style={{ fontSize: 40, lineHeight: 1 }}
                    >
                      {activeSet.weight}
                    </div>
                  </div>
                  <button
                    onClick={() => mutateSet({ weight: activeSet.weight + 5 })}
                    className="mf-btn"
                    style={{ height: 40, width: 40, padding: 0 }}
                    aria-label="Increase weight"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              <div>
                <div
                  className="mf-eyebrow flex items-center justify-between"
                  style={{ marginBottom: 8 }}
                >
                  <span>REPS</span>
                  <span className="mf-font-mono">×</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => mutateSet({ reps: Math.max(0, activeSet.reps - 1) })}
                    className="mf-btn"
                    style={{ height: 40, width: 40, padding: 0 }}
                    aria-label="Decrease reps"
                  >
                    <Minus size={16} />
                  </button>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div
                      className="mf-font-display mf-tnum"
                      style={{ fontSize: 40, lineHeight: 1 }}
                    >
                      {activeSet.reps}
                    </div>
                  </div>
                  <button
                    onClick={() => mutateSet({ reps: activeSet.reps + 1 })}
                    className="mf-btn"
                    style={{ height: 40, width: 40, padding: 0 }}
                    aria-label="Increase reps"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* RPE picker */}
            <div style={{ marginTop: 16 }}>
              <div
                className="mf-eyebrow flex items-center justify-between"
                style={{ marginBottom: 8 }}
              >
                <span>RPE · RATE OF PERCEIVED EXERTION</span>
              </div>
              <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
                {RPE_VALUES.map((v) => {
                  const active = activeSet.rpe === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => mutateSet({ rpe: v })}
                      className="mf-font-display mf-tnum"
                      style={{
                        height: 36,
                        borderRadius: 4,
                        background: active ? 'var(--mf-accent)' : 'var(--mf-surface-3)',
                        color: active ? 'var(--mf-accent-ink)' : 'var(--mf-fg-dim)',
                        border: `1px solid ${active ? 'var(--mf-accent)' : 'var(--mf-hairline)'}`,
                        fontSize: 14,
                      }}
                    >
                      {v}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={completeSet}
              disabled={activeSet.done}
              style={{
                width: '100%',
                height: 56,
                borderRadius: 6,
                marginTop: 16,
                background: activeSet.done ? 'var(--mf-surface-3)' : 'var(--mf-accent)',
                color: activeSet.done ? 'var(--mf-fg-mute)' : 'var(--mf-accent-ink)',
                border: 'none',
                cursor: activeSet.done ? 'default' : 'pointer',
                fontSize: 18,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
              }}
              className="mf-font-display"
            >
              {activeSet.done ? (
                <>
                  <Check size={20} /> SET COMPLETE
                </>
              ) : (
                <>
                  COMPLETE SET <ChevronRight size={20} />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Set log */}
        <div style={{ padding: '0 16px 16px' }}>
          <div className="mf-eyebrow" style={{ marginBottom: 8 }}>SET LOG</div>
          <div className="mf-card" style={{ overflow: 'hidden' }}>
            {currentLogs.map((s, i) => (
              <div
                key={i}
                className="flex items-center"
                style={{
                  padding: '12px 16px',
                  borderBottom: i < currentLogs.length - 1 ? '1px solid var(--mf-hairline)' : 'none',
                  background: i === activeSetIdx ? 'rgba(255,77,28,0.06)' : 'transparent',
                  opacity: i > activeSetIdx && !s.done ? 0.5 : 1,
                }}
              >
                <div
                  className="mf-font-mono mf-fg-mute"
                  style={{ fontSize: 11, width: 32 }}
                >
                  0{s.setNum}
                </div>
                <div
                  className="mf-font-display mf-tnum"
                  style={{ flex: 1, fontSize: 18 }}
                >
                  {s.done || i === activeSetIdx ? (
                    <>
                      {s.weight}
                      <span className="mf-fg-mute" style={{ fontSize: 13 }}> LB</span> × {s.reps}
                    </>
                  ) : (
                    <span className="mf-fg-mute">—</span>
                  )}
                </div>
                <div style={{ width: 56, textAlign: 'right' }}>
                  {s.done && s.rpe ? (
                    <span
                      className="mf-font-mono"
                      style={{
                        fontSize: 11,
                        color: s.rpe >= 9 ? 'var(--mf-amber)' : 'var(--mf-fg-dim)',
                      }}
                    >
                      RPE {s.rpe}
                    </span>
                  ) : null}
                </div>
                <div style={{ width: 24, display: 'flex', justifyContent: 'flex-end' }}>
                  {s.done && <Check size={14} style={{ color: 'var(--mf-green)' }} />}
                  {i === activeSetIdx && !s.done && (
                    <span
                      className="mf-pulse"
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: 'var(--mf-accent)',
                      }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Up next */}
        {exerciseIdx < initial.workout.exercises.length - 1 && (
          <div style={{ padding: '0 16px 32px' }}>
            <div className="mf-eyebrow" style={{ marginBottom: 8 }}>UP NEXT</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {initial.workout.exercises.slice(exerciseIdx + 1, exerciseIdx + 4).map((ex, i) => (
                <button
                  key={ex.id}
                  onClick={() => {
                    setExerciseIdx(exerciseIdx + 1 + i);
                    setActiveSetIdx(0);
                  }}
                  className="mf-card flex items-center gap-3"
                  style={{
                    padding: 12,
                    textAlign: 'left',
                    border: '1px solid var(--mf-hairline)',
                    cursor: 'pointer',
                  }}
                >
                  <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 11 }}>
                    0{exerciseIdx + 2 + i}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{ex.name}</div>
                    <div
                      className="mf-font-mono mf-fg-mute"
                      style={{ fontSize: 10, marginTop: 2 }}
                    >
                      {ex.targetSets}×{ex.targetReps}
                      {ex.targetWeight ? ` · ${ex.targetWeight} LB` : ''}
                    </div>
                  </div>
                  <ChevronRight size={14} className="mf-fg-mute" />
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div
            className="mf-chip mf-chip-bad"
            style={{ margin: '0 16px 16px', height: 'auto', padding: '8px 12px', display: 'block' }}
          >
            {error}
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      <div
        className="mf-s1 flex items-center justify-between shrink-0"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '8px 16px',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
          borderTop: '1px solid var(--mf-hairline)',
        }}
      >
        <div className="flex items-center gap-3">
          <div>
            <div className="mf-eyebrow">DONE</div>
            <div
              className="mf-font-display mf-tnum"
              style={{ fontSize: 18, lineHeight: 1 }}
            >
              {doneSets}
              <span className="mf-fg-mute" style={{ fontSize: 12 }}>
                /{currentLogs.length}
              </span>
            </div>
          </div>
          <div className="mf-vr" style={{ height: 24 }} />
          <div>
            <div className="mf-eyebrow">VOLUME</div>
            <div
              className="mf-font-display mf-tnum"
              style={{ fontSize: 18, lineHeight: 1 }}
            >
              {Math.round(totalVolume).toLocaleString()}
              <span className="mf-fg-mute" style={{ fontSize: 12 }}> LB</span>
            </div>
          </div>
        </div>
        <Btn
          variant="primary"
          onClick={handleFinish}
          disabled={finishing}
          style={{ height: 40 }}
        >
          {finishing ? 'SAVING…' : 'FINISH'}
        </Btn>
      </div>

      {/* Form video modal */}
      {formVideoOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setFormVideoOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 70,
            background: 'rgba(10,10,11,0.92)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="mf-card-elev"
            style={{
              maxWidth: 520,
              width: '100%',
              padding: 14,
              borderColor: 'var(--mf-hairline-strong)',
            }}
          >
            <div
              className="flex items-center justify-between"
              style={{ marginBottom: 10 }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="mf-eyebrow">FORM VIDEO</div>
                <div
                  className="mf-font-display"
                  style={{
                    fontSize: 14,
                    marginTop: 2,
                    textTransform: 'uppercase',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {currentExercise.name}
                </div>
                {formVideo?.channelTitle ? (
                  <div
                    className="mf-font-mono mf-fg-mute"
                    style={{ fontSize: 10, marginTop: 2 }}
                  >
                    {formVideo.channelTitle.toUpperCase()}
                  </div>
                ) : null}
              </div>
              <button
                onClick={() => setFormVideoOpen(false)}
                className="mf-btn mf-btn-ghost"
                style={{ height: 32, width: 32, padding: 0, marginLeft: 8 }}
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>

            {formVideoLoading && (
              <div
                className="mf-font-mono mf-fg-mute"
                style={{
                  padding: 36,
                  textAlign: 'center',
                  fontSize: 11,
                  letterSpacing: '0.1em',
                }}
              >
                LOADING…
              </div>
            )}

            {!formVideoLoading && formVideoError && (
              <div
                className="mf-card mf-fg-dim"
                style={{
                  padding: 24,
                  textAlign: 'center',
                  fontSize: 13,
                }}
              >
                {formVideoError}
              </div>
            )}

            {!formVideoLoading && !formVideoError && formVideo && (
              <iframe
                src={formVideo.embedUrl}
                title={formVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{
                  width: '100%',
                  aspectRatio: '16 / 9',
                  border: 0,
                  borderRadius: 6,
                  background: '#000',
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* PR celebration overlay */}
      {prs && prs.length > 0 && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            background: 'rgba(10,10,11,0.92)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            className="mf-card-elev"
            style={{
              maxWidth: 380,
              width: '100%',
              padding: 24,
              borderColor: 'var(--mf-accent)',
              background: 'linear-gradient(180deg, rgba(255,77,28,0.12), transparent 60%)',
              textAlign: 'center',
            }}
          >
            <div
              className="mf-eyebrow mf-pulse"
              style={{ color: 'var(--mf-accent)', marginBottom: 12 }}
            >
              NEW {prs.length > 1 ? `${prs.length} PRS` : 'PR'}
            </div>
            {prs.slice(0, 3).map((pr, i) => {
              const delta =
                pr.previousWeight != null
                  ? `+${(pr.newWeight - pr.previousWeight).toFixed(1)} LB`
                  : 'FIRST LOGGED';
              return (
                <div
                  key={i}
                  style={{
                    marginBottom: i < Math.min(2, prs.length - 1) ? 16 : 0,
                    paddingBottom: i < Math.min(2, prs.length - 1) ? 16 : 0,
                    borderBottom:
                      i < Math.min(2, prs.length - 1)
                        ? '1px solid var(--mf-hairline)'
                        : 'none',
                  }}
                >
                  <div
                    className="mf-font-display mf-tnum mf-accent"
                    style={{ fontSize: 64, lineHeight: 0.9, letterSpacing: '-0.02em' }}
                  >
                    {pr.newWeight}
                  </div>
                  <div
                    className="mf-font-display"
                    style={{
                      fontSize: 14,
                      marginTop: 8,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    LB · {pr.exerciseName}
                  </div>
                  <div
                    className="mf-font-mono mf-fg-mute"
                    style={{
                      fontSize: 10,
                      marginTop: 4,
                      letterSpacing: '0.1em',
                      color: 'var(--mf-green)',
                    }}
                  >
                    ▲ {delta}
                  </div>
                </div>
              );
            })}
            {prs.length > 3 && (
              <div
                className="mf-font-mono mf-fg-mute"
                style={{ fontSize: 10, marginTop: 12, letterSpacing: '0.1em' }}
              >
                + {prs.length - 3} MORE
              </div>
            )}
            <div
              className="mf-font-mono mf-fg-mute"
              style={{
                fontSize: 10,
                marginTop: 16,
                letterSpacing: '0.1em',
              }}
            >
              YOUR COACH HAS BEEN NOTIFIED
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
