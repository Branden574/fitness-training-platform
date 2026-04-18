import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MessageSquare, Edit, Plus } from 'lucide-react';
import { requireTrainerSession, initialsFor } from '@/lib/trainer-data';
import { prisma } from '@/lib/prisma';
import {
  Avatar,
  Btn,
  DesktopShell,
  Heatmap,
  LineChart,
} from '@/components/ui/mf';

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

  const [allSessions, liftLogs, recentSessions, notesFromTrainer] = await Promise.all([
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
    prisma.message.findMany({
      where: { senderId: session.user.id, receiverId: id },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { id: true, content: true, createdAt: true },
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

  const displayName = (client.name ?? client.email).toUpperCase();
  const fullInitials = initialsFor(client.name, client.email);

  return (
    <DesktopShell
      role="trainer"
      active="clientdetail"
      title={client.name ?? client.email}
      breadcrumbs={`ROSTER / ${(client.name ?? client.email).toUpperCase()}`}
      headerRight={
        <>
          <Link href="/trainer/messages">
            <Btn icon={MessageSquare}>Message</Btn>
          </Link>
          <Link href="/trainer/builder">
            <Btn variant="primary" icon={Edit}>Edit program</Btn>
          </Link>
        </>
      }
    >
      <div style={{ padding: 24, maxWidth: 1400 }}>
        {/* Hero */}
        <div
          className="mf-card-elev"
          style={{
            padding: 20,
            marginBottom: 24,
            display: 'grid',
            gridTemplateColumns: 'auto 1fr auto',
            gap: 24,
            alignItems: 'center',
          }}
        >
          <Avatar initials={fullInitials} size={72} active />
          <div>
            <div className="mf-eyebrow" style={{ marginBottom: 4 }}>
              COACHED · SINCE {client.createdAt.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }).replace(/\//g, '.')}
            </div>
            <div
              className="mf-font-display"
              style={{ fontSize: 36, lineHeight: 1, letterSpacing: '-0.01em', textTransform: 'uppercase' }}
            >
              {displayName}
            </div>
            <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 11, marginTop: 4 }}>
              {client.clientProfile?.fitnessLevel ?? '—'} ·{' '}
              {client.clientProfile?.age ? `${client.clientProfile.age}Y` : '—'} ·{' '}
              {client.clientProfile?.weight ? `${client.clientProfile.weight} LB` : '—'}
            </div>
          </div>
          <div className="flex gap-4">
            <HeroStat label="ADHERENCE" value={`${adherencePct}`} unit="%" />
            <div className="mf-vr" />
            <HeroStat label="STREAK" value={`${streakDays}`} accent />
            <div className="mf-vr" />
            <HeroStat label="PRS / 90D" value={`${prCount}`} />
          </div>
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {/* Strength chart */}
          <div className="mf-card" style={{ padding: 16, gridColumn: 'span 2' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
              <div>
                <div className="mf-eyebrow">BIG THREE · PEAK WEIGHT BY WEEK</div>
                <div className="mf-fg-dim" style={{ fontSize: 12, marginTop: 2 }}>
                  12 WEEKS · FROM LOGGED SETS
                </div>
              </div>
              <div className="mf-font-mono mf-fg-dim" style={{ fontSize: 10, letterSpacing: '0.1em' }}>
                SHOWING {primaryLabel}
              </div>
            </div>
            {primarySeries.some((v) => v > 0) ? (
              <LineChart data={primarySeries.map((v) => (v > 0 ? v : 0))} labels={labels} h={220} />
            ) : (
              <div
                className="mf-fg-mute mf-font-mono"
                style={{ padding: 48, textAlign: 'center', fontSize: 11, letterSpacing: '0.1em' }}
              >
                NO LIFT DATA YET
              </div>
            )}
          </div>

          {/* Adherence */}
          <div className="mf-card" style={{ padding: 16 }}>
            <div className="mf-eyebrow" style={{ marginBottom: 8 }}>ADHERENCE · 12 WK</div>
            <div className="mf-font-display mf-tnum" style={{ fontSize: 32, lineHeight: 1, marginBottom: 12 }}>
              {adherencePct}
              <span className="mf-fg-mute" style={{ fontSize: 14 }}>%</span>
            </div>
            <Heatmap cells={compliance} cell={14} />
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--mf-hairline)' }}>
              <Row label="Logged" value={`${allSessions.length}`} />
              <Row label="Unique days" value={`${uniqueDays} / ${totalWorkoutDays}`} />
              <Row label="PRs tracked" value={`${prCount}`} />
            </div>
          </div>

          {/* Recent sessions */}
          <div className="mf-card" style={{ padding: 16, gridColumn: 'span 2' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
              <div className="mf-eyebrow">RECENT SESSIONS</div>
              <span className="mf-font-mono mf-fg-mute" style={{ fontSize: 11 }}>
                {recentSessions.length} SHOWN
              </span>
            </div>
            {recentSessions.length === 0 && (
              <div
                className="mf-fg-mute mf-font-mono"
                style={{ padding: 32, textAlign: 'center', fontSize: 11, letterSpacing: '0.1em' }}
              >
                NO COMPLETED SESSIONS YET
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {recentSessions.map((s) => {
                const d = s.startTime;
                const mo = String(d.getMonth() + 1).padStart(2, '0');
                const dy = String(d.getDate()).padStart(2, '0');
                const weekday = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
                const durationMin = s.endTime
                  ? Math.round((s.endTime.getTime() - s.startTime.getTime()) / 60000)
                  : null;
                const totalVol = s.workoutProgress.reduce(
                  (acc, wp) => acc + (wp.weight ?? 0) * (wp.reps ?? 0) * (wp.sets ?? 1),
                  0,
                );
                return (
                  <div
                    key={s.id}
                    className="flex items-center gap-3"
                    style={{ padding: '8px 8px', borderRadius: 4 }}
                  >
                    <div className="mf-font-mono mf-fg-mute mf-tnum" style={{ fontSize: 11, width: 48 }}>
                      {mo}.{dy}
                    </div>
                    <div className="mf-font-mono mf-fg-dim" style={{ fontSize: 10, width: 32 }}>
                      {weekday}
                    </div>
                    <div style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{s.workout.title}</div>
                    <div className="mf-font-mono mf-fg-dim" style={{ fontSize: 11 }}>
                      {durationMin ? `${durationMin} MIN` : '—'}
                    </div>
                    <div
                      className="mf-font-display mf-tnum"
                      style={{ fontSize: 14, width: 96, textAlign: 'right' }}
                    >
                      {totalVol > 0 ? `${totalVol.toLocaleString()} LB` : '—'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Coach notes */}
          <div className="mf-card" style={{ padding: 16 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
              <div className="mf-eyebrow">COACH NOTES</div>
              <Link href={`/trainer/messages`}>
                <Btn variant="ghost" icon={Plus} style={{ height: 28, padding: '0 8px', fontSize: 11 }}>
                  Note
                </Btn>
              </Link>
            </div>
            {notesFromTrainer.length === 0 && (
              <div className="mf-fg-mute mf-font-mono" style={{ fontSize: 11, letterSpacing: '0.1em' }}>
                NO NOTES YET
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {notesFromTrainer.map((n) => (
                <div
                  key={n.id}
                  style={{ paddingLeft: 12, borderLeft: '2px solid var(--mf-accent)' }}
                >
                  <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 10 }}>
                    {n.createdAt.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }).replace('/', '.')}
                  </div>
                  <div className="mf-fg-dim" style={{ fontSize: 12, marginTop: 2, lineHeight: 1.5 }}>
                    {n.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DesktopShell>
  );
}

function HeroStat({ label, value, unit, accent }: { label: string; value: string; unit?: string; accent?: boolean }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div
        className="mf-font-display mf-tnum"
        style={{
          fontSize: 32,
          lineHeight: 1,
          color: accent ? 'var(--mf-accent)' : undefined,
        }}
      >
        {value}
        {unit ? <span className="mf-fg-mute" style={{ fontSize: 14 }}>{unit}</span> : null}
      </div>
      <div className="mf-eyebrow" style={{ marginTop: 4 }}>{label}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between" style={{ fontSize: 12, marginBottom: 4 }}>
      <span className="mf-fg-dim">{label}</span>
      <span className="mf-font-mono mf-tnum">{value}</span>
    </div>
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
