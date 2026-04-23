import Link from 'next/link';
import { Flame, Play, Check, ChevronRight } from 'lucide-react';
import { Avatar, Chip, Btn } from '@/components/ui/mf';
import type { ClientContext } from '@/lib/client-data';
import RequestSessionButton from '@/components/scheduling/RequestSessionButton';

export interface TodayWorkoutExercise {
  id: string;
  order: number;
  sets: number;
  reps: number | null;
  exercise: { id: string; name: string };
}

export interface TodayNextSession {
  id: string;
  workout: {
    title: string;
    type: string;
    difficulty: string;
    duration: number;
    exercises: TodayWorkoutExercise[];
  };
}

export interface TodayCoachNote {
  content: string;
  createdAt: Date;
  sender: { id: string; name: string | null; role: string };
}

export interface TodayData {
  nextSession: TodayNextSession | null;
  weekSessions: number;
  weekDaysDone: boolean[];
  streak: number;
  bodyWeight: number | null;
  trendDelta: string | null;
  coachNote: TodayCoachNote | null;
  today: Date;
}

function formatDate(d: Date): string {
  return d
    .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    .toUpperCase();
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

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

export interface TodayMobileProps {
  ctx: ClientContext;
  data: TodayData;
}

export default function TodayMobile({ ctx, data }: TodayMobileProps) {
  const firstName = ctx.name?.split(' ')[0] ?? 'there';
  const workoutExercises = data.nextSession?.workout.exercises ?? [];
  const exerciseCount = workoutExercises.length;
  const weeklyTarget = 5;
  const todayWeekdayIdx = (() => {
    const day = new Date().getDay();
    return day === 0 ? 6 : day - 1;
  })();

  return (
    <main className="md:hidden" style={{ padding: '12px 0' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <RequestSessionButton
              coachId={ctx.trainer?.id ?? null}
              coachName={ctx.trainer?.name ?? null}
              layout="compact"
            />
            <Link href="/client/profile">
              <Avatar
                initials={ctx.initials}
                image={ctx.image}
                alt={ctx.name ?? ctx.email}
                size={36}
              />
            </Link>
          </div>
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
