// src/lib/ai/workoutSummary.ts
//
// Generates a 1-2 sentence coach-voice analytical note about a just-completed
// workout. Pulls the same workout-template's previous completed session so
// the AI can reference last-week deltas.
//
// Skip conditions (return null without calling AI):
//   - completedSetCount === 0 (no signal)
//   - trainerId === null (no recipient)
//   - durationMs < 60_000 (likely a misclick)
//   - workoutId is null (no template to compare against)
//
// SCHEMA NOTE: this codebase has no per-set table. Per-exercise results are
// stored in `WorkoutProgress` (one row per exercise per session) carrying
// final `weight`, `reps`, and `sets` numerics — no RPE, no per-set rows,
// no explicit `completed` flag (completion is implied by the row's
// existence). The helper formats those rows as the prompt's TODAY/LAST
// SESSION blocks; reference to RPE / missed-set granularity in the system
// prompt is retained because the model handles their absence gracefully
// and the schema may grow per-set granularity later.

import 'server-only';
import { prisma } from '@/lib/prisma';
import { aiComplete } from './gateway';

export interface SummarizeWorkoutInput {
  sessionId: string;
  workoutId: string | null;
  clientId: string;
  clientName: string | null;
  workoutTitle: string | null;
  completedSetCount: number;
  totalSetCount: number;
  durationMs: number;
  trainerId: string | null;
}

const SYSTEM_PROMPT = `You write a single 1-2 sentence note for a fitness trainer about their client's just-completed workout. Highlight the most actionable pattern (PR, regression, RPE outlier, missed reps). Reference last week if there's a meaningful delta. No emoji, no greetings, no encouragement. Max 120 characters. Coach-shorthand acceptable ("bench progressing on schedule", "RPE 9 with missed final set").`;

interface ExerciseStat {
  name: string;
  weight: number | null;
  reps: number | null;
  sets: number | null;
  notes: string | null;
}

async function loadSessionStats(sessionId: string): Promise<ExerciseStat[]> {
  const rows = await prisma.workoutProgress.findMany({
    where: { workoutSessionId: sessionId },
    include: { exercise: { select: { name: true } } },
    orderBy: [{ exerciseId: 'asc' }],
  });
  return rows.map((r) => ({
    name: r.exercise.name,
    weight: r.weight,
    reps: r.reps,
    sets: r.sets,
    notes: r.notes,
  }));
}

async function loadPreviousSessionStats(
  workoutId: string,
  clientId: string,
  excludeSessionId: string,
): Promise<ExerciseStat[] | null> {
  const prev = await prisma.workoutSession.findFirst({
    where: {
      workoutId,
      userId: clientId,
      completed: true,
      id: { not: excludeSessionId },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });
  if (!prev) return null;
  return loadSessionStats(prev.id);
}

function formatStats(stats: ExerciseStat[]): string {
  return stats
    .map((e) => {
      const sets = e.sets != null ? `${e.sets}x` : '';
      const reps = e.reps != null ? `${e.reps}r` : '?r';
      const weight = e.weight != null ? ` @ ${e.weight}lb` : '';
      const notes = e.notes ? ` (${e.notes})` : '';
      return `${e.name}: ${sets}${reps}${weight}${notes}`.trim();
    })
    .join('\n');
}

export async function summarizeWorkout(
  input: SummarizeWorkoutInput,
): Promise<string | null> {
  if (input.completedSetCount === 0) return null;
  if (!input.trainerId) return null;
  if (input.durationMs < 60_000) return null;
  if (!input.workoutId) return null;

  const [current, previous] = await Promise.all([
    loadSessionStats(input.sessionId),
    loadPreviousSessionStats(input.workoutId, input.clientId, input.sessionId),
  ]);

  if (current.length === 0) return null;

  const minutes = Math.max(1, Math.round(input.durationMs / 60_000));
  const userPrompt = [
    `Workout: ${input.workoutTitle ?? 'unknown'}`,
    `Client: ${input.clientName ?? 'client'}`,
    `Sets completed: ${input.completedSetCount}/${input.totalSetCount}`,
    `Duration: ${minutes} min`,
    '',
    'TODAY:',
    formatStats(current),
    '',
    previous
      ? `LAST SESSION (same workout):\n${formatStats(previous)}`
      : 'LAST SESSION: none on record',
  ].join('\n');

  const result = await aiComplete({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    maxOutputTokens: 120,
    timeoutMs: 4000,
    logContext: `summarizeWorkout sessionId=${input.sessionId}`,
  });

  if (!result) return null;
  // Hard cap at 120 chars — model usually obeys but guard anyway
  return result.text.slice(0, 120);
}
