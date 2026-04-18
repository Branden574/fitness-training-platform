import { notFound } from 'next/navigation';
import { requireTrainerSession, initialsFor } from '@/lib/trainer-data';
import { prisma } from '@/lib/prisma';
import ClientDetailDesktop from './client-detail-desktop';
import ClientDetailMobile, {
  type MobileRecentPR,
  type MobileTodaySession,
} from './client-detail-mobile';

export const dynamic = 'force-dynamic';

const TWELVE_WEEKS_MS = 12 * 7 * 86400000;

function startOfWeek(d = new Date()): Date {
  const s = new Date(d);
  const day = s.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  s.setDate(s.getDate() + diff);
  s.setHours(0, 0, 0, 0);
  return s;
}

function startOfDay(d = new Date()): Date {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  return s;
}

function matchLift(name: string): 'bench' | 'squat' | 'deadlift' | null {
  const n = name.toLowerCase();
  if (/bench\s*press/.test(n)) return 'bench';
  if (/deadlift/.test(n)) return 'deadlift';
  if (/(back\s*)?squat/.test(n) && !/split/.test(n)) return 'squat';
  return null;
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireTrainerSession();
  const { id } = await params;

  // Admins can view any client; trainers restricted to their own
  const whereClient = session.user.role === 'ADMIN'
    ? { id, role: 'CLIENT' as const }
    : { id, role: 'CLIENT' as const, trainerId: session.user.id };

  const client = await prisma.user.findFirst({
    where: whereClient,
    include: {
      clientProfile: true,
    },
  });
  if (!client) notFound();

  const twelveAgo = new Date(Date.now() - TWELVE_WEEKS_MS);
  const todayStart = startOfDay();
  const tomorrowStart = new Date(todayStart.getTime() + 86400000);
  const sevenDaysAgoStart = new Date(todayStart.getTime() - 6 * 86400000);
  const fourteenDaysAgoStart = new Date(todayStart.getTime() - 13 * 86400000);

  const [
    allSessions,
    liftLogs,
    recentSessions,
    notesFromTrainer,
    todaySessions,
    volumeLogs,
    prProgressLogs,
  ] = await Promise.all([
    prisma.workoutSession.findMany({
      where: {
        userId: id,
        completed: true,
        startTime: { gte: twelveAgo },
      },
      select: { startTime: true },
      orderBy: { startTime: 'desc' },
    }),
    prisma.workoutProgress.findMany({
      where: {
        userId: id,
        date: { gte: twelveAgo },
        weight: { not: null },
      },
      orderBy: { date: 'asc' },
      select: { date: true, weight: true, exercise: { select: { name: true } } },
    }),
    prisma.workoutSession.findMany({
      where: { userId: id, completed: true },
      orderBy: { startTime: 'desc' },
      take: 8,
      include: {
        workout: { select: { title: true, type: true } },
        workoutProgress: { select: { weight: true, reps: true, sets: true } },
      },
    }),
    prisma.coachNote.findMany({
      where: { clientId: id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, body: true, context: true, createdAt: true },
    }),
    prisma.workoutSession.findMany({
      where: {
        userId: id,
        startTime: { gte: todayStart, lt: tomorrowStart },
      },
      orderBy: { startTime: 'desc' },
      include: {
        workout: { select: { title: true } },
        workoutProgress: {
          select: { id: true, exerciseId: true, weight: true, reps: true, sets: true },
        },
      },
    }),
    prisma.workoutProgress.findMany({
      where: {
        userId: id,
        date: { gte: fourteenDaysAgoStart },
      },
      select: { date: true, weight: true, reps: true, sets: true },
    }),
    prisma.workoutProgress.findMany({
      where: { userId: id, weight: { not: null } },
      orderBy: { date: 'asc' },
      select: {
        date: true,
        weight: true,
        reps: true,
        exercise: { select: { name: true } },
      },
    }),
  ]);

  // Lift series weekly maxes
  const series: Record<'bench' | 'squat' | 'deadlift', number[]> = {
    bench: [],
    squat: [],
    deadlift: [],
  };
  const labels: string[] = Array.from({ length: 12 }, (_, i) => `W${i + 1}`);
  const weekStartNow = startOfWeek();
  const buckets: Record<'bench' | 'squat' | 'deadlift', number[][]> = {
    bench: Array.from({ length: 12 }, () => []),
    squat: Array.from({ length: 12 }, () => []),
    deadlift: Array.from({ length: 12 }, () => []),
  };

  for (const l of liftLogs) {
    const lift = matchLift(l.exercise.name);
    if (!lift || l.weight == null) continue;
    const diff = Math.floor((weekStartNow.getTime() - l.date.getTime()) / 86400000);
    const weeksAgo = Math.floor(diff / 7);
    if (weeksAgo < 0 || weeksAgo > 11) continue;
    const col = 11 - weeksAgo;
    buckets[lift][col]!.push(l.weight);
  }

  for (const k of ['bench', 'squat', 'deadlift'] as const) {
    series[k] = buckets[k].map((arr) => (arr.length ? Math.max(...arr) : 0));
  }

  const primarySeries = series.bench.filter((v) => v > 0).length > 1 ? series.bench : series.squat.filter((v) => v > 0).length > 1 ? series.squat : series.deadlift;
  const primaryLabel = series.bench.filter((v) => v > 0).length > 1 ? 'BENCH' : series.squat.filter((v) => v > 0).length > 1 ? 'SQUAT' : 'DEADLIFT';

  // Compliance heatmap (12w x 7d)
  const compliance: number[][] = Array.from({ length: 7 }, () => Array(12).fill(0));
  for (const s of allSessions) {
    const diff = Math.floor((weekStartNow.getTime() - s.startTime.getTime()) / 86400000);
    const weeksAgo = Math.floor(diff / 7);
    if (weeksAgo < 0 || weeksAgo > 11) continue;
    const col = 11 - weeksAgo;
    const day = s.startTime.getDay();
    const row = day === 0 ? 6 : day - 1;
    compliance[row]![col] = 1;
  }

  const totalWorkoutDays = 60;
  const uniqueDays = new Set(allSessions.map((s) => s.startTime.toISOString().slice(0, 10))).size;
  const adherencePct = Math.min(100, Math.round((uniqueDays / totalWorkoutDays) * 100));

  // Simple PR count: count unique exercise-weight maxes beating prior max (approximation)
  const prCount = liftLogs.reduce<{ best: Record<string, number>; n: number }>(
    (acc, l) => {
      if (l.weight == null) return acc;
      const prev = acc.best[l.exercise.name];
      if (prev == null || l.weight > prev) {
        if (prev != null) acc.n += 1;
        acc.best[l.exercise.name] = l.weight;
      }
      return acc;
    },
    { best: {}, n: 0 },
  ).n;

  // 30d streak
  const streakDays = computeStreak(allSessions.map((s) => s.startTime));

  const fullInitials = initialsFor(client.name, client.email);

  // ── Mobile-only derived data
  // 7-day volume per day (M/T/W/T/F/S/S style — actually last 7 days ending today)
  const prior7Volume: number[] = Array(7).fill(0);
  const prior7Labels: string[] = [];
  const previousWeekVolume: number[] = Array(7).fill(0);
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgoStart.getTime() + i * 86400000);
    const letter = d.toLocaleDateString('en-US', { weekday: 'short' })[0]!.toUpperCase();
    prior7Labels.push(letter);
  }
  for (const wp of volumeLogs) {
    const dayMs = startOfDay(wp.date).getTime();
    const vol = (wp.weight ?? 0) * (wp.reps ?? 0) * (wp.sets ?? 1);
    const diffFromToday = Math.floor((todayStart.getTime() - dayMs) / 86400000);
    if (diffFromToday >= 0 && diffFromToday <= 6) {
      const idx = 6 - diffFromToday;
      prior7Volume[idx] = (prior7Volume[idx] ?? 0) + vol;
    } else if (diffFromToday >= 7 && diffFromToday <= 13) {
      const idx = 13 - diffFromToday;
      previousWeekVolume[idx] = (previousWeekVolume[idx] ?? 0) + vol;
    }
  }
  const thisWeekTotal = prior7Volume.reduce((a, b) => a + b, 0);
  const prevWeekTotal = previousWeekVolume.reduce((a, b) => a + b, 0);
  const sevenDayVolumeDelta =
    prevWeekTotal > 0
      ? Math.round(((thisWeekTotal - prevWeekTotal) / prevWeekTotal) * 100)
      : thisWeekTotal > 0
        ? null
        : null;

  // Today's session (live if not completed with progress, or completed)
  let todaySession: MobileTodaySession | null = null;
  if (todaySessions.length > 0) {
    const ts = todaySessions[0]!;
    const exerciseIdsDone = new Set(ts.workoutProgress.map((wp) => wp.exerciseId));
    const exercisesDone = exerciseIdsDone.size;
    // Try to read planned exercise count from the workout
    const workoutWithExercises = await prisma.workout.findFirst({
      where: { id: ts.workoutId },
      select: { _count: { select: { workoutExercises: true } } },
    });
    const exercisesTotal = Math.max(
      exercisesDone,
      workoutWithExercises?._count.workoutExercises ?? exercisesDone,
    );
    const progressPct =
      exercisesTotal > 0
        ? Math.round((exercisesDone / exercisesTotal) * 100)
        : ts.completed
          ? 100
          : 0;
    const endedOrNow = ts.endTime ?? new Date();
    const minutesElapsed = Math.max(
      0,
      Math.round((endedOrNow.getTime() - ts.startTime.getTime()) / 60000),
    );
    todaySession = {
      id: ts.id,
      title: ts.workout.title,
      completed: ts.completed,
      inProgress: !ts.completed,
      minutesElapsed,
      progressPct,
      exercisesDone,
      exercisesTotal,
    };
  }

  // Recent PRs — track top 3 most recent all-time PR events
  const prEvents: MobileRecentPR[] = [];
  const bestByExercise = new Map<string, number>();
  for (const log of prProgressLogs) {
    if (log.weight == null) continue;
    const prev = bestByExercise.get(log.exercise.name);
    if (prev == null || log.weight > prev) {
      if (prev != null) {
        prEvents.push({
          exercise: log.exercise.name,
          weight: log.weight,
          reps: log.reps ?? 0,
          date: log.date,
          delta: Math.round((log.weight - prev) * 10) / 10,
        });
      }
      bestByExercise.set(log.exercise.name, log.weight);
    }
  }
  const recentPRs = prEvents
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 3);

  // Weeks since client started (bounded by completed session count)
  const createdMs = client.createdAt.getTime();
  const programWeeksCompleted = Math.max(
    0,
    Math.floor((Date.now() - createdMs) / (7 * 86400000)),
  );
  const programTotalWeeks = 12;
  const programWeek = Math.min(programTotalWeeks, programWeeksCompleted + 1);

  return (
    <>
      <ClientDetailDesktop
        clientId={id}
        clientName={client.name}
        clientEmail={client.email}
        createdAt={client.createdAt}
        fitnessLevel={client.clientProfile?.fitnessLevel ?? null}
        age={client.clientProfile?.age ?? null}
        weight={client.clientProfile?.weight ?? null}
        fullInitials={fullInitials}
        adherencePct={adherencePct}
        streakDays={streakDays}
        prCount={prCount}
        uniqueDays={uniqueDays}
        totalWorkoutDays={totalWorkoutDays}
        totalCompletedSessions={allSessions.length}
        primarySeries={primarySeries}
        primaryLabel={primaryLabel}
        labels={labels}
        compliance={compliance}
        recentSessions={recentSessions}
        initialNotes={notesFromTrainer.map((n) => ({
          id: n.id,
          body: n.body,
          context: n.context,
          createdAt: n.createdAt.toISOString(),
        }))}
      />
      <ClientDetailMobile
        clientId={id}
        clientName={client.name}
        clientEmail={client.email}
        fullInitials={fullInitials}
        fitnessLevel={client.clientProfile?.fitnessLevel ?? null}
        programWeek={programWeek}
        programTotalWeeks={programTotalWeeks}
        weight={client.clientProfile?.weight ?? null}
        adherencePct={adherencePct}
        streakDays={streakDays}
        prCount={prCount}
        programWeeksCompleted={programWeeksCompleted}
        sevenDayVolume={prior7Volume}
        sevenDayVolumeLabels={prior7Labels}
        sevenDayVolumeDelta={sevenDayVolumeDelta}
        todaySession={todaySession}
        recentPRs={recentPRs}
        prsInBlock={prCount}
      />
    </>
  );
}

function computeStreak(dates: Date[]): number {
  if (!dates.length) return 0;
  const days = new Set(dates.map((d) => d.toISOString().slice(0, 10)));
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
