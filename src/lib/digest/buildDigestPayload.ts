// src/lib/digest/buildDigestPayload.ts
//
// Aggregates per-client signal data for one trainer's weekly digest. Pure-
// ish: takes a trainerId + weekStart, queries the DB, calls
// summarizeClientWeek per client for the AI note, returns a self-contained
// payload that's persisted to WeeklyDigest.payload and rendered by both
// the email template and the dashboard widget.
//
// SCHEMA NOTES:
// - This project uses `WorkoutProgress` (one row per exercise per session,
//   aggregated weight/reps/sets/notes) instead of the per-set `WorkoutSet`
//   model that the original spec referenced. PR detection here compares
//   max weight per exercise this week vs max weight ever logged before
//   this week's start.
// - User has `lastLogin: DateTime?` — wired through as `lastLoginIso`.

import 'server-only';
import { prisma } from '@/lib/prisma';
import { summarizeClientWeek } from '@/lib/ai/weeklyDigest';

export interface DigestClientPR {
  exerciseName: string;
  achievement: string;
}

export interface DigestClientRegression {
  exerciseName: string;
  note: string;
}

export interface DigestClient {
  clientId: string;
  clientName: string;
  workoutsCompleted: number;
  workoutsAssigned: number;
  adherencePct: number;
  prsThisWeek: DigestClientPR[];
  regressions: DigestClientRegression[];
  lastLoginAt: string | null;
  lastClientMessageAt: string | null;
  aiNote: string;
}

export interface WeeklyDigestPayload {
  weekStartIso: string;
  weekEndIso: string;
  generatedAt: string;
  clients: DigestClient[];
}

/** Compute the [start, end] UTC milliseconds for a week starting at weekStartIso (local-tz Sunday 00:00 — for v1 we use UTC midnight as a coarse approximation). */
function weekBounds(weekStartIso: string): { startMs: number; endMs: number } {
  const start = new Date(`${weekStartIso}T00:00:00Z`).getTime();
  const end = start + 7 * 24 * 60 * 60 * 1000;
  return { startMs: start, endMs: end };
}

export async function buildDigestPayload(
  trainerId: string,
  weekStartIso: string,
): Promise<WeeklyDigestPayload> {
  const { startMs, endMs } = weekBounds(weekStartIso);
  const start = new Date(startMs);
  const end = new Date(endMs);

  // Find this trainer's clients. User.lastLogin (DateTime?) gives us the
  // "last seen" signal expected by summarizeClientWeek.
  const clients = await prisma.user.findMany({
    where: { trainerId, role: 'CLIENT' },
    select: {
      id: true,
      name: true,
      lastLogin: true,
    },
    orderBy: { name: 'asc' },
  });

  const out: DigestClient[] = [];
  for (const c of clients) {
    const sessions = await prisma.workoutSession.findMany({
      where: {
        userId: c.id,
        startTime: { gte: start, lt: end },
      },
      select: {
        id: true,
        completed: true,
        endTime: true,
        aiSummary: true,
      },
    });
    const workoutsCompleted = sessions.filter((s) => s.completed).length;
    const workoutsAssigned = sessions.length;
    const adherencePct = workoutsAssigned > 0
      ? Math.round((workoutsCompleted / workoutsAssigned) * 100)
      : 0;

    // PR detection — adapted to WorkoutProgress (one row per exercise per
    // session). For each exercise the client trained THIS WEEK, find the
    // best (highest weight) recorded entry. Compare against the best ever
    // recorded for the same client + same exercise BEFORE this week's
    // start. If this week's max beats prior, record as a PR.
    const weeklySessionIds = sessions.filter((s) => s.completed).map((s) => s.id);
    const weeklyProgress = weeklySessionIds.length > 0
      ? await prisma.workoutProgress.findMany({
          where: { workoutSessionId: { in: weeklySessionIds } },
          include: { exercise: { select: { id: true, name: true } } },
        })
      : [];

    const prs: DigestClientPR[] = [];
    // Group this week's progress entries by exercise; pick the best entry
    // (max weight) per exercise.
    const byExercise = new Map<string, { name: string; bestWeight: number; bestReps: number | null }>();
    for (const p of weeklyProgress) {
      const key = p.exerciseId;
      const w = p.weight ?? 0;
      const cur = byExercise.get(key);
      if (!cur || w > cur.bestWeight) {
        byExercise.set(key, { name: p.exercise.name, bestWeight: w, bestReps: p.reps });
      }
    }
    for (const [exerciseId, info] of byExercise) {
      // Prior record: max weight ever logged for this client + exercise
      // BEFORE this week's start, in any completed session.
      const prior = await prisma.workoutProgress.findFirst({
        where: {
          exerciseId,
          workoutSession: {
            userId: c.id,
            completed: true,
            startTime: { lt: start },
          },
        },
        orderBy: { weight: 'desc' },
        select: { weight: true, reps: true },
      });
      const priorWeight = prior?.weight ?? 0;
      if (info.bestWeight > priorWeight && info.bestWeight > 0) {
        prs.push({
          exerciseName: info.name,
          achievement: `${info.bestWeight}lb × ${info.bestReps ?? '?'}`,
        });
      }
    }

    // Regressions = sessions assigned but not completed. v1 just counts.
    const regressions: DigestClientRegression[] =
      workoutsAssigned > workoutsCompleted
        ? [{
            exerciseName: 'session',
            note: `${workoutsAssigned - workoutsCompleted} skipped`,
          }]
        : [];

    // Last client → trainer message
    const lastMsg = await prisma.message.findFirst({
      where: { senderId: c.id, receiverId: trainerId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    const lastLoginIso = c.lastLogin ? c.lastLogin.toISOString() : null;
    const lastClientMessageIso = lastMsg?.createdAt ? lastMsg.createdAt.toISOString() : null;

    const aiNote = await summarizeClientWeek({
      clientName: c.name ?? 'Client',
      workoutsCompleted,
      workoutsAssigned,
      prSummaries: prs.map((p) => `${p.exerciseName} ${p.achievement}`),
      regressionSummaries: regressions.map((r) => r.note),
      lastLoginIso,
      lastClientMessageIso,
      contextLogId: `client=${c.id} week=${weekStartIso}`,
    });

    out.push({
      clientId: c.id,
      clientName: c.name ?? 'Client',
      workoutsCompleted,
      workoutsAssigned,
      adherencePct,
      prsThisWeek: prs,
      regressions,
      lastLoginAt: lastLoginIso,
      lastClientMessageAt: lastClientMessageIso,
      aiNote,
    });
  }

  return {
    weekStartIso,
    weekEndIso: new Date(endMs).toISOString().slice(0, 10),
    generatedAt: new Date().toISOString(),
    clients: out,
  };
}
