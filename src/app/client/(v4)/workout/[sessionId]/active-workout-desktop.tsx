'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  ChevronRight,
  Minus,
  Plus,
  Video,
  X,
  Pause,
  Play,
  MessageSquare,
} from 'lucide-react';
import { Btn, Chip, ClientDesktopShell } from '@/components/ui/mf';

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

export default function ActiveWorkoutDesktop({ initial }: { initial: InitialPayload }) {
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
  const [paused, setPaused] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prs, setPrs] = useState<Array<{ exerciseName: string; newWeight: number; previousWeight: number | null }> | null>(null);
  const [formVideoOpen, setFormVideoOpen] = useState(false);
  const [formVideo, setFormVideo] = useState<FormVideo | null>(null);
  const [formVideoLoading, setFormVideoLoading] = useState(false);
  const [formVideoError, setFormVideoError] = useState<string | null>(null);

  const startedAtMs = useRef(new Date(initial.startedAt).getTime());
  const pausedElapsedRef = useRef<number | null>(null);

  useEffect(() => {
    if (paused) {
      // Freeze elapsed where it is right now; stop ticking.
      pausedElapsedRef.current = Math.floor((Date.now() - startedAtMs.current) / 1000);
      return;
    }
    // On resume, rebase startedAtMs so Date.now() - startedAtMs = frozen elapsed.
    if (pausedElapsedRef.current !== null) {
      startedAtMs.current = Date.now() - pausedElapsedRef.current * 1000;
      pausedElapsedRef.current = null;
    }
    const id = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startedAtMs.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [paused]);

  useEffect(() => {
    if (rest <= 0 || paused) return;
    const id = setInterval(() => setRest((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [rest, paused]);

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
      const nextEx = exerciseIdx + 1;
      if (nextEx < initial.workout.exercises.length) {
        setExerciseIdx(nextEx);
        setActiveSetIdx(0);
        setRest(currentExercise.restSeconds);
      } else {
        setRest(0);
      }
    }
  }

  async function handleFinish() {
    setFinishing(true);
    setError(null);
    try {
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
        setTimeout(() => router.push('/client'), 3200);
      } else {
        router.push('/client');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setFinishing(false);
    }
  }

  const totalExercises = initial.workout.exercises.length;
  const doneExerciseCount = initial.workout.exercises.filter((ex) =>
    (logsByExercise[ex.id] ?? []).every((s) => s.done),
  ).length;
  const overallPct = Math.round((doneExerciseCount / Math.max(1, totalExercises)) * 100);

  const doneSets = currentLogs.filter((s) => s.done).length;
  const totalVolume = Object.values(logsByExercise)
    .flat()
    .filter((s) => s.done)
    .reduce((acc, s) => acc + s.weight * s.reps, 0);

  const mins = Math.floor(rest / 60);
  const secs = rest % 60;
  const elapsedM = Math.floor(elapsedSec / 60);
  const elapsedS = elapsedSec % 60;

  const breadcrumbs = `${initial.workout.title.toUpperCase()} · ${
    (initial.workout.type ?? '').toUpperCase() || 'TRAIN'
  }`;

  return (
    <div className="hidden md:block">
      <ClientDesktopShell
        active="workout"
        breadcrumbs={breadcrumbs}
        title="Active Session"
        headerRight={
          <>
            <Chip kind={paused ? 'warn' : 'live'}>
              {paused ? 'PAUSED' : '● LIVE'} · {String(elapsedM).padStart(2, '0')}:{String(elapsedS).padStart(2, '0')}
            </Chip>
            <Btn
              icon={paused ? Play : Pause}
              onClick={() => setPaused((p) => !p)}
            >
              {paused ? 'Resume' : 'Pause'}
            </Btn>
            <Btn icon={X} onClick={handleFinish} disabled={finishing}>
              {finishing ? 'Saving…' : 'End session'}
            </Btn>
          </>
        }
      >
        <div className="p-6 grid grid-cols-12 gap-5">
          {/* Exercise list */}
          <aside
            className="col-span-3 mf-card-elev overflow-hidden"
            style={{ alignSelf: 'start' }}
          >
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--mf-hairline)',
              }}
            >
              <div className="mf-eyebrow">EXERCISES · {totalExercises}</div>
              <div style={{ marginTop: 4 }}>
                <div className="flex items-baseline justify-between">
                  <span className="mf-font-display" style={{ fontSize: 14 }}>
                    {doneExerciseCount}/{totalExercises} COMPLETE
                  </span>
                  <span className="mf-font-mono mf-fg-dim" style={{ fontSize: 10 }}>
                    {elapsedM} min
                  </span>
                </div>
                <div
                  style={{
                    height: 4,
                    borderRadius: 999,
                    marginTop: 6,
                    background: 'var(--mf-hairline)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${overallPct}%`,
                      height: '100%',
                      background: 'var(--mf-accent)',
                      borderRadius: 999,
                    }}
                  />
                </div>
              </div>
            </div>
            {initial.workout.exercises.map((ex, i) => {
              const logs = logsByExercise[ex.id] ?? [];
              const allDone = logs.length > 0 && logs.every((s) => s.done);
              const isActive = i === exerciseIdx;
              return (
                <button
                  key={ex.id}
                  onClick={() => {
                    setExerciseIdx(i);
                    setActiveSetIdx(
                      Math.max(
                        0,
                        (logsByExercise[ex.id] ?? []).findIndex((s) => !s.done),
                      ),
                    );
                  }}
                  className="w-full text-left flex items-center gap-3 relative"
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--mf-hairline)',
                    background: isActive ? 'var(--mf-surface-3)' : 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  {isActive && (
                    <span
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 10,
                        bottom: 10,
                        width: 2,
                        background: 'var(--mf-accent)',
                      }}
                    />
                  )}
                  <div
                    className="grid place-items-center mf-font-mono shrink-0"
                    aria-label={
                      allDone
                        ? 'Completed'
                        : isActive
                          ? `Active exercise ${i + 1}`
                          : `Exercise ${i + 1}`
                    }
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 4,
                      fontSize: 9,
                      lineHeight: 1,
                      fontWeight: 600,
                      background:
                        allDone || isActive
                          ? 'var(--mf-accent)'
                          : 'var(--mf-surface-3)',
                      color:
                        allDone || isActive
                          ? 'var(--mf-accent-ink)'
                          : 'var(--mf-fg-mute)',
                    }}
                  >
                    {allDone ? <Check size={10} /> : i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        lineHeight: 1.2,
                        marginBottom: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {ex.name}
                    </div>
                    <div
                      className="mf-font-mono mf-fg-mute"
                      style={{ fontSize: 10 }}
                    >
                      {ex.targetSets}×{ex.targetReps}
                      {ex.targetWeight ? ` · ${ex.targetWeight} LB` : ''}
                    </div>
                  </div>
                </button>
              );
            })}
          </aside>

          {/* Main — current exercise */}
          <div className="col-span-6" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Hero */}
            <div className="mf-card-elev" style={{ padding: 20 }}>
              <div className="flex items-start justify-between" style={{ marginBottom: 16 }}>
                <div>
                  <div className="mf-eyebrow" style={{ marginBottom: 4 }}>
                    EXERCISE {exerciseIdx + 1}
                    {currentExercise.muscleGroup
                      ? ` · ${currentExercise.muscleGroup.toUpperCase()}`
                      : ''}
                  </div>
                  <div
                    className="mf-font-display"
                    style={{
                      fontSize: 32,
                      letterSpacing: '-0.01em',
                      lineHeight: 1,
                      textTransform: 'uppercase',
                    }}
                  >
                    {currentExercise.name}
                  </div>
                  <div
                    className="mf-font-mono mf-fg-dim"
                    style={{ fontSize: 11, marginTop: 8 }}
                  >
                    {currentExercise.targetSets}×{currentExercise.targetReps}
                    {currentExercise.targetWeight
                      ? ` @ ${currentExercise.targetWeight} LB`
                      : ''}
                    {' · Rest '}
                    {Math.floor(currentExercise.restSeconds / 60)}:
                    {String(currentExercise.restSeconds % 60).padStart(2, '0')}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Btn icon={Video} onClick={openFormVideo}>Form check</Btn>
                  <Btn icon={MessageSquare}>Ask coach</Btn>
                </div>
              </div>

              {/* Rest timer OR next-set panel */}
              {rest > 0 ? (
                <div className="grid grid-cols-2 gap-5 items-center">
                  <div
                    style={{
                      padding: 20,
                      borderRadius: 6,
                      background: 'var(--mf-accent)',
                      color: 'var(--mf-accent-ink)',
                    }}
                  >
                    <div
                      className="mf-font-mono"
                      style={{
                        fontSize: 10,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        opacity: 0.7,
                        marginBottom: 4,
                      }}
                    >
                      REST
                    </div>
                    <div
                      className="mf-font-display mf-tnum"
                      style={{ fontSize: 72, lineHeight: 1 }}
                    >
                      {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
                    </div>
                    <div className="flex gap-2" style={{ marginTop: 16 }}>
                      <button
                        onClick={() => setRest((r) => r + 15)}
                        className="mf-btn"
                        style={{
                          height: 32,
                          fontSize: 11,
                          background: 'rgba(0,0,0,0.2)',
                          color: '#0A0A0B',
                          borderColor: 'rgba(0,0,0,0.2)',
                        }}
                      >
                        +15s
                      </button>
                      <button
                        onClick={() => setRest((r) => r + 30)}
                        className="mf-btn"
                        style={{
                          height: 32,
                          fontSize: 11,
                          background: 'rgba(0,0,0,0.2)',
                          color: '#0A0A0B',
                          borderColor: 'rgba(0,0,0,0.2)',
                        }}
                      >
                        +30s
                      </button>
                      <button
                        onClick={() => setRest(0)}
                        className="mf-btn"
                        style={{
                          height: 32,
                          fontSize: 11,
                          background: '#0A0A0B',
                          color: 'var(--mf-accent)',
                          borderColor: '#0A0A0B',
                        }}
                      >
                        SKIP
                      </button>
                    </div>
                  </div>
                  <div>
                    <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
                      UP NEXT · SET {activeSetIdx + 1}
                    </div>
                    <div
                      className="flex items-baseline gap-4"
                      style={{ marginBottom: 12 }}
                    >
                      <div>
                        <div
                          className="mf-font-display mf-tnum"
                          style={{ fontSize: 52, lineHeight: 1 }}
                        >
                          {activeSet.weight}
                        </div>
                        <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 9 }}>
                          LB
                        </div>
                      </div>
                      <div className="mf-fg-mute" style={{ fontSize: 28 }}>
                        ×
                      </div>
                      <div>
                        <div
                          className="mf-font-display mf-tnum"
                          style={{ fontSize: 52, lineHeight: 1 }}
                        >
                          {activeSet.reps}
                        </div>
                        <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 9 }}>
                          REPS
                        </div>
                      </div>
                      {activeSet.rpe !== null && (
                        <>
                          <div className="mf-fg-mute" style={{ fontSize: 28 }}>
                            @
                          </div>
                          <div>
                            <div
                              className="mf-font-display mf-tnum mf-accent"
                              style={{ fontSize: 52, lineHeight: 1 }}
                            >
                              {activeSet.rpe}
                            </div>
                            <div
                              className="mf-font-mono mf-fg-mute"
                              style={{ fontSize: 9 }}
                            >
                              RPE
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    padding: 20,
                    borderRadius: 6,
                    background: 'var(--mf-surface-3)',
                  }}
                >
                  <div className="mf-eyebrow" style={{ marginBottom: 12 }}>
                    LOG SET {activeSetIdx + 1} / {currentLogs.length}
                  </div>
                  <div className="grid grid-cols-2 gap-4" style={{ marginBottom: 16 }}>
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
                          onClick={() =>
                            mutateSet({ weight: Math.max(0, activeSet.weight - 5) })
                          }
                          className="mf-btn"
                          style={{ height: 40, width: 40, padding: 0 }}
                          aria-label="Decrease weight"
                        >
                          <Minus size={16} />
                        </button>
                        <div style={{ flex: 1, textAlign: 'center' }}>
                          <div
                            className="mf-font-display mf-tnum mf-accent"
                            style={{ fontSize: 44, lineHeight: 1 }}
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
                          onClick={() =>
                            mutateSet({ reps: Math.max(0, activeSet.reps - 1) })
                          }
                          className="mf-btn"
                          style={{ height: 40, width: 40, padding: 0 }}
                          aria-label="Decrease reps"
                        >
                          <Minus size={16} />
                        </button>
                        <div style={{ flex: 1, textAlign: 'center' }}>
                          <div
                            className="mf-font-display mf-tnum"
                            style={{ fontSize: 44, lineHeight: 1 }}
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

                  <div style={{ marginBottom: 16 }}>
                    <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
                      RPE · RATE OF PERCEIVED EXERTION
                    </div>
                    <div
                      className="grid gap-1"
                      style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}
                    >
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
                              background: active
                                ? 'var(--mf-accent)'
                                : 'var(--mf-surface-3)',
                              color: active
                                ? 'var(--mf-accent-ink)'
                                : 'var(--mf-fg-dim)',
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
                    className="mf-font-display"
                    style={{
                      width: '100%',
                      height: 56,
                      borderRadius: 6,
                      background: activeSet.done
                        ? 'var(--mf-surface-3)'
                        : 'var(--mf-accent)',
                      color: activeSet.done
                        ? 'var(--mf-fg-mute)'
                        : 'var(--mf-accent-ink)',
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
                  >
                    {activeSet.done ? (
                      <>
                        <Check size={20} /> SET COMPLETE
                      </>
                    ) : (
                      <>
                        COMPLETE SET {activeSet.weight} × {activeSet.reps}
                        {activeSet.rpe ? ` @ RPE ${activeSet.rpe}` : ''}
                        <ChevronRight size={20} />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Set log table */}
            <div className="mf-card">
              <div
                className="flex items-center justify-between"
                style={{
                  padding: '12px 20px',
                  borderBottom: '1px solid var(--mf-hairline)',
                }}
              >
                <div className="mf-eyebrow">SET LOG</div>
                <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 10 }}>
                  {doneSets}/{currentLogs.length} DONE
                </div>
              </div>
              <table className="w-full" style={{ fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--mf-hairline)' }}>
                    <th
                      className="mf-font-mono mf-fg-mute"
                      style={{
                        padding: '8px 20px',
                        textAlign: 'left',
                        fontSize: 9,
                        textTransform: 'uppercase',
                        letterSpacing: '0.15em',
                        fontWeight: 400,
                      }}
                    >
                      SET
                    </th>
                    <th
                      className="mf-font-mono mf-fg-mute"
                      style={{
                        padding: '8px',
                        textAlign: 'right',
                        fontSize: 9,
                        textTransform: 'uppercase',
                        letterSpacing: '0.15em',
                        fontWeight: 400,
                      }}
                    >
                      TARGET
                    </th>
                    <th
                      className="mf-font-mono mf-fg-mute"
                      style={{
                        padding: '8px',
                        textAlign: 'right',
                        fontSize: 9,
                        textTransform: 'uppercase',
                        letterSpacing: '0.15em',
                        fontWeight: 400,
                      }}
                    >
                      WEIGHT
                    </th>
                    <th
                      className="mf-font-mono mf-fg-mute"
                      style={{
                        padding: '8px',
                        textAlign: 'right',
                        fontSize: 9,
                        textTransform: 'uppercase',
                        letterSpacing: '0.15em',
                        fontWeight: 400,
                      }}
                    >
                      REPS
                    </th>
                    <th
                      className="mf-font-mono mf-fg-mute"
                      style={{
                        padding: '8px',
                        textAlign: 'right',
                        fontSize: 9,
                        textTransform: 'uppercase',
                        letterSpacing: '0.15em',
                        fontWeight: 400,
                      }}
                    >
                      RPE
                    </th>
                    <th
                      className="mf-font-mono mf-fg-mute"
                      style={{
                        padding: '8px 20px',
                        textAlign: 'right',
                        fontSize: 9,
                        textTransform: 'uppercase',
                        letterSpacing: '0.15em',
                        fontWeight: 400,
                      }}
                    >
                      STATUS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentLogs.map((s, i) => {
                    const isActive = i === activeSetIdx;
                    return (
                      <tr
                        key={i}
                        style={{
                          borderBottom:
                            i < currentLogs.length - 1
                              ? '1px solid var(--mf-hairline)'
                              : 'none',
                          background: isActive
                            ? 'rgba(255,77,28,0.08)'
                            : 'transparent',
                          cursor: 'pointer',
                        }}
                        onClick={() => setActiveSetIdx(i)}
                      >
                        <td style={{ padding: '10px 20px' }}>
                          <div className="flex items-center gap-2">
                            <div
                              className="grid place-items-center mf-font-mono"
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: 4,
                                fontSize: 10,
                                background: s.done
                                  ? 'var(--mf-accent)'
                                  : isActive
                                    ? '#0A0A0B'
                                    : 'var(--mf-surface-3)',
                                color: s.done
                                  ? 'var(--mf-accent-ink)'
                                  : isActive
                                    ? 'var(--mf-accent)'
                                    : 'var(--mf-fg-dim)',
                                border: isActive
                                  ? '1px solid var(--mf-accent)'
                                  : 'none',
                              }}
                            >
                              {s.done ? <Check size={12} /> : i + 1}
                            </div>
                            {isActive && !s.done && <Chip kind="live">NOW</Chip>}
                          </div>
                        </td>
                        <td
                          className="mf-font-mono mf-fg-mute"
                          style={{ padding: '10px 8px', textAlign: 'right', fontSize: 11 }}
                        >
                          {currentExercise.targetReps}
                          {currentExercise.targetWeight
                            ? ` @ ${currentExercise.targetWeight}`
                            : ''}
                        </td>
                        <td
                          className="mf-font-display mf-tnum"
                          style={{ padding: '10px 8px', textAlign: 'right', fontSize: 15 }}
                        >
                          {s.done || isActive ? s.weight : '—'}
                        </td>
                        <td
                          className="mf-font-display mf-tnum"
                          style={{ padding: '10px 8px', textAlign: 'right', fontSize: 15 }}
                        >
                          {s.done || isActive ? s.reps : '—'}
                        </td>
                        <td
                          className="mf-font-display mf-tnum mf-accent"
                          style={{ padding: '10px 8px', textAlign: 'right', fontSize: 15 }}
                        >
                          {s.done && s.rpe ? s.rpe : isActive && activeSet.rpe ? activeSet.rpe : '—'}
                        </td>
                        <td
                          className="mf-font-mono"
                          style={{
                            padding: '10px 20px',
                            textAlign: 'right',
                            fontSize: 11,
                            color: s.done
                              ? 'var(--mf-green)'
                              : isActive
                                ? 'var(--mf-accent)'
                                : 'var(--mf-fg-mute)',
                          }}
                        >
                          {s.done ? 'DONE' : isActive ? 'ACTIVE' : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {error && (
              <div
                className="mf-chip mf-chip-bad"
                style={{
                  height: 'auto',
                  padding: '8px 12px',
                  display: 'block',
                }}
              >
                {error}
              </div>
            )}

            {/* Bottom action row */}
            <div
              className="flex items-center justify-between mf-s1"
              style={{
                padding: '12px 16px',
                borderRadius: 6,
                border: '1px solid var(--mf-hairline)',
              }}
            >
              <div className="flex items-center gap-4">
                <div>
                  <div className="mf-eyebrow">DONE</div>
                  <div
                    className="mf-font-display mf-tnum"
                    style={{ fontSize: 20, lineHeight: 1 }}
                  >
                    {doneSets}
                    <span className="mf-fg-mute" style={{ fontSize: 12 }}>
                      /{currentLogs.length}
                    </span>
                  </div>
                </div>
                <div className="mf-vr" style={{ height: 28 }} />
                <div>
                  <div className="mf-eyebrow">VOLUME</div>
                  <div
                    className="mf-font-display mf-tnum"
                    style={{ fontSize: 20, lineHeight: 1 }}
                  >
                    {Math.round(totalVolume).toLocaleString()}
                    <span className="mf-fg-mute" style={{ fontSize: 12 }}>
                      {' '}LB
                    </span>
                  </div>
                </div>
                <div className="mf-vr" style={{ height: 28 }} />
                <div>
                  <div className="mf-eyebrow">ELAPSED</div>
                  <div
                    className="mf-font-display mf-tnum"
                    style={{ fontSize: 20, lineHeight: 1 }}
                  >
                    {String(elapsedM).padStart(2, '0')}:
                    {String(elapsedS).padStart(2, '0')}
                  </div>
                </div>
              </div>
              <Btn variant="primary" onClick={handleFinish} disabled={finishing}>
                {finishing ? 'SAVING…' : 'FINISH'}
              </Btn>
            </div>
          </div>

          {/* Coach pane */}
          <aside
            className="col-span-3"
            style={{ display: 'flex', flexDirection: 'column', gap: 16, alignSelf: 'start' }}
          >
            <div className="mf-card-elev overflow-hidden">
              {currentExercise.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
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
              ) : (
                <div
                  className="mf-ph-img grid place-items-center"
                  style={{
                    aspectRatio: '9 / 12',
                    background: 'var(--mf-surface-3)',
                    color: 'var(--mf-fg-mute)',
                  }}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Video size={24} />
                    <span className="mf-font-mono" style={{ fontSize: 10 }}>
                      FORM VIDEO
                    </span>
                  </div>
                </div>
              )}
              <div style={{ padding: 16 }}>
                <div className="mf-eyebrow" style={{ marginBottom: 4 }}>
                  CURRENT EXERCISE
                </div>
                <div
                  className="mf-font-display"
                  style={{ fontSize: 14, textTransform: 'uppercase' }}
                >
                  {currentExercise.name}
                </div>
                <div
                  className="mf-fg-dim"
                  style={{ fontSize: 12, lineHeight: 1.5, marginTop: 8 }}
                >
                  Target {currentExercise.targetSets}×{currentExercise.targetReps}
                  {currentExercise.targetWeight
                    ? ` @ ${currentExercise.targetWeight} LB`
                    : ''}
                  . Rest {Math.floor(currentExercise.restSeconds / 60)}:
                  {String(currentExercise.restSeconds % 60).padStart(2, '0')} between sets.
                </div>
              </div>
            </div>

            <div className="mf-card" style={{ padding: 16 }}>
              <div className="mf-eyebrow" style={{ marginBottom: 12 }}>
                LAST TIME
              </div>
              {currentExercise.previous ? (
                (() => {
                  const prev = currentExercise.previous;
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {Array.from({
                        length: prev.sets ?? 1,
                      }).map((_, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between mf-font-mono"
                          style={{ fontSize: 11 }}
                        >
                          <span className="mf-fg-mute">SET {i + 1}</span>
                          <span
                            className="mf-font-display mf-tnum mf-fg"
                            style={{ fontSize: 13 }}
                          >
                            {prev.weight ?? 0} × {prev.reps ?? 0}
                          </span>
                          <span className="mf-accent">PREV</span>
                        </div>
                      ))}
                    </div>
                  );
                })()
              ) : (
                <div className="mf-fg-mute" style={{ fontSize: 12 }}>
                  No prior data. This session sets your baseline.
                </div>
              )}
            </div>

            <div className="mf-card" style={{ padding: 16 }}>
              <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
                COACH NOTES
              </div>
              <div
                className="mf-fg-dim"
                style={{ fontSize: 12, lineHeight: 1.5 }}
              >
                Focus on full range of motion and controlled tempo. Log RPE honestly so
                loads scale correctly next week.
              </div>
            </div>
          </aside>
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
              background: 'rgba(10,10,11,0.88)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
              backdropFilter: 'blur(4px)',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="mf-card-elev"
              style={{
                maxWidth: 880,
                width: '100%',
                padding: 16,
                borderColor: 'var(--mf-hairline-strong)',
              }}
            >
              <div
                className="flex items-center justify-between"
                style={{ marginBottom: 12 }}
              >
                <div>
                  <div className="mf-eyebrow">FORM VIDEO</div>
                  <div
                    className="mf-font-display"
                    style={{
                      fontSize: 16,
                      marginTop: 2,
                      textTransform: 'uppercase',
                    }}
                  >
                    {currentExercise.name}
                  </div>
                  {formVideo?.channelTitle ? (
                    <div
                      className="mf-font-mono mf-fg-mute"
                      style={{ fontSize: 10, marginTop: 4 }}
                    >
                      {formVideo.channelTitle.toUpperCase()}
                    </div>
                  ) : null}
                </div>
                <Btn icon={X} onClick={() => setFormVideoOpen(false)}>
                  Close
                </Btn>
              </div>

              {formVideoLoading && (
                <div
                  className="mf-font-mono mf-fg-mute"
                  style={{
                    padding: 48,
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
                    padding: 32,
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
                maxWidth: 420,
                width: '100%',
                padding: 24,
                borderColor: 'var(--mf-accent)',
                background:
                  'linear-gradient(180deg, rgba(255,77,28,0.12), transparent 60%)',
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
                      style={{ fontSize: 72, lineHeight: 0.9, letterSpacing: '-0.02em' }}
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
                style={{ fontSize: 10, marginTop: 16, letterSpacing: '0.1em' }}
              >
                YOUR COACH HAS BEEN NOTIFIED
              </div>
            </div>
          </div>
        )}
      </ClientDesktopShell>
    </div>
  );
}
