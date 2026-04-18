'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Users, Trash2, Loader2 } from 'lucide-react';
import { Avatar, Btn, Chip } from '@/components/ui/mf';

type DayOfWeek = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

interface ProgramDayExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  sets: number;
  repsScheme: string;
  targetWeight: string | null;
  restSeconds: number | null;
  order: number;
}

interface ProgramDay {
  id: string;
  dayOfWeek: DayOfWeek;
  sessionType: string;
  notes: string | null;
  order: number;
  exercises: ProgramDayExercise[];
}

interface ProgramWeek {
  id: string;
  weekNumber: number;
  name: string | null;
  notes: string | null;
  days: ProgramDay[];
}

interface ExerciseOption {
  id: string;
  name: string;
}

interface ClientOption {
  id: string;
  name: string | null;
  email: string;
  initials: string;
}

interface Props {
  programId: string;
  weeks: ProgramWeek[];
  exerciseOptions: ExerciseOption[];
  clients: ClientOption[];
  assignmentCount: number;
}

const DAY_LABEL: Record<DayOfWeek, string> = {
  MON: 'Mon',
  TUE: 'Tue',
  WED: 'Wed',
  THU: 'Thu',
  FRI: 'Fri',
  SAT: 'Sat',
  SUN: 'Sun',
};

