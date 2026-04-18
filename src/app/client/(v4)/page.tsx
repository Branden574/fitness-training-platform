import Link from 'next/link';
import { Flame, Play, Check, ChevronRight } from 'lucide-react';
import { requireClientSession, getClientContext, startOfToday, startOfWeek } from '@/lib/client-data';
import { prisma } from '@/lib/prisma';
import { Avatar, Chip } from '@/components/ui/mf';
import { Btn } from '@/components/ui/mf';

export const dynamic = 'force-dynamic';

async function getTodayData(userId: string) {
  const today = startOfToday();
  const weekStart = startOfWeek();
  const thirty = new Date();
  thirty.setDate(thirty.getDate() - 30);

  const [nextSession, weekSessions, streakSessions, bodyWeight, coachNote] = await Promise.all([
    // The most recent not-completed session, else the most recent completed one
    prisma.workoutSession.findFirst({
      where: { userId, completed: false },
      orderBy: { startTime: 'desc' },
      include: {
        workout: {
          include: {
            exercises: {
              orderBy: { order: 'asc' },
              include: { exercise: { select: { id: true, name: true } } },
            },
          },
        },
      },
    }),
    // This week's completed sessions count
    prisma.workoutSession.count({
      where: {
        userId,
        completed: true,
        startTime: { gte: weekStart },
      },
    }),
    // For streak: last 30 days of completed sessions
    prisma.workoutSession.findMany({
      where: {
        userId,
        completed: true,
        startTime: { gte: thirty },
      },
      select: { startTime: true },
      orderBy: { startTime: 'desc' },
    }),
    // Latest body weight entry
    prisma.progressEntry.findFirst({
      where: { userId, weight: { not: null } },
      orderBy: { date: 'desc' },
      select: { weight: true, date: true },
    }),
    // Latest message from the trainer
    prisma.message.findFirst({
      where: { receiverId: userId },
      orderBy: { createdAt: 'desc' },
      include: { sender: { select: { id: true, name: true, role: true } } },
    }),
  ]);

  const streak = computeStreak(streakSessions.map((s) => s.startTime));
  const weekDaysDone = computeWeekDays(streakSessions.map((s) => s.startTime), weekStart);

  // 30-day old weight for the trend delta
  let trendDelta: string | null = null;
  if (bodyWeight?.weight) {
    const old = await prisma.progressEntry.findFirst({
      where: { userId, weight: { not: null }, date: { lte: thirty } },
      orderBy: { date: 'desc' },
      select: { weight: true },
    });
    if (old?.weight) {
      const diff = bodyWeight.weight - old.weight;
      if (Math.abs(diff) >= 0.1) {
        const sign = diff > 0 ? '▲' : '▼';
        trendDelta = `${sign} ${Math.abs(diff).toFixed(1)} LB / 30D`;
      }
    }
  }

  return {
    nextSession,
    weekSessions,
    weekDaysDone,
    streak,
    bodyWeight: bodyWeight?.weight ?? null,
    trendDelta,
    coachNote: coachNote?.sender.role === 'TRAINER' ? coachNote : null,
    today,
  };
}

function computeStreak(dates: Date[]): number {
  if (!dates.length) return 0;
  const days = new Set<string>();
  for (const d of dates) {
    const key = d.toISOString().slice(0, 10);
    days.add(key);
  }
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function computeWeekDays(dates: Date[], weekStart: Date): boolean[] {
  const keys = new Set(dates.map((d) => d.toISOString().slice(0, 10)));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return keys.has(d.toISOString().slice(0, 10));
  });
}

function formatDate(d: Date): string {
  return d
    .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    .toUpperCase();
}

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

