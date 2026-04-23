// Offline-safe persistence for the active workout player. Every set
// change writes to localStorage keyed by sessionId so a wifi drop, tab
// crash, or phone lock doesn't cost the user their workout. Submit clears
// the draft; a network-failed submit keeps it so the next attempt picks up
// exactly where the user left off.

const KEY_PREFIX = 'mf.workoutDraft.';
const SCHEMA = 1;

export interface SetLogPersisted {
  setNum: number;
  reps: number;
  weight: number;
  rpe: number | null;
  done: boolean;
}

export interface WorkoutDraft {
  schema: number;
  sessionId: string;
  savedAt: string;
  exerciseIdx: number;
  activeSetIdx: number;
  logsByExercise: Record<string, SetLogPersisted[]>;
  /** True after a failed submit so the UI can surface "queued for sync". */
  pendingSubmit?: boolean;
  /**
   * When (ms since epoch) the user tapped "Start" to actually begin the
   * session. Unset until the first tap. The elapsed timer keys off this so
   * navigating to the URL doesn't auto-start the clock, and a reload mid-run
   * doesn't reset it.
   */
  userStartedAtMs?: number;
}

function k(sessionId: string): string {
  return `${KEY_PREFIX}${sessionId}`;
}

export function saveWorkoutDraft(
  sessionId: string,
  draft: Omit<WorkoutDraft, 'schema' | 'sessionId' | 'savedAt'>,
): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: WorkoutDraft = {
      schema: SCHEMA,
      sessionId,
      savedAt: new Date().toISOString(),
      ...draft,
    };
    window.localStorage.setItem(k(sessionId), JSON.stringify(payload));
  } catch {
    // Quota exceeded or disabled storage — best-effort only.
  }
}

export function loadWorkoutDraft(sessionId: string): WorkoutDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(k(sessionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WorkoutDraft;
    if (parsed.schema !== SCHEMA) return null;
    if (parsed.sessionId !== sessionId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearWorkoutDraft(sessionId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(k(sessionId));
  } catch {
    // noop
  }
}

export function markDraftPendingSubmit(sessionId: string): void {
  const existing = loadWorkoutDraft(sessionId);
  if (!existing) return;
  saveWorkoutDraft(sessionId, {
    exerciseIdx: existing.exerciseIdx,
    activeSetIdx: existing.activeSetIdx,
    logsByExercise: existing.logsByExercise,
    pendingSubmit: true,
    userStartedAtMs: existing.userStartedAtMs,
  });
}
