import { getClientContext, requireClientSession, startOfWeek } from '@/lib/client-data';
import { prisma } from '@/lib/prisma';
import ProgressMobile, { type ProgressMobileData } from './progress-mobile';
import ProgressDesktop, { type ProgressDesktopData } from './progress-desktop';

export const dynamic = 'force-dynamic';

const TOP_LIFTS = ['bench', 'squat', 'deadlift'] as const;

function matchLift(name: string): (typeof TOP_LIFTS)[number] | null {
  const n = name.toLowerCase();
  if (/bench\s*press/.test(n)) return 'bench';
  if (/deadlift/.test(n)) return 'deadlift';
  if (/(back\s*)?squat/.test(n) && !/split/.test(n)) return 'squat';
  return null;
}

interface SeriesPoint {
  weekLabel: string;
  value: number;
}

async function getProgressData(userId: string): Promise<ProgressDesktopData> {
  const twelveWeeks = new Date();
  twelveWeeks.setDate(twelveWeeks.getDate() - 12 * 7);

  const hundredEighty = new Date();
  hundredEighty.setDate(hundredEighty.getDate() - 180);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    bodyweightEntries,
    bodyweightEntries180,
    liftLogs,
    recentEntry,
    completedSessions,
    completedSessions180,
  ] = await Promise.all([
    prisma.progressEntry.findMany({
      where: { userId, weight: { not: null }, date: { gte: twelveWeeks } },
      orderBy: { date: 'asc' },
      select: { weight: true, date: true, bodyFat: true, mood: true, energy: true, sleep: true },
    }),
    prisma.progressEntry.findMany({
      where: { userId, weight: { not: null }, date: { gte: hundredEighty } },
      orderBy: { date: 'asc' },
      select: { weight: true, date: true },
    }),
    prisma.workoutProgress.findMany({
      where: {
        userId,
        date: { gte: hundredEighty },
        weight: { not: null },
      },
      orderBy: { date: 'asc' },
      select: { date: true, weight: true, reps: true, exercise: { select: { name: true } } },
    }),
    prisma.progressEntry.findFirst({
      where: { userId },
      orderBy: { date: 'desc' },
      select: { weight: true, bodyFat: true, mood: true, energy: true, sleep: true, date: true },
    }),
    prisma.workoutSession.findMany({
      where: { userId, completed: true, startTime: { gte: twelveWeeks } },
      select: { startTime: true },
    }),
    prisma.workoutSession.findMany({
      where: { userId, completed: true, startTime: { gte: hundredEighty } },
      select: { startTime: true },
    }),
  ]);

  const bodyweightSeries = bucketIntoWeeks(
    bodyweightEntries
      .filter((e) => e.weight != null)
      .map((e) => ({ date: e.date, value: e.weight! })),
  );

  // Per-lift 12-week series (peak per week)
  const liftsFor12w = liftLogs.filter((l) => l.date >= twelveWeeks);
  const byLift: Record<(typeof TOP_LIFTS)[number], SeriesPoint[]> = {
    bench: [],
    squat: [],
    deadlift: [],
  };
  for (const lift of TOP_LIFTS) {
    const matched = liftsFor12w
      .filter((l) => matchLift(l.exercise.name) === lift && l.weight != null)
      .map((l) => ({ date: l.date, value: l.weight! }));
    byLift[lift] = bucketIntoWeeks(matched, 'max');
  }

  const compliance = buildCompliance(completedSessions.map((s) => s.startTime));
  const heatmap180 = build180Heatmap(completedSessions180.map((s) => s.startTime));

  // PR timeline (all-time within lift logs loaded)
  const prTimeline = buildPRTimeline(liftLogs);

  // PRs that occurred in the last 30 days
  const prsThisMonth = buildAllPREvents(liftLogs).filter(
    (e) => e.date >= thirtyDaysAgo,
  ).length;

  const daysWithSession = new Set(
    completedSessions.map((s) => s.startTime.toISOString().slice(0, 10)),
  );
  const totalWorkoutDays = 60; // ~5/wk * 12wk target
  const adherencePct = Math.min(
    100,
    Math.round((daysWithSession.size / totalWorkoutDays) * 100),
  );

  // Streak: consecutive days back from today with a completed session
  const sessionDaySet = new Set(
    completedSessions180.map((s) => s.startTime.toISOString().slice(0, 10)),
  );
  let streak = 0;
  {
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    while (sessionDaySet.has(cursor.toISOString().slice(0, 10))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  // Week sessions (current week)
  const weekStart = startOfWeek();
  const weekSessions = completedSessions.filter(
    (s) => s.startTime >= weekStart,
  ).length;

  // Body-weight sparkline: most recent 12 entries (trimmed from 180-day bucket)
  const bwSparkline = bodyweightEntries180
    .map((e) => e.weight!)
    .slice(-12);

  // BW trend delta vs 30 days ago (for KPI)
  let bwTrendDelta: string | null = null;
  const latestBW = recentEntry?.weight ?? null;
  if (latestBW != null) {
    const priorBW = bodyweightEntries180.find((e) => e.date <= thirtyDaysAgo)?.weight;
    if (priorBW != null) {
      const diff = latestBW - priorBW;
      if (Math.abs(diff) >= 0.1) {
        const sign = diff > 0 ? '▲' : '▼';
        bwTrendDelta = `${sign} ${Math.abs(diff).toFixed(1)} LB / 30D`;
      }
    }
  }

  const benchDelta = seriesDelta(byLift.bench);
  const bwDelta = seriesDelta(bodyweightSeries);

  return {
    bodyweightSeries,
    benchSeries: byLift.bench,
    squatSeries: byLift.squat,
    deadliftSeries: byLift.deadlift,
    compliance,
    prTimeline,
    adherencePct,
    sessionCount: completedSessions.length,
    recentEntry: recentEntry ?? null,
    benchDelta,
    bwDelta,
    heatmap180,
    prsThisMonth,
    streak,
    weekSessions,
    bodyWeight: latestBW,
    bwTrendDelta,
    bwSparkline,
  };
}

function bucketIntoWeeks(
  points: Array<{ date: Date; value: number }>,
  agg: 'avg' | 'max' = 'avg',
): SeriesPoint[] {
  const weeks: Map<number, number[]> = new Map();
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const weekStart = startOfWeek(now);

  for (const p of points) {
    const diffDays = Math.floor((weekStart.getTime() - p.date.getTime()) / 86400000);
    const weeksAgo = Math.floor(diffDays / 7);
    if (weeksAgo < 0 || weeksAgo > 11) continue;
    const bucket = 11 - weeksAgo;
    const arr = weeks.get(bucket) ?? [];
    arr.push(p.value);
    weeks.set(bucket, arr);
  }

  const series: SeriesPoint[] = [];
  for (let i = 0; i < 12; i++) {
    const vals = weeks.get(i);
    if (!vals?.length) continue;
    const v = agg === 'max' ? Math.max(...vals) : vals.reduce((a, b) => a + b, 0) / vals.length;
    series.push({ weekLabel: `W${i + 1}`, value: Number(v.toFixed(1)) });
  }
  return series;
}

function buildCompliance(dates: Date[]): number[][] {
  // 7 rows (Mon..Sun) x 12 cols (12 weeks ago → current week)
  const grid: number[][] = Array.from({ length: 7 }, () => Array(12).fill(0));
  const todayStart = startOfWeek();
  for (const d of dates) {
    const diff = Math.floor((todayStart.getTime() - d.getTime()) / 86400000);
    const weeksAgo = Math.floor(diff / 7);
    if (weeksAgo < 0 || weeksAgo > 11) continue;
    const col = 11 - weeksAgo;
    const day = d.getDay();
    const row = day === 0 ? 6 : day - 1;
    grid[row]![col] = 1;
  }
  return grid;
}

function build180Heatmap(dates: Date[]): number[][] {
  // 26 weeks x 7 rows. Binary 0/1 for now (completion); the Heatmap primitive
  // interpolates opacity on values > 0.
  const cols = 26;
  const grid: number[][] = Array.from({ length: 7 }, () => Array(cols).fill(0));
  const weekStart = startOfWeek();
  for (const d of dates) {
    const diff = Math.floor((weekStart.getTime() - d.getTime()) / 86400000);
    const weeksAgo = Math.floor(diff / 7);
    if (weeksAgo < 0 || weeksAgo > cols - 1) continue;
    const col = cols - 1 - weeksAgo;
    const day = d.getDay();
    const row = day === 0 ? 6 : day - 1;
    grid[row]![col] = Math.min(1, (grid[row]![col] ?? 0) + 1);
  }
  return grid;
}

interface PREvent {
  date: Date;
  lift: string;
  weight: number;
  reps: number | null;
  delta: number;
}

function buildAllPREvents(
  logs: Array<{
    date: Date;
    weight: number | null;
    reps: number | null;
    exercise: { name: string };
  }>,
): PREvent[] {
  const best: Record<string, { weight: number }> = {};
  const events: PREvent[] = [];
  for (const l of logs) {
    if (l.weight == null) continue;
    const key = l.exercise.name;
    const prev = best[key];
    if (!prev || l.weight > prev.weight) {
      const delta = prev ? l.weight - prev.weight : 0;
      best[key] = { weight: l.weight };
      if (delta > 0 || !prev) {
        events.push({ date: l.date, lift: key, weight: l.weight, reps: l.reps, delta });
      }
    }
  }
  return events;
}

function buildPRTimeline(
  logs: Array<{
    date: Date;
    weight: number | null;
    reps: number | null;
    exercise: { name: string };
  }>,
): Array<{ date: string; lift: string; weight: string; delta: string }> {
  return buildAllPREvents(logs)
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 5)
    .map((e) => ({
      date: e.date
        .toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })
        .replace('/', '.'),
      lift: e.lift,
      weight: `${e.weight} lb${e.reps ? ` × ${e.reps}` : ''}`,
      delta: e.delta > 0 ? `+${e.delta} lb` : 'NEW',
    }));
}

function seriesDelta(series: SeriesPoint[]): string | null {
  if (series.length < 2) return null;
  const diff = series[series.length - 1]!.value - series[0]!.value;
  if (Math.abs(diff) < 0.1) return null;
  const sign = diff > 0 ? '+' : '−';
  return `${sign}${Math.abs(diff).toFixed(1)} / ${series.length}W`;
}

export default async function ClientProgressPage() {
  const session = await requireClientSession();
  const [ctx, data] = await Promise.all([
    getClientContext(session.user.id),
    getProgressData(session.user.id),
  ]);

  const mobileData: ProgressMobileData = {
    bodyweightSeries: data.bodyweightSeries,
    benchSeries: data.benchSeries,
    squatSeries: data.squatSeries,
    deadliftSeries: data.deadliftSeries,
    compliance: data.compliance,
    prTimeline: data.prTimeline,
    adherencePct: data.adherencePct,
    sessionCount: data.sessionCount,
    recentEntry: data.recentEntry,
    benchDelta: data.benchDelta,
    bwDelta: data.bwDelta,
  };

  return (
    <>
      <ProgressMobile data={mobileData} />
      <ProgressDesktop ctx={ctx} data={data} />
    </>
  );
}
