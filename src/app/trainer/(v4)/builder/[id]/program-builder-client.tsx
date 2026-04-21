'use client';

import { useState, useMemo, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Users, Trash2, Loader2, Dumbbell, UtensilsCrossed, Edit3 } from 'lucide-react';
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

interface ProgramMealPlan {
  id: string;
  name: string;
  description: string | null;
  startWeek: number;
  endWeek: number | null;
  dailyCalorieTarget: number;
  dailyProteinTarget: number;
  dailyCarbTarget: number;
  dailyFatTarget: number;
  order: number;
}

interface Props {
  programId: string;
  durationWks: number;
  weeks: ProgramWeek[];
  exerciseOptions: ExerciseOption[];
  clients: ClientOption[];
  assignmentCount: number;
  mealPlans: ProgramMealPlan[];
}

type BuilderView = 'training' | 'nutrition';

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
  durationWks,
  weeks: initialWeeks,
  exerciseOptions,
  clients,
  assignmentCount,
  mealPlans: initialMealPlans,
}: Props) {
  const router = useRouter();
  const [view, setView] = useState<BuilderView>('training');
  const [weeks, setWeeks] = useState<ProgramWeek[]>(initialWeeks);
  const [selectedWeekIdx, setSelectedWeekIdx] = useState(0);
  const [selectedDayIdx, setSelectedDayIdx] = useState<number | null>(null);
  const [exOpen, setExOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [exSearch, setExSearch] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mealPlans, setMealPlans] = useState<ProgramMealPlan[]>(initialMealPlans);
  const [editingPlan, setEditingPlan] = useState<ProgramMealPlan | 'new' | null>(null);

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

  async function deleteMealPlan(planId: string) {
    if (!confirm('Delete this meal plan? Clients already assigned keep their copies.')) return;
    try {
      const res = await fetch(`/api/programs/${programId}/meal-plans/${planId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Delete failed');
      setMealPlans((prev) => prev.filter((p) => p.id !== planId));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
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
      {/* Training / Nutrition tabs */}
      <div
        className="flex items-center gap-2"
        style={{ marginBottom: 16, borderBottom: '1px solid var(--mf-hairline)' }}
      >
        <TabBtn
          active={view === 'training'}
          onClick={() => setView('training')}
          icon={Dumbbell}
        >
          TRAINING
          <span className="mf-font-mono mf-fg-mute" style={{ marginLeft: 6, fontSize: 10 }}>
            {weeks.length}W
          </span>
        </TabBtn>
        <TabBtn
          active={view === 'nutrition'}
          onClick={() => setView('nutrition')}
          icon={UtensilsCrossed}
        >
          NUTRITION
          <span className="mf-font-mono mf-fg-mute" style={{ marginLeft: 6, fontSize: 10 }}>
            {mealPlans.length}
          </span>
        </TabBtn>
        <div style={{ flex: 1 }} />
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

      {view === 'nutrition' && (
        <NutritionPanel
          programId={programId}
          durationWks={durationWks}
          mealPlans={mealPlans}
          editingPlan={editingPlan}
          setEditingPlan={setEditingPlan}
          onCreated={(plan) => setMealPlans((prev) => [...prev, plan])}
          onUpdated={(plan) =>
            setMealPlans((prev) => prev.map((p) => (p.id === plan.id ? plan : p)))
          }
          onDeleted={deleteMealPlan}
        />
      )}

      {view === 'training' && (
      <>
      {/* Week tabs */}
      <div className="flex items-center" style={{ marginBottom: 16 }}>
        <div className="mf-card flex gap-1 overflow-x-auto" style={{ padding: 4 }}>
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
      </div>

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
      </>
      )}

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

function TabBtn({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ size?: number }>;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mf-font-mono"
      style={{
        padding: '10px 16px',
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        background: 'transparent',
        color: active ? 'var(--mf-fg)' : 'var(--mf-fg-mute)',
        border: 'none',
        borderBottom: active ? '2px solid var(--mf-accent)' : '2px solid transparent',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: -1,
      }}
    >
      <Icon size={12} />
      {children}
    </button>
  );
}

function NutritionPanel({
  programId,
  durationWks,
  mealPlans,
  editingPlan,
  setEditingPlan,
  onCreated,
  onUpdated,
  onDeleted,
}: {
  programId: string;
  durationWks: number;
  mealPlans: ProgramMealPlan[];
  editingPlan: ProgramMealPlan | 'new' | null;
  setEditingPlan: (p: ProgramMealPlan | 'new' | null) => void;
  onCreated: (plan: ProgramMealPlan) => void;
  onUpdated: (plan: ProgramMealPlan) => void;
  onDeleted: (planId: string) => void;
}) {
  return (
    <>
      <div
        className="flex items-center justify-between"
        style={{ marginBottom: 12 }}
      >
        <div>
          <div className="mf-eyebrow">MEAL PLAN TEMPLATES · {mealPlans.length}</div>
          <div
            className="mf-font-mono mf-fg-mute"
            style={{ fontSize: 11, marginTop: 2 }}
          >
            Attached to this program · Clone to clients on assign
          </div>
        </div>
        <Btn variant="primary" icon={Plus} onClick={() => setEditingPlan('new')}>
          New meal plan
        </Btn>
      </div>

      {mealPlans.length === 0 ? (
        <div
          className="mf-card"
          style={{
            padding: 40,
            textAlign: 'center',
            color: 'var(--mf-fg-mute)',
          }}
        >
          <UtensilsCrossed
            size={20}
            style={{ marginBottom: 8, opacity: 0.5 }}
          />
          <div
            className="mf-font-mono"
            style={{ fontSize: 11, letterSpacing: '0.1em', marginBottom: 4 }}
          >
            NO MEAL PLANS YET
          </div>
          <div style={{ fontSize: 13 }}>
            Add a plan to set macro targets for clients on this program.
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {mealPlans.map((p) => {
            const range =
              p.endWeek != null
                ? `WK ${String(p.startWeek).padStart(2, '0')}–${String(p.endWeek).padStart(2, '0')}`
                : p.startWeek > 1
                  ? `WK ${String(p.startWeek).padStart(2, '0')}–END`
                  : 'WHOLE PROGRAM';
            return (
              <div
                key={p.id}
                className="mf-card"
                style={{
                  padding: 16,
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: 16,
                  alignItems: 'center',
                }}
              >
                <div>
                  <div
                    className="flex items-center gap-2"
                    style={{ marginBottom: 4 }}
                  >
                    <Chip>{range}</Chip>
                    <div
                      className="mf-font-display"
                      style={{
                        fontSize: 16,
                        letterSpacing: '-0.01em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {p.name}
                    </div>
                  </div>
                  {p.description && (
                    <div
                      className="mf-fg-dim"
                      style={{ fontSize: 12, marginBottom: 8 }}
                    >
                      {p.description}
                    </div>
                  )}
                  <div className="flex items-center gap-3" style={{ fontSize: 12 }}>
                    <MacroPill label="KCAL" value={p.dailyCalorieTarget.toLocaleString()} />
                    <MacroPill label="P" value={`${p.dailyProteinTarget}g`} color="#FF4D1C" />
                    <MacroPill label="C" value={`${p.dailyCarbTarget}g`} color="#4D9EFF" />
                    <MacroPill label="F" value={`${p.dailyFatTarget}g`} color="#F5B544" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Btn icon={Edit3} onClick={() => setEditingPlan(p)}>
                    Edit
                  </Btn>
                  <button
                    type="button"
                    onClick={() => onDeleted(p.id)}
                    aria-label="Delete meal plan"
                    className="mf-fg-mute"
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--mf-hairline)',
                      borderRadius: 4,
                      width: 32,
                      height: 32,
                      display: 'grid',
                      placeItems: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editingPlan && (
        <MealPlanEditor
          programId={programId}
          durationWks={durationWks}
          plan={editingPlan === 'new' ? null : editingPlan}
          onClose={() => setEditingPlan(null)}
          onCreated={(plan) => {
            onCreated(plan);
            setEditingPlan(null);
          }}
          onUpdated={(plan) => {
            onUpdated(plan);
            setEditingPlan(null);
          }}
        />
      )}
    </>
  );
}

function MacroPill({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <span
      className="mf-font-mono mf-tnum"
      style={{
        fontSize: 11,
        padding: '2px 6px',
        borderRadius: 4,
        background: 'var(--mf-surface-2)',
        border: '1px solid var(--mf-hairline)',
      }}
    >
      <span style={{ color: color ?? 'var(--mf-fg-dim)', marginRight: 4 }}>
        {label}
      </span>
      {value}
    </span>
  );
}

function MealPlanEditor({
  programId,
  durationWks,
  plan,
  onClose,
  onCreated,
  onUpdated,
}: {
  programId: string;
  durationWks: number;
  plan: ProgramMealPlan | null;
  onClose: () => void;
  onCreated: (plan: ProgramMealPlan) => void;
  onUpdated: (plan: ProgramMealPlan) => void;
}) {
  const isEdit = plan != null;
  const [name, setName] = useState(plan?.name ?? '');
  const [description, setDescription] = useState(plan?.description ?? '');
  const [startWeek, setStartWeek] = useState<number>(plan?.startWeek ?? 1);
  // Represent "whole program" / "to end" as empty string in the input; null on save.
  const [endWeek, setEndWeek] = useState<string>(
    plan?.endWeek != null ? String(plan.endWeek) : '',
  );
  const [kcal, setKcal] = useState<number>(plan?.dailyCalorieTarget ?? 2400);
  const [protein, setProtein] = useState<number>(plan?.dailyProteinTarget ?? 180);
  const [carbs, setCarbs] = useState<number>(plan?.dailyCarbTarget ?? 240);
  const [fat, setFat] = useState<number>(plan?.dailyFatTarget ?? 80);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!name.trim()) {
      setErr('Plan name is required.');
      return;
    }
    const parsedEnd = endWeek.trim() === '' ? null : Number(endWeek);
    if (parsedEnd != null && (!Number.isFinite(parsedEnd) || parsedEnd < startWeek)) {
      setErr('End week must be empty (to end of program) or >= start week.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        startWeek,
        endWeek: parsedEnd,
        dailyCalorieTarget: Number(kcal),
        dailyProteinTarget: Number(protein),
        dailyCarbTarget: Number(carbs),
        dailyFatTarget: Number(fat),
      };
      const url = isEdit
        ? `/api/programs/${programId}/meal-plans/${plan!.id}`
        : `/api/programs/${programId}/meal-plans`;
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error ?? 'Save failed.');
        return;
      }
      const saved: ProgramMealPlan = {
        id: data.id,
        name: data.name,
        description: data.description ?? null,
        startWeek: data.startWeek,
        endWeek: data.endWeek ?? null,
        dailyCalorieTarget: data.dailyCalorieTarget,
        dailyProteinTarget: data.dailyProteinTarget,
        dailyCarbTarget: data.dailyCarbTarget,
        dailyFatTarget: data.dailyFatTarget,
        order: data.order ?? 0,
      };
      if (isEdit) onUpdated(saved);
      else onCreated(saved);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Network error.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={submit}
        className="mf-card-elev"
        style={{
          width: 'min(560px, 100%)',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: 24,
          display: 'grid',
          gap: 14,
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="mf-eyebrow">PROGRAM NUTRITION</div>
            <div
              className="mf-font-display"
              style={{ fontSize: 20, letterSpacing: '-0.01em', marginTop: 2 }}
            >
              {isEdit ? 'Edit meal plan' : 'New meal plan'}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="mf-btn mf-btn-ghost"
            style={{ height: 32, width: 32, padding: 0 }}
          >
            <X size={14} />
          </button>
        </div>

        <label style={{ display: 'block' }}>
          <FieldLabel>PLAN NAME</FieldLabel>
          <input
            className="mf-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Cut · Weeks 1-4"
            required
            minLength={1}
            maxLength={160}
          />
        </label>

        <label style={{ display: 'block' }}>
          <FieldLabel>DESCRIPTION (OPTIONAL)</FieldLabel>
          <textarea
            className="mf-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Notes for the client"
            style={{ resize: 'vertical' }}
          />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label style={{ display: 'block' }}>
            <FieldLabel>START WEEK</FieldLabel>
            <input
              type="number"
              className="mf-input"
              value={startWeek}
              onChange={(e) => setStartWeek(Math.max(1, Number(e.target.value) || 1))}
              min={1}
              max={durationWks}
              required
            />
          </label>
          <label style={{ display: 'block' }}>
            <FieldLabel>END WEEK (EMPTY = TO END)</FieldLabel>
            <input
              type="number"
              className="mf-input"
              value={endWeek}
              onChange={(e) => setEndWeek(e.target.value)}
              min={startWeek}
              placeholder="auto"
            />
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          <label style={{ display: 'block' }}>
            <FieldLabel>KCAL / DAY</FieldLabel>
            <input
              type="number"
              className="mf-input"
              value={kcal}
              min={0}
              max={10000}
              onChange={(e) => setKcal(Number(e.target.value))}
              required
            />
          </label>
          <label style={{ display: 'block' }}>
            <FieldLabel>PROTEIN G</FieldLabel>
            <input
              type="number"
              className="mf-input"
              value={protein}
              min={0}
              max={1000}
              onChange={(e) => setProtein(Number(e.target.value))}
              required
            />
          </label>
          <label style={{ display: 'block' }}>
            <FieldLabel>CARBS G</FieldLabel>
            <input
              type="number"
              className="mf-input"
              value={carbs}
              min={0}
              max={2000}
              onChange={(e) => setCarbs(Number(e.target.value))}
              required
            />
          </label>
          <label style={{ display: 'block' }}>
            <FieldLabel>FAT G</FieldLabel>
            <input
              type="number"
              className="mf-input"
              value={fat}
              min={0}
              max={500}
              onChange={(e) => setFat(Number(e.target.value))}
              required
            />
          </label>
        </div>

        {err && (
          <div
            role="alert"
            style={{
              padding: '10px 12px',
              background: '#2a1212',
              border: '1px solid #6b1f1f',
              color: '#fca5a5',
              borderRadius: 4,
              fontSize: 12,
            }}
          >
            {err}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="mf-btn">
            Cancel
          </button>
          <button type="submit" className="mf-btn mf-btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create plan'}
          </button>
        </div>
      </form>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: 'var(--font-mf-mono), monospace',
        fontSize: 10,
        letterSpacing: '.15em',
        color: 'var(--mf-fg-dim)',
        marginBottom: 6,
      }}
    >
      {children}
    </div>
  );
}
