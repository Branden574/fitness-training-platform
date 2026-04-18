import Link from 'next/link';
import { Check, ChevronRight } from 'lucide-react';
import { Chip, Ring } from '@/components/ui/mf';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export interface ProgramMobileSession {
  id: string;
  title: string;
  type: string;
  duration: number;
  completed: boolean;
}

export interface ProgramMobileDayBucket {
  date: Date;
  dayIdx: number;
  sessions: ProgramMobileSession[];
  isToday: boolean;
}

export interface ProgramMobileWeekDay {
  dayOfWeek: string;
  sessionType: string;
  exerciseCount: number;
}

export interface ProgramMobileData {
  programBadge: { name: string; weekNumber: number; total: number } | null;
  programWeekDays: ProgramMobileWeekDay[] | null;
  weeks: Date[];
  currentWeekStart: Date;
  currentWeekBuckets: ProgramMobileDayBucket[];
  completedThisWeek: number;
  sessionsThisWeek: number;
  completionPct: number;
  totalSessionsInView: number;
}

export default function ProgramMobile({ data }: { data: ProgramMobileData }) {
  const {
    programBadge,
    programWeekDays,
    weeks,
    currentWeekStart,
    currentWeekBuckets,
    completedThisWeek,
    sessionsThisWeek,
    completionPct,
    totalSessionsInView,
  } = data;

  return (
    <main className="md:hidden" style={{ padding: '12px 0 24px' }}>
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
          {programBadge ? programBadge.name : 'Your week'}
        </div>
        <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 11, marginTop: 2 }}>
          {programBadge
            ? `WK ${programBadge.weekNumber} / ${programBadge.total} · ASSIGNED BY COACH`
            : totalSessionsInView > 0
              ? `${totalSessionsInView} SESSIONS IN VIEW · LAST 4 + NEXT 4 WKS`
              : 'NO SESSIONS YET'}
        </div>
      </div>

      {programWeekDays && (
        <div style={{ padding: '0 20px', marginBottom: 12 }}>
          <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
            PROGRAM · CURRENT WEEK
          </div>
          <div
            className="mf-card-elev"
            style={{ padding: 12, borderColor: 'var(--mf-accent)' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {programWeekDays.map((d, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between"
                  style={{
                    padding: '6px 0',
                    borderBottom:
                      i < programWeekDays.length - 1 ? '1px solid var(--mf-hairline)' : 'none',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="mf-font-mono mf-fg-mute"
                      style={{ fontSize: 10, width: 32, letterSpacing: '0.1em' }}
                    >
                      {d.dayOfWeek}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{d.sessionType}</span>
                  </div>
                  <span className="mf-font-mono mf-fg-dim" style={{ fontSize: 10 }}>
                    {d.exerciseCount > 0
                      ? `${d.exerciseCount} EX`
                      : d.sessionType.toLowerCase() === 'rest'
                        ? '—'
                        : 'OPEN'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
            const isCompleted =
              bucket.sessions.every((s) => s.completed) && bucket.sessions.length > 0;

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
  bucket: ProgramMobileDayBucket;
  rest: boolean;
  isCompleted: boolean;
  firstSession?: ProgramMobileSession;
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
        <div className="mf-eyebrow">{(label ?? '').toUpperCase()}</div>
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
