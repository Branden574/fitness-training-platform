import { Trophy, Filter } from 'lucide-react';
import { requireClientSession, startOfWeek } from '@/lib/client-data';
import { prisma } from '@/lib/prisma';
import { Chip, Heatmap, LineChart } from '@/components/ui/mf';
import ProgressMetricTabsClient from './metric-tabs-client';

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

async function getProgressData(userId: string) {
  const twelveWeeks = new Date();
  twelveWeeks.setDate(twelveWeeks.getDate() - 12 * 7);

  const [bodyweightEntries, liftLogs, recentEntries] = await Promise.all([
    prisma.progressEntry.findMany({
      where: { userId, weight: { not: null }, date: { gte: twelveWeeks } },
      orderBy: { date: 'asc' },
      select: { weight: true, date: true, bodyFat: true, mood: true, energy: true, sleep: true },
    }),
    prisma.workoutProgress.findMany({
      where: {
        userId,
        date: { gte: twelveWeeks },
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
  ]);

  const bodyweightSeries = bucketIntoWeeks(
    bodyweightEntries
      .filter((e) => e.weight != null)
      .map((e) => ({ date: e.date, value: e.weight! })),
  );

  // Per-lift series: peak weight achieved per week per lift
  const byLift: Record<(typeof TOP_LIFTS)[number], SeriesPoint[]> = {
    bench: [],
    squat: [],
    deadlift: [],
  };

  for (const lift of TOP_LIFTS) {
    const matched = liftLogs
      .filter((l) => matchLift(l.exercise.name) === lift && l.weight != null)
      .map((l) => ({ date: l.date, value: l.weight! }));
    byLift[lift] = bucketIntoWeeks(matched, 'max');
  }

  // Compliance: presence of any completed workout per day over 12 weeks (7x12 grid)
  const completedSessions = await prisma.workoutSession.findMany({
    where: { userId, completed: true, startTime: { gte: twelveWeeks } },
    select: { startTime: true },
  });
  const compliance = buildCompliance(completedSessions.map((s) => s.startTime));

  // PR timeline: latest 5 heaviest lifts per exercise
  const prTimeline = buildPRTimeline(liftLogs);

  // 12-week adherence %
  const daysWithSession = new Set(
    completedSessions.map((s) => s.startTime.toISOString().slice(0, 10)),
  );
  const totalWorkoutDays = 60; // ~5/wk * 12wk target
  const adherencePct = Math.min(
    100,
    Math.round((daysWithSession.size / totalWorkoutDays) * 100),
  );

  return {
    bodyweightSeries,
    benchSeries: byLift.bench,
    squatSeries: byLift.squat,
    deadliftSeries: byLift.deadlift,
    compliance,
    prTimeline,
    adherencePct,
    sessionCount: completedSessions.length,
    recentEntry: recentEntries,
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
    const bucket = 11 - weeksAgo; // 0..11 oldest→newest
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

function buildPRTimeline(
  logs: Array<{
    date: Date;
    weight: number | null;
    reps: number | null;
    exercise: { name: string };
  }>,
): Array<{ date: string; lift: string; weight: string; delta: string }> {
  const best: Record<string, { date: Date; weight: number; reps: number | null }> = {};
  const events: Array<{ date: Date; lift: string; weight: number; reps: number | null; delta: number }> = [];

  for (const l of logs) {
    if (l.weight == null) continue;
    const key = l.exercise.name;
    const prev = best[key];
    if (!prev || l.weight > prev.weight) {
      const delta = prev ? l.weight - prev.weight : 0;
      best[key] = { date: l.date, weight: l.weight, reps: l.reps };
      if (delta > 0 || !prev) {
        events.push({ date: l.date, lift: key, weight: l.weight, reps: l.reps, delta });
      }
    }
  }

  return events
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 5)
    .map((e) => ({
      date: e.date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }).replace('/', '.'),
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
  const data = await getProgressData(session.user.id);

  // Pick the metric with the most recent PR as "hero"
  const hero = data.prTimeline[0];

  const benchDelta = seriesDelta(data.benchSeries);
  const bwDelta = seriesDelta(data.bodyweightSeries);

  // Build metric payload for client-side tabs
  const metrics = {
    bench: {
      label: 'BENCH',
      long: 'BENCH · 1RM EST',
      data: data.benchSeries.map((p) => p.value),
      labels: data.benchSeries.map((p) => p.weekLabel),
      unit: 'LB',
    },
    squat: {
      label: 'SQUAT',
      long: 'SQUAT · 1RM EST',
      data: data.squatSeries.map((p) => p.value),
      labels: data.squatSeries.map((p) => p.weekLabel),
      unit: 'LB',
    },
    deadlift: {
      label: 'DEAD',
      long: 'DEADLIFT · 1RM EST',
      data: data.deadliftSeries.map((p) => p.value),
      labels: data.deadliftSeries.map((p) => p.weekLabel),
      unit: 'LB',
    },
    bw: {
      label: 'BW',
      long: 'BODYWEIGHT',
      data: data.bodyweightSeries.map((p) => p.value),
      labels: data.bodyweightSeries.map((p) => p.weekLabel),
      unit: 'LB',
    },
  };

  const recent = data.recentEntry;

  return (
    <main style={{ padding: '12px 0 24px' }}>
      <div
        className="flex items-center justify-between"
        style={{ padding: '12px 20px 8px' }}
      >
        <div>
          <div className="mf-eyebrow">PROGRESS</div>
          <div
            className="mf-font-display"
            style={{
              fontSize: 22,
              letterSpacing: '-0.01em',
              textTransform: 'uppercase',
            }}
          >
            Scoreboard
          </div>
        </div>
        <button
          className="mf-btn mf-btn-ghost"
          style={{ height: 32, width: 32, padding: 0 }}
          aria-label="Filter"
        >
          <Filter size={16} />
        </button>
      </div>

      <div style={{ padding: '0 20px' }}>
        {/* Hero PR card */}
        {hero ? (
          <div
            className="mf-card-elev"
            style={{
              padding: 16,
              marginBottom: 16,
              background: 'linear-gradient(180deg, rgba(255,77,28,0.08), transparent 50%)',
              borderColor: 'var(--mf-accent)',
            }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
              <Chip kind="live">NEW PR · {hero.date}</Chip>
              <Trophy size={18} className="mf-accent" />
            </div>
            <div
              className="mf-font-display mf-tnum mf-accent"
              style={{ fontSize: 56, lineHeight: 1 }}
            >
              {hero.weight.split(' ')[0]}
            </div>
            <div
              className="mf-font-display"
              style={{
                fontSize: 18,
                marginTop: 4,
                textTransform: 'uppercase',
              }}
            >
              {hero.weight.replace(/^\d+\s*/, 'LB × ').toUpperCase()} · {hero.lift.toUpperCase()}
            </div>
            <div
              className="mf-font-mono mf-fg-mute"
              style={{ fontSize: 11, marginTop: 8 }}
            >
              {hero.delta.toUpperCase()}
            </div>
          </div>
        ) : (
          <div className="mf-card" style={{ padding: 16, marginBottom: 16, textAlign: 'center' }}>
            <div className="mf-eyebrow" style={{ marginBottom: 8 }}>NO PRS YET</div>
            <div className="mf-fg-dim" style={{ fontSize: 13 }}>
              Log workouts and PRs will auto-surface here.
            </div>
          </div>
        )}

        {/* Metric tabs + chart */}
        <ProgressMetricTabsClient metrics={metrics} benchDelta={benchDelta} bwDelta={bwDelta} />

        {/* Compliance heatmap */}
        <div className="mf-card" style={{ padding: 12, marginTop: 16 }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
            <div>
              <div className="mf-eyebrow">ADHERENCE</div>
              <div className="mf-font-display mf-tnum" style={{ fontSize: 22, lineHeight: 1, marginTop: 2 }}>
                {data.adherencePct}
                <span className="mf-fg-mute" style={{ fontSize: 12 }}>%</span>
              </div>
            </div>
            <span className="mf-font-mono mf-fg-mute" style={{ fontSize: 10 }}>
              12 WK · {data.sessionCount} SESSIONS
            </span>
          </div>
          <Heatmap cells={data.compliance} />
        </div>

        {/* PR Timeline */}
        {data.prTimeline.length > 0 && (
          <>
            <div className="mf-eyebrow" style={{ marginTop: 16, marginBottom: 8 }}>
              PR TIMELINE
            </div>
            <div className="mf-card" style={{ overflow: 'hidden', marginBottom: 16 }}>
              {data.prTimeline.map((p, i) => (
                <div
                  key={`${p.lift}-${p.date}`}
                  className="flex items-center"
                  style={{
                    padding: '10px 12px',
                    borderBottom: i < data.prTimeline.length - 1 ? '1px solid var(--mf-hairline)' : 'none',
                  }}
                >
                  <div
                    className="mf-font-mono mf-fg-mute mf-tnum"
                    style={{ fontSize: 10, width: 40 }}
                  >
                    {p.date}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{p.lift}</div>
                    <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 10 }}>
                      {p.weight}
                    </div>
                  </div>
                  <span
                    className="mf-font-mono"
                    style={{ fontSize: 10, fontWeight: 600, color: 'var(--mf-green)' }}
                  >
                    {p.delta}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Body stats */}
        <div className="mf-eyebrow" style={{ marginBottom: 8 }}>BODY STATS</div>
        <div className="grid grid-cols-2 gap-2">
          <BodyStat
            label="Weight"
            unit="LB"
            value={recent?.weight?.toFixed(1) ?? '—'}
            delta={bwDelta}
            good={bwDelta?.startsWith('−') ?? null}
          />
          <BodyStat
            label="Body Fat"
            unit="%"
            value={recent?.bodyFat?.toFixed(1) ?? '—'}
            delta={null}
            good={null}
          />
          <BodyStat
            label="Sleep"
            unit="HR"
            value={recent?.sleep?.toFixed(1) ?? '—'}
            delta={null}
            good={null}
          />
          <BodyStat
            label="Mood"
            unit="/10"
            value={recent?.mood != null ? String(recent.mood) : '—'}
            delta={null}
            good={null}
          />
        </div>
      </div>
    </main>
  );
}

function BodyStat({
  label,
  unit,
  value,
  delta,
  good,
}: {
  label: string;
  unit: string;
  value: string;
  delta: string | null;
  good: boolean | null;
}) {
  return (
    <div className="mf-card" style={{ padding: 12 }}>
      <div className="mf-eyebrow" style={{ marginBottom: 4 }}>{label.toUpperCase()}</div>
      <div className="mf-font-display mf-tnum" style={{ fontSize: 22, lineHeight: 1 }}>
        {value}
        <span className="mf-fg-mute" style={{ fontSize: 11 }}> {unit}</span>
      </div>
      {delta ? (
        <div
          className="mf-font-mono"
          style={{
            fontSize: 10,
            marginTop: 4,
            color: good === true ? 'var(--mf-green)' : good === false ? 'var(--mf-red)' : 'var(--mf-fg-dim)',
          }}
        >
          {delta.startsWith('−') ? '▼' : '▲'} {delta.replace(/^[+−]/, '')}
        </div>
      ) : (
        <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 10, marginTop: 4 }}>
          —
        </div>
      )}
    </div>
  );
}