export default function ProgramBuilderClient({
  programId,
  weeks: initialWeeks,
  exerciseOptions,
  clients,
  assignmentCount,
}: Props) {
  const router = useRouter();
  const [weeks, setWeeks] = useState<ProgramWeek[]>(initialWeeks);
  const [selectedWeekIdx, setSelectedWeekIdx] = useState(0);
  const [selectedDayIdx, setSelectedDayIdx] = useState<number | null>(null);
  const [exOpen, setExOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [exSearch, setExSearch] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const week = weeks[selectedWeekIdx]!;
  const day = selectedDayIdx != null ? week.days[selectedDayIdx] ?? null : null;

  const filteredExercises = useMemo(() => {
    if (!exSearch.trim()) return exerciseOptions.slice(0, 40);
    const q = exSearch.trim().toLowerCase();
    return exerciseOptions.filter((e) => e.name.toLowerCase().includes(q)).slice(0, 40);
  }, [exSearch, exerciseOptions]);

  async function addExercise(exerciseId: string, exerciseName: string) {
    if (!day) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/program-days/${day.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseId,
          sets: 3,
          repsScheme: '8-10',
          restSeconds: 90,
        }),
      });
      if (!res.ok) throw new Error('Could not add exercise');
      const created = (await res.json()) as ProgramDayExercise & { exercise: { name: string } };
      setWeeks((prev) =>
        prev.map((w, wi) =>
          wi !== selectedWeekIdx
            ? w
            : {
                ...w,
                days: w.days.map((d) =>
                  d.id !== day.id
                    ? d
                    : {
                        ...d,
                        exercises: [
                          ...d.exercises,
                          {
                            id: created.id,
                            exerciseId,
                            exerciseName: created.exercise?.name ?? exerciseName,
                            sets: created.sets,
                            repsScheme: created.repsScheme,
                            targetWeight: created.targetWeight ?? null,
                            restSeconds: created.restSeconds ?? null,
                            order: created.order,
                          },
                        ],
                      },
                ),
              },
        ),
      );
      setExSearch('');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add');
    } finally {
      setPending(false);
    }
  }

  async function removeExercise(pdeId: string) {
    if (!day) return;
    try {
      const res = await fetch(`/api/program-day-exercises/${pdeId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setWeeks((prev) =>
        prev.map((w, wi) =>
          wi !== selectedWeekIdx
            ? w
            : {
                ...w,
                days: w.days.map((d) =>
                  d.id !== day.id ? d : { ...d, exercises: d.exercises.filter((ex) => ex.id !== pdeId) },
                ),
              },
        ),
      );
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  async function setSessionType(dayId: string, sessionType: string) {
    await fetch(`/api/program-days/${dayId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionType }),
    });
    setWeeks((prev) =>
      prev.map((w) => ({ ...w, days: w.days.map((d) => (d.id === dayId ? { ...d, sessionType } : d)) })),
    );
    router.refresh();
  }

  async function assignToClient(clientId: string) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/programs/${programId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          startDate: new Date().toISOString(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? 'Assign failed');
      }
      setAssignOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Assign failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {/* Action bar */}
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <div className="mf-card flex gap-1 overflow-x-auto" style={{ padding: 4, maxWidth: '70%' }}>
          {weeks.map((w, i) => {
            const active = i === selectedWeekIdx;
            return (
              <button
                key={w.id}
                onClick={() => {
                  setSelectedWeekIdx(i);
                  setSelectedDayIdx(null);
                }}
                className="mf-font-mono shrink-0"
                style={{
                  padding: '6px 12px',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  borderRadius: 4,
                  background: active ? 'var(--mf-accent)' : 'transparent',
                  color: active ? 'var(--mf-accent-ink)' : 'var(--mf-fg-dim)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                WK {String(w.weekNumber).padStart(2, '0')}
              </button>
            );
          })}
        </div>
        <Btn variant="primary" icon={Users} onClick={() => setAssignOpen(true)}>
          Assign to client
        </Btn>
      </div>

      {error && (
        <div
          className="mf-chip mf-chip-bad"
          style={{ marginBottom: 12, display: 'block', padding: '8px 12px', height: 'auto' }}
        >
          {error}
        </div>
      )}

      {/* Week grid + day editor */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16 }}>
        <div>
          <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
            WEEK {week.weekNumber}
            {week.name ? ` · ${week.name}` : ''}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 8,
            }}
          >
            {week.days.map((d, di) => {
              const isSel = selectedDayIdx === di;
              const isRest = d.sessionType.toLowerCase() === 'rest';
              return (
                <button
                  key={d.id}
                  onClick={() => setSelectedDayIdx(di)}
                  className="mf-card"
                  style={{
                    padding: 12,
                    minHeight: 220,
                    textAlign: 'left',
                    cursor: 'pointer',
                    borderColor: isSel ? 'var(--mf-accent)' : undefined,
                  }}
                >
                  <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                    <span
                      className="mf-font-mono mf-fg-mute"
                      style={{ fontSize: 10, letterSpacing: '0.1em' }}
                    >
                      {DAY_LABEL[d.dayOfWeek].toUpperCase()}
                    </span>
                    {isRest && <Chip>REST</Chip>}
                  </div>
                  <div
                    className="mf-font-display"
                    style={{
                      fontSize: 13,
                      lineHeight: 1.2,
                      marginBottom: 8,
                      textTransform: 'uppercase',
                    }}
                  >
                    {d.sessionType}
                  </div>
                  {d.exercises.length === 0 ? (
                    <div
                      className="mf-fg-mute mf-font-mono"
                      style={{ fontSize: 10, letterSpacing: '0.1em' }}
                    >
                      EMPTY
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {d.exercises.slice(0, 5).map((ex) => (
                        <div
                          key={ex.id}
                          className="flex items-center gap-1.5"
                          style={{
                            fontSize: 10,
                            background: 'var(--mf-surface-3)',
                            borderRadius: 4,
                            padding: '4px 6px',
                          }}
                        >
                          <span
                            style={{
                              flex: 1,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {ex.exerciseName}
                          </span>
                          <span className="mf-font-mono mf-tnum">{ex.sets}×{ex.repsScheme}</span>
                        </div>
                      ))}
                      {d.exercises.length > 5 && (
                        <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 9 }}>
                          + {d.exercises.length - 5} more
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Day editor */}
        <div
          className="mf-card"
          style={{
            padding: 16,
            alignSelf: 'start',
            position: 'sticky',
            top: 88,
          }}
        >
          {!day ? (
            <div
              className="mf-fg-mute mf-font-mono"
              style={{ padding: '24px 0', textAlign: 'center', fontSize: 11, letterSpacing: '0.1em' }}
            >
              SELECT A DAY TO EDIT
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                <div>
                  <div className="mf-eyebrow">EDITING</div>
                  <div
                    className="mf-font-display"
                    style={{ fontSize: 16, letterSpacing: '-0.01em' }}
                  >
                    {DAY_LABEL[day.dayOfWeek].toUpperCase()} · WK {week.weekNumber}
                  </div>
                </div>
              </div>
              <label className="block" style={{ marginBottom: 12 }}>
                <div className="mf-eyebrow" style={{ marginBottom: 6 }}>
                  SESSION TYPE
                </div>
                <input
                  className="mf-input"
                  defaultValue={day.sessionType}
                  onBlur={(e) => setSessionType(day.id, e.target.value || 'Session')}
                  placeholder="Upper / Push, Rest, etc."
                />
              </label>

              <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
                EXERCISES · {day.exercises.length}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                {day.exercises.map((ex) => (
                  <div
                    key={ex.id}
                    className="flex items-center gap-2"
                    style={{
                      padding: '8px 10px',
                      background: 'var(--mf-surface-2)',
                      border: '1px solid var(--mf-hairline)',
                      borderRadius: 4,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {ex.exerciseName}
                      </div>
                      <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 10 }}>
                        {ex.sets}×{ex.repsScheme}
                        {ex.targetWeight ? ` · ${ex.targetWeight}` : ''}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeExercise(ex.id)}
                      aria-label="Remove exercise"
                      className="mf-fg-mute"
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>

              <Btn
                variant={exOpen ? 'ghost' : 'default'}
                icon={exOpen ? X : Plus}
                onClick={() => setExOpen(!exOpen)}
                className="w-full"
              >
                {exOpen ? 'Close picker' : 'Add exercise'}
              </Btn>

              {exOpen && (
                <div style={{ marginTop: 12 }}>
                  <input
                    className="mf-input"
                    placeholder="Search exercises…"
                    value={exSearch}
                    onChange={(e) => setExSearch(e.target.value)}
                    style={{ fontSize: 13, marginBottom: 8 }}
                  />
                  <div
                    style={{
                      maxHeight: 220,
                      overflowY: 'auto',
                      border: '1px solid var(--mf-hairline)',
                      borderRadius: 4,
                    }}
                    className="mf-scroll"
                  >
                    {filteredExercises.map((ex) => (
                      <button
                        key={ex.id}
                        onClick={() => addExercise(ex.id, ex.name)}
                        disabled={pending}
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: '8px 10px',
                          textAlign: 'left',
                          background: 'transparent',
                          border: 'none',
                          borderBottom: '1px solid var(--mf-hairline)',
                          cursor: pending ? 'default' : 'pointer',
                          color: 'var(--mf-fg)',
                          fontSize: 12,
                        }}
                      >
                        {ex.name}
                      </button>
                    ))}
                    {filteredExercises.length === 0 && (
                      <div
                        className="mf-fg-mute mf-font-mono"
                        style={{ padding: 16, textAlign: 'center', fontSize: 11 }}
                      >
                        NO MATCHES
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Assign modal */}
      {assignOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            className="mf-card-elev"
            style={{ maxWidth: 480, width: '100%', padding: 20, maxHeight: '80vh', overflow: 'auto' }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
              <div>
                <div className="mf-eyebrow">ASSIGN PROGRAM</div>
                <div
                  className="mf-font-display"
                  style={{ fontSize: 18, letterSpacing: '-0.01em' }}
                >
                  Pick a client
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAssignOpen(false)}
                aria-label="Close"
                className="mf-fg-mute"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}
              >
                <X size={16} />
              </button>
            </div>
            {clients.length === 0 ? (
              <div
                className="mf-fg-mute mf-font-mono"
                style={{ padding: 24, textAlign: 'center', fontSize: 11, letterSpacing: '0.1em' }}
              >
                NO CLIENTS YET
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {clients.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => assignToClient(c.id)}
                    disabled={pending}
                    className="mf-card flex items-center gap-3"
                    style={{
                      padding: 12,
                      textAlign: 'left',
                      cursor: pending ? 'default' : 'pointer',
                    }}
                  >
                    <Avatar initials={c.initials} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{c.name ?? c.email}</div>
                      <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 10 }}>
                        {c.email}
                      </div>
                    </div>
                    {pending && <Loader2 size={14} className="mf-fg-mute animate-spin" />}
                  </button>
                ))}
              </div>
            )}
            {assignmentCount > 0 && (
              <div
                className="mf-font-mono mf-fg-mute"
                style={{ marginTop: 12, fontSize: 10, letterSpacing: '0.1em' }}
              >
                {assignmentCount} ACTIVE ASSIGNMENTS · NEW ASSIGNMENT CANCELS PRIOR FOR THE SAME CLIENT
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
