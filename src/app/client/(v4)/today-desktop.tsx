import Link from 'next/link';
import { Play, Calendar, MessageSquare, Activity, Scale, Flame } from 'lucide-react';
import {
  Avatar,
  Btn,
  Chip,
  ClientDesktopShell,
  Sparkline,
} from '@/components/ui/mf';
import type { ClientContext } from '@/lib/client-data';
import type { TodayData } from './today-mobile';

export interface TodayDesktopProps {
  ctx: ClientContext;
  data: TodayData;
}

function formatDesktopTitle(d: Date): string {
  const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
  const month = d.toLocaleDateString('en-US', { month: 'long' });
  return `Today · ${weekday}, ${month} ${d.getDate()}`;
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

export default function TodayDesktop({ ctx, data }: TodayDesktopProps) {
  const workoutExercises = data.nextSession?.workout.exercises ?? [];
  const exerciseCount = workoutExercises.length;
  const totalSets = workoutExercises.reduce((sum, we) => sum + (we.sets ?? 0), 0);
  const weeklyTarget = 5;
  const weekPct = Math.min(100, Math.round((data.weekSessions / weeklyTarget) * 100));
  const doneCount = data.weekDaysDone.filter(Boolean).length;

  const coachInitials = (data.coachNote?.sender.name ?? 'BM')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="hidden md:block">
      <ClientDesktopShell
        active="today"
        title={formatDesktopTitle(new Date())}
        breadcrumbs="HOME"
        athleteInitials={ctx.initials}
        athleteName={ctx.name ?? ctx.email}
        athleteMeta={ctx.trainer?.name ? `COACH · ${ctx.trainer.name.toUpperCase()}` : undefined}
        headerRight={
          <>
            <Chip kind={data.streak > 0 ? 'ok' : 'default'}>
              {data.streak > 0 ? `STREAK · ${data.streak}D` : 'READY'}
            </Chip>
          </>
        }
      >
        <div className="p-6 grid grid-cols-12 gap-5">
          {/* Hero — today's workout */}
          <div
            className="col-span-8 mf-card-elev overflow-hidden"
            style={{
              background:
                'linear-gradient(135deg, rgba(255,77,28,0.12) 0%, var(--mf-surface-2) 60%)',
            }}
          >
            <div style={{ padding: 24 }}>
              <div className="flex items-start justify-between" style={{ marginBottom: 16 }}>
                <div>
                  <div className="mf-eyebrow" style={{ marginBottom: 4 }}>
                    {data.nextSession
                      ? `${data.nextSession.workout.type} · ${data.nextSession.workout.difficulty}`
                      : 'TODAY · NOTHING SCHEDULED'}
                  </div>
                  <div
                    className="mf-font-display"
                    style={{
                      fontSize: 32,
                      letterSpacing: '-0.01em',
                      lineHeight: 1,
                      textTransform: 'uppercase',
                    }}
                  >
                    {data.nextSession?.workout.title ?? 'No session assigned'}
                  </div>
                  {data.nextSession && (
                    <div
                      className="mf-font-mono mf-fg-dim"
                      style={{ fontSize: 11, marginTop: 8 }}
                    >
                      {exerciseCount} EXERCISES · {totalSets} SETS · EST{' '}
                      {data.nextSession.workout.duration} MIN
                    </div>
                  )}
                </div>
                {data.nextSession && (
                  <Link href={`/client/workout/${data.nextSession.id}`}>
                    <Btn
                      variant="primary"
                      icon={Play}
                      style={{ height: 48, paddingInline: 20, fontSize: 14 }}
                    >
                      START SESSION
                    </Btn>
                  </Link>
                )}
              </div>
              {data.nextSession && workoutExercises.length > 0 && (
                <div className="grid grid-cols-6 gap-2" style={{ marginTop: 24 }}>
                  {workoutExercises.slice(0, 6).map((we, i) => (
                    <div key={we.id} className="mf-card" style={{ padding: 12 }}>
                      <div
                        className="mf-font-mono mf-fg-mute"
                        style={{ fontSize: 9, marginBottom: 4 }}
                      >
                        EX {i + 1}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          lineHeight: 1.2,
                          marginBottom: 6,
                          minHeight: 28,
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {we.exercise.name}
                      </div>
                      <div
                        className="mf-font-mono mf-fg-dim mf-tnum"
                        style={{ fontSize: 10 }}
                      >
                        {we.sets}×{we.reps ?? '—'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!data.nextSession && (
                <div className="mf-fg-dim" style={{ fontSize: 13, marginTop: 12 }}>
                  Your trainer hasn&apos;t assigned a session for today. Check your program or
                  message them to sort it out.
                </div>
              )}
            </div>
          </div>

          {/* Streak + Body Weight */}
          <div className="col-span-4 flex flex-col gap-5">
            <div className="mf-card" style={{ padding: 20 }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
                <div className="mf-eyebrow">STREAK</div>
                <Chip kind={data.streak > 0 ? 'ok' : 'default'}>
                  {data.streak > 0 ? 'ACTIVE' : 'LOG TO START'}
                </Chip>
              </div>
              <div className="flex items-center gap-3" style={{ marginBottom: 16 }}>
                <div
                  className="grid place-items-center"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 6,
                    background: 'rgba(255,77,28,0.12)',
                  }}
                >
                  <Flame size={22} className="mf-accent" />
                </div>
                <div>
                  <div
                    className="mf-font-display mf-tnum"
                    style={{ fontSize: 36, lineHeight: 1 }}
                  >
                    {data.streak}
                    <span className="mf-fg-mute" style={{ fontSize: 14, marginLeft: 6 }}>
                      DAY{data.streak === 1 ? '' : 'S'}
                    </span>
                  </div>
                  <div
                    className="mf-font-mono mf-fg-mute"
                    style={{ fontSize: 10, marginTop: 4 }}
                  >
                    {data.weekSessions}/{weeklyTarget} THIS WEEK · {weekPct}%
                  </div>
                </div>
              </div>
              <div
                className="h-1 rounded"
                style={{ background: 'var(--mf-hairline)' }}
              >
                <div
                  style={{
                    width: `${weekPct}%`,
                    height: '100%',
                    background: 'var(--mf-accent)',
                    borderRadius: 999,
                  }}
                />
              </div>
              <div
                className="mf-font-mono mf-fg-mute"
                style={{ fontSize: 10, marginTop: 10 }}
              >
                {doneCount} DAY{doneCount === 1 ? '' : 'S'} LOGGED · WEEK VIEW
              </div>
            </div>

            <div className="mf-card" style={{ padding: 20 }}>
              <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
                BODY WEIGHT
              </div>
              <div
                className="mf-font-display mf-tnum"
                style={{ fontSize: 36, lineHeight: 1 }}
              >
                {data.bodyWeight != null ? data.bodyWeight.toFixed(1) : '—'}
                <span className="mf-fg-mute" style={{ fontSize: 14, marginLeft: 6 }}>
                  lb
                </span>
              </div>
              <div
                className="mf-font-mono"
                style={{
                  fontSize: 10,
                  marginTop: 8,
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

          {/* Coach message */}
          <div
            className="col-span-5 mf-card"
            style={{ padding: 20, background: 'var(--mf-surface-2)' }}
          >
            <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
              <Avatar
                initials={coachInitials}
                image={ctx.trainer?.photoUrl ?? null}
                alt={data.coachNote?.sender.name ?? ctx.trainer?.name ?? 'Coach'}
                size={32}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1 }}>
                  {data.coachNote?.sender.name ?? ctx.trainer?.name ?? 'Coach'}
                </div>
                <div
                  className="mf-font-mono mf-fg-mute"
                  style={{ fontSize: 9, marginTop: 4 }}
                >
                  {data.coachNote ? relativeTime(data.coachNote.createdAt) : 'NO MESSAGES YET'}
                </div>
              </div>
            </div>
            {data.coachNote ? (
              <p
                className="mf-fg-dim"
                style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}
              >
                {data.coachNote.content}
              </p>
            ) : (
              <p
                className="mf-fg-dim"
                style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}
              >
                Your coach hasn&apos;t sent a message yet. Drop them a note to get started.
              </p>
            )}
            <Link href="/client/messages" style={{ display: 'block' }}>
              <Btn icon={MessageSquare} className="w-full">
                {data.coachNote ? 'Reply' : 'Message coach'}
              </Btn>
            </Link>
          </div>

          {/* This week progress */}
          <div className="col-span-4 mf-card" style={{ padding: 20 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
              <div className="mf-eyebrow">THIS WEEK</div>
              <Chip kind={data.weekSessions >= weeklyTarget ? 'ok' : 'default'}>
                {data.weekSessions}/{weeklyTarget}
              </Chip>
            </div>
            <div
              className="mf-font-display mf-tnum"
              style={{ fontSize: 36, lineHeight: 1, marginBottom: 8 }}
            >
              {data.weekSessions}
              <span className="mf-fg-mute" style={{ fontSize: 16, marginLeft: 6 }}>
                sessions
              </span>
            </div>
            <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 10, marginBottom: 12 }}>
              TARGET · {weeklyTarget} / WEEK
            </div>
            <div
              className="flex items-center gap-1"
              style={{ marginTop: 4 }}
              aria-label="Weekly heatmap"
            >
              {data.weekDaysDone.map((done, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: 22,
                    borderRadius: 4,
                    background: done ? 'var(--mf-accent)' : 'var(--mf-surface-3)',
                  }}
                />
              ))}
            </div>
            <div
              className="mf-font-mono mf-fg-mute flex justify-between"
              style={{ fontSize: 9, marginTop: 6, letterSpacing: '0.1em' }}
            >
              <span>MON</span>
              <span>TUE</span>
              <span>WED</span>
              <span>THU</span>
              <span>FRI</span>
              <span>SAT</span>
              <span>SUN</span>
            </div>
          </div>

          {/* Upcoming program */}
          <div className="col-span-3 mf-card" style={{ padding: 20 }}>
            <div className="mf-eyebrow" style={{ marginBottom: 12 }}>
              UPCOMING
            </div>
            <div className="flex flex-col" style={{ gap: 0 }}>
              <Link
                href="/client/program"
                className="flex items-center gap-2"
                style={{ padding: '10px 0', borderBottom: '1px solid var(--mf-hairline)' }}
              >
                <div
                  className="grid place-items-center"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                    background: 'var(--mf-accent)',
                  }}
                >
                  <Calendar size={13} color="#0A0A0B" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.2 }}>
                    Your program
                  </div>
                  <div
                    className="mf-font-mono mf-fg-mute"
                    style={{ fontSize: 9, marginTop: 2 }}
                  >
                    VIEW SCHEDULE
                  </div>
                </div>
              </Link>
              <Link
                href="/client/progress"
                className="flex items-center gap-2"
                style={{ padding: '10px 0', borderBottom: '1px solid var(--mf-hairline)' }}
              >
                <div
                  className="grid place-items-center"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                    background: 'var(--mf-surface-3)',
                  }}
                >
                  <Activity size={13} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.2 }}>
                    Progress log
                  </div>
                  <div
                    className="mf-font-mono mf-fg-mute"
                    style={{ fontSize: 9, marginTop: 2 }}
                  >
                    TRENDS · PRs
                  </div>
                </div>
              </Link>
              <Link
                href="/client/progress"
                className="flex items-center gap-2"
                style={{ padding: '10px 0' }}
              >
                <div
                  className="grid place-items-center"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                    background: 'var(--mf-surface-3)',
                  }}
                >
                  <Scale size={13} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.2 }}>
                    Log body weight
                  </div>
                  <div
                    className="mf-font-mono mf-fg-mute"
                    style={{ fontSize: 9, marginTop: 2 }}
                  >
                    {data.bodyWeight != null
                      ? `LAST · ${data.bodyWeight.toFixed(1)} LB`
                      : 'NO ENTRIES YET'}
                  </div>
                </div>
              </Link>
            </div>
            {data.bodyWeight != null && (
              <div style={{ marginTop: 12 }}>
                <Sparkline
                  data={[data.bodyWeight - 2, data.bodyWeight - 1, data.bodyWeight, data.bodyWeight + 0.5, data.bodyWeight]}
                  w={200}
                  h={36}
                />
              </div>
            )}
          </div>
        </div>
      </ClientDesktopShell>
    </div>
  );
}
