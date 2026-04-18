import Link from 'next/link';
import { Check, ChevronRight } from 'lucide-react';
import { requireClientSession, startOfWeek } from '@/lib/client-data';
import { prisma } from '@/lib/prisma';
import { Chip, Ring } from '@/components/ui/mf';

export const dynamic = 'force-dynamic';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

async function getProgramData(userId: string) {
  // Pull 4 weeks back → 4 weeks forward of sessions so the pill picker has content
  const fourBack = new Date();
  fourBack.setDate(fourBack.getDate() - 28);
  const fourForward = new Date();
  fourForward.setDate(fourForward.getDate() + 28);

  const sessions = await prisma.workoutSession.findMany({
    where: {
      userId,
      startTime: { gte: fourBack, lte: fourForward },
    },
    orderBy: { startTime: 'asc' },
    include: {
      workout: { select: { id: true, title: true, type: true, duration: true, difficulty: true } },
    },
  });

  return { sessions };
}

interface DayBucket {
  date: Date;
  dayIdx: number;
  sessions: Array<{
    id: string;
    title: string;
    type: string;
    duration: number;
    completed: boolean;
  }>;
  isToday: boolean;
}

function bucketByDay(
  sessions: Array<{
    id: string;
    startTime: Date;
    completed: boolean;
    workout: { id: string; title: string; type: string; duration: number };
  }>,
  weekStart: Date,
): DayBucket[] {
  const todayKey = new Date();
  todayKey.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const todaysSessions = sessions
      .filter((s) => s.startTime.toISOString().slice(0, 10) === key)
      .map((s) => ({
        id: s.id,
        title: s.workout.title,
        type: s.workout.type,
        duration: s.workout.duration,
        completed: s.completed,
      }));
    return {
      date: d,
      dayIdx: i,
      sessions: todaysSessions,
      isToday: d.toDateString() === todayKey.toDateString(),
    };
  });
}

export default async function ClientProgramPage() {
  const session = await requireClientSession();
  const { sessions } = await getProgramData(session.user.id);

  const currentWeekStart = startOfWeek();
  const weeks = Array.from({ length: 5 }, (_, i) => {
    const s = new Date(currentWeekStart);
    s.setDate(currentWeekStart.getDate() + (i - 2) * 7);
    return s;
  });

  const currentWeekBuckets = bucketByDay(
    sessions.map((s) => ({
      id: s.id,
      startTime: s.startTime,
      completed: s.completed,
      workout: s.workout,
    })),
    currentWeekStart,
  );

  const completedThisWeek = currentWeekBuckets.reduce(
    (acc, d) => acc + d.sessions.filter((x) => x.completed).length,
    0,
  );
  const sessionsThisWeek = currentWeekBuckets.reduce((acc, d) => acc + d.sessions.length, 0);
  const completionPct = sessionsThisWeek
    ? Math.round((completedThisWeek / sessionsThisWeek) * 100)
    : 0;

  return (
    <main style={{ padding: '12px 0 24px' }}>
      <div style={{ padding: '12px 20px 8px' }}>
        <div className="mf-eyebrow">PROGRAM</div>
        <div
          className="mf-font-display"
          style={{
            fontSize: 22,
            letterSpacing: '-0.01em',
            textTransform: 'uppercase',
          }}
        >
          Your week
        </div>
        <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 11, marginTop: 2 }}>
          {sessions.length > 0 ? `${sessions.length} SESSIONS IN VIEW · LAST 4 + NEXT 4 WKS` : 'NO SESSIONS YET'}
        </div>
      </div>

      {/* Week pill picker */}
      <div style={{ padding: '0 20px', marginBottom: 12 }}>
        <div
          className="flex gap-1 overflow-x-auto"
          style={{ scrollbarWidth: 'none', paddingBottom: 8 }}
        >
          {weeks.map((w, i) => {
            const isCurrent = w.getTime() === currentWeekStart.getTime();
            return (
              <button
                key={i}
                className="shrink-0 mf-font-mono"
                style={{
                  padding: '8px 14px',
                  height: 36,
                  borderRadius: 6,
                  background: isCurrent ? 'var(--mf-accent)' : 'var(--mf-surface-3)',
                  color: isCurrent ? 'var(--mf-accent-ink)' : 'var(--mf-fg-dim)',
                  border: `1px solid ${isCurrent ? 'var(--mf-accent)' : 'var(--mf-hairline)'}`,
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  cursor: 'default',
                }}
              >
                {w.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ padding: '0 20px' }}>
        {/* Week summary card */}
        <div className="mf-card-elev" style={{ padding: 16, marginBottom: 12 }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="mf-eyebrow">THIS WEEK</div>
              <div className="mf-font-display" style={{ fontSize: 18, marginTop: 2 }}>
                {completedThisWeek} / {sessionsThisWeek || '—'} SESSIONS
              </div>
            </div>
            <Ring pct={completionPct} />
          </div>
        </div>

        {/* Day cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {currentWeekBuckets.map((bucket) => {
            const rest = bucket.sessions.length === 0;
            const session = bucket.sessions[0];
            const isCompleted = bucket.sessions.every((s) => s.completed) && bucket.sessions.length > 0;

            return (
              <ProgramDayRow
                key={bucket.dayIdx}
                bucket={bucket}
                rest={rest}
                isCompleted={isCompleted}
                firstSession={session}
                extraCount={bucket.sessions.length - 1}
              />
            );
          })}
        </div>
      </div>
    </main>
  );
}

function ProgramDayRow({
  bucket,
  rest,
  isCompleted,
  firstSession,
  extraCount,
}: {
  bucket: DayBucket;
  rest: boolean;
  isCompleted: boolean;
  firstSession?: {
    id: string;
    title: string;
    type: string;
    duration: number;
    completed: boolean;
  };
  extraCount: number;
}) {
  const label = WEEKDAYS[bucket.dayIdx];
  const dateNum = bucket.date.getDate();

  const inner = (
    <div
      className="mf-card flex items-center gap-3"
      style={{
        padding: 12,
        borderColor: bucket.isToday ? 'var(--mf-accent)' : undefined,
      }}
    >
      <div style={{ width: 48, textAlign: 'center' }}>
        <div className="mf-eyebrow">{label.toUpperCase()}</div>
        <div
          className="mf-font-display mf-tnum"
          style={{ fontSize: 18, lineHeight: 1, marginTop: 2 }}
        >
          {dateNum}
        </div>
      </div>
      <div className="mf-vr" style={{ height: 32 }} />
      <div style={{ flex: 1 }}>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 14, fontWeight: 500 }}>
            {rest ? 'Rest' : firstSession?.title ?? 'Session'}
          </span>
          {bucket.isToday && <Chip kind="live">TODAY</Chip>}
          {isCompleted && <Check size={12} style={{ color: 'var(--mf-green)' }} />}
        </div>
        {!rest && firstSession ? (
          <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 10, marginTop: 2 }}>
            {firstSession.type.toUpperCase()} · ~{firstSession.duration} MIN
            {extraCount > 0 ? ` · +${extraCount} MORE` : ''}
          </div>
        ) : (
          <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 10, marginTop: 2 }}>
            {rest ? 'ACTIVE RECOVERY' : ''}
          </div>
        )}
      </div>
      {!rest && firstSession && <ChevronRight size={14} className="mf-fg-mute" />}
    </div>
  );

  if (rest || !firstSession) return inner;
  return (
    <Link href={`/client/workout/${firstSession.id}`} style={{ display: 'block' }}>
      {inner}
    </Link>
  );
}