export default async function ClientTodayPage() {
  const session = await requireClientSession();
  const [ctx, data] = await Promise.all([
    getClientContext(session.user.id),
    getTodayData(session.user.id),
  ]);

  const firstName = ctx.name?.split(' ')[0] ?? 'there';
  const workoutExercises = data.nextSession?.workout.exercises ?? [];
  const exerciseCount = workoutExercises.length;
  const weeklyTarget = 5;
  const todayWeekdayIdx = (() => {
    const day = new Date().getDay();
    return day === 0 ? 6 : day - 1;
  })();

  return (
    <main style={{ padding: '12px 0' }}>
      {/* Header */}
      <div style={{ padding: '8px 20px 12px' }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="mf-eyebrow">{formatDate(new Date())}</div>
            <div
              className="mf-font-display"
              style={{
                fontSize: 26,
                lineHeight: 1,
                marginTop: 4,
                textTransform: 'uppercase',
                letterSpacing: '-0.01em',
              }}
            >
              Morning, {firstName}.
            </div>
          </div>
          <Link href="/client/profile">
            <Avatar initials={ctx.initials} size={36} />
          </Link>
        </div>

        {/* Streak strip */}
        <div
          className="mf-card-elev flex items-center justify-between"
          style={{ marginTop: 16, padding: 12 }}
        >
          <div className="flex items-center gap-3">
            <div
              className="grid place-items-center"
              style={{
                width: 36,
                height: 36,
                borderRadius: 4,
                background: 'rgba(255,77,28,0.12)',
              }}
            >
              <Flame size={18} className="mf-accent" />
            </div>
            <div>
              <div
                className="mf-font-display mf-tnum"
                style={{ fontSize: 20, lineHeight: 1 }}
              >
                {data.streak} DAY STREAK
              </div>
              <div
                className="mf-font-mono mf-fg-mute"
                style={{ fontSize: 11, marginTop: 2 }}
              >
                {data.streak > 0 ? "DON'T BREAK IT" : 'LOG TODAY TO START'}
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            {DAY_LETTERS.map((d, i) => {
              const done = data.weekDaysDone[i];
              const isToday = i === todayWeekdayIdx;
              return (
                <div key={i} className="text-center" style={{ width: 20 }}>
                  <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 9, marginBottom: 4 }}>
                    {d}
                  </div>
                  <div
                    className="grid place-items-center"
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      background: done
                        ? 'var(--mf-accent)'
                        : isToday
                          ? 'rgba(255,77,28,0.25)'
                          : 'var(--mf-surface-3)',
                      margin: '0 auto',
                    }}
                  >
                    {done && <Check size={10} style={{ color: 'var(--mf-accent-ink)' }} />}
                    {isToday && !done && (
                      <span
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: '50%',
                          background: 'var(--mf-accent)',
                        }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Today's session */}
      <div style={{ padding: '0 20px' }}>
        <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
          TODAY&apos;S SESSION
        </div>
        {data.nextSession ? (
          <div
            className="mf-card-elev"
            style={{
              padding: 16,
              borderColor: 'var(--mf-accent)',
              background: 'linear-gradient(180deg, rgba(255,77,28,0.06), transparent 40%)',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div className="flex items-start justify-between" style={{ marginBottom: 12 }}>
              <div>
                <div
                  className="mf-font-mono mf-fg-mute"
                  style={{
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                  }}
                >
                  {data.nextSession.workout.type} · {data.nextSession.workout.difficulty}
                </div>
                <div
                  className="mf-font-display"
                  style={{
                    fontSize: 24,
                    lineHeight: 1.1,
                    marginTop: 4,
                    textTransform: 'uppercase',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {data.nextSession.workout.title}
                </div>
              </div>
              <Chip kind="live">READY</Chip>
            </div>
            <div className="grid grid-cols-3 gap-2" style={{ marginBottom: 16 }}>
              <div>
                <div className="mf-eyebrow">DURATION</div>
                <div className="mf-font-display mf-tnum" style={{ fontSize: 20 }}>
                  {data.nextSession.workout.duration} MIN
                </div>
              </div>
              <div>
                <div className="mf-eyebrow">EXERCISES</div>
                <div className="mf-font-display mf-tnum" style={{ fontSize: 20 }}>
                  {exerciseCount}
                </div>
              </div>
              <div>
                <div className="mf-eyebrow">TYPE</div>
                <div className="mf-font-display mf-tnum" style={{ fontSize: 20 }}>
                  {data.nextSession.workout.type.slice(0, 4)}
                </div>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              {workoutExercises.slice(0, 4).map((we, i) => (
                <div
                  key={we.id}
                  className="flex items-center justify-between"
                  style={{
                    padding: '6px 0',
                    borderBottom:
                      i < Math.min(3, workoutExercises.length - 1)
                        ? '1px solid var(--mf-hairline)'
                        : 'none',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="mf-font-mono mf-fg-mute"
                      style={{ fontSize: 10, width: 16 }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span style={{ fontSize: 14 }}>{we.exercise.name}</span>
                  </div>
                  <span
                    className="mf-font-mono mf-fg-dim mf-tnum"
                    style={{ fontSize: 11 }}
                  >
                    {we.sets}×{we.reps ?? '—'}
                  </span>
                </div>
              ))}
              {workoutExercises.length > 4 && (
                <div
                  className="mf-font-mono mf-fg-mute"
                  style={{ fontSize: 11, paddingTop: 4 }}
                >
                  + {workoutExercises.length - 4} MORE
                </div>
              )}
            </div>
            <Link href={`/client/workout/${data.nextSession.id}`} style={{ display: 'block' }}>
              <Btn variant="primary" icon={Play} className="w-full" style={{ height: 48 }}>
                START SESSION
              </Btn>
            </Link>
          </div>
        ) : (
          <div className="mf-card" style={{ padding: 24, textAlign: 'center' }}>
            <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
              NOTHING SCHEDULED
            </div>
            <div className="mf-fg-dim" style={{ fontSize: 13 }}>
              Your trainer hasn&apos;t assigned a session for today. Check your program or
              message them to sort it out.
            </div>
          </div>
        )}

        {/* Coach note */}
        {data.coachNote && (
          <div
            className="mf-card flex gap-3"
            style={{ padding: 12, marginTop: 16 }}
          >
            <Avatar
              initials={(data.coachNote.sender.name ?? 'BM')
                .split(' ')
                .map((s) => s[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
              size={32}
            />
            <div style={{ flex: 1 }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>
                  {data.coachNote.sender.name ?? 'Coach'} · Coach
                </span>
                <span
                  className="mf-font-mono mf-fg-mute"
                  style={{ fontSize: 10 }}
                >
                  {relativeTime(data.coachNote.createdAt)}
                </span>
              </div>
              <div className="mf-fg-dim" style={{ fontSize: 14, lineHeight: 1.5 }}>
                {data.coachNote.content}
              </div>
            </div>
          </div>
        )}

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-3" style={{ marginTop: 16, marginBottom: 24 }}>
          <div className="mf-card" style={{ padding: 12 }}>
            <div className="mf-eyebrow" style={{ marginBottom: 4 }}>
              THIS WEEK
            </div>
            <div
              className="mf-font-display mf-tnum"
              style={{ fontSize: 28, lineHeight: 1 }}
            >
              {data.weekSessions}
              <span className="mf-fg-mute" style={{ fontSize: 14 }}>
                /{weeklyTarget}
              </span>
            </div>
            <div
              className="mf-font-mono mf-fg-mute"
              style={{ fontSize: 10, marginTop: 4 }}
            >
              SESSIONS
            </div>
          </div>
          <div className="mf-card" style={{ padding: 12 }}>
            <div className="mf-eyebrow" style={{ marginBottom: 4 }}>
              BODY WEIGHT
            </div>
            <div
              className="mf-font-display mf-tnum"
              style={{ fontSize: 28, lineHeight: 1 }}
            >
              {data.bodyWeight != null ? data.bodyWeight.toFixed(1) : '—'}
            </div>
            <div
              className="mf-font-mono"
              style={{
                fontSize: 10,
                marginTop: 4,
                color: data.trendDelta?.startsWith('▼')
                  ? 'var(--mf-green)'
                  : data.trendDelta?.startsWith('▲')
                    ? 'var(--mf-red)'
                    : 'var(--mf-fg-mute)',
              }}
            >
              {data.trendDelta ?? 'LOG WEIGHT IN PROGRESS'}
            </div>
          </div>
        </div>

        {/* Secondary cards */}
        <Link
          href="/client/program"
          className="mf-card flex items-center justify-between"
          style={{ padding: 12, marginBottom: 12 }}
        >
          <div>
            <div className="mf-eyebrow">YOUR PROGRAM</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>View full schedule</div>
          </div>
          <ChevronRight size={16} className="mf-fg-mute" />
        </Link>
        <Link
          href="/client/messages"
          className="mf-card flex items-center justify-between"
          style={{ padding: 12, marginBottom: 24 }}
        >
          <div>
            <div className="mf-eyebrow">COACH</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>
              {ctx.trainer?.name ?? 'Message your coach'}
            </div>
          </div>
          <ChevronRight size={16} className="mf-fg-mute" />
        </Link>
      </div>
    </main>
  );
}

function relativeTime(d: Date): string {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'JUST NOW';
  if (mins < 60) return `${mins}M AGO`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}H AGO`;
  const days = Math.floor(hours / 24);
  return `${days}D AGO`;
}
