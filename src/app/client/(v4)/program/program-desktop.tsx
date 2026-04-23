import { Chip, ClientDesktopShell } from '@/components/ui/mf';
import type { ClientContext } from '@/lib/client-data';

export interface ProgramDesktopDayExercise {
  name: string;
}

export interface ProgramDesktopWeekDay {
  label: string; // MON..SUN
  sessionType: string;
  isRest: boolean;
  isToday: boolean;
  exerciseCount: number;
  topExercises: ProgramDesktopDayExercise[];
}

export interface ProgramDesktopStats {
  sessionsCompleted: number;
  sessionsPlanned: number;
  missed: number;
  weekSessionsPlanned: number;
  weekSessionsDone: number;
}

export interface ProgramDesktopNextBlock {
  label: string;
  weekNumber: number | null;
  sessionTypes: string[]; // next ProgramWeek day labels
  note: string | null;
}

export interface ProgramDesktopData {
  programName: string | null;
  phaseLabel: string | null; // e.g. "PHASE 2" if name contains it, else null
  weekNumber: number; // 1-based
  totalWeeks: number;
  startedLabel: string | null; // "STARTED FEB 14"
  coachName: string | null;
  coachNotes: string | null;
  weekDays: ProgramDesktopWeekDay[]; // exactly 7 entries (MON..SUN)
  stats: ProgramDesktopStats;
  nextBlock: ProgramDesktopNextBlock | null;
}

function BreadcrumbText(data: ProgramDesktopData): string {
  if (!data.programName) return 'TRAIN';
  return `TRAIN · ${data.totalWeeks}-WEEK${data.phaseLabel ? ` · ${data.phaseLabel}` : ''}`;
}

export default function ProgramDesktop({
  ctx,
  data,
}: {
  ctx: ClientContext;
  data: ProgramDesktopData;
}) {
  const hasProgram = Boolean(data.programName);

  return (
    <div className="hidden md:block">
      <ClientDesktopShell
        active="program"
        title={data.programName ?? 'My Program'}
        breadcrumbs={BreadcrumbText(data)}
        athleteInitials={ctx.initials}
        athleteName={ctx.name ?? ctx.email}
        athletePhotoUrl={ctx.image}
        athleteMeta={ctx.trainer?.name ? `COACH · ${ctx.trainer.name.toUpperCase()}` : undefined}
      >
        <div className="p-6">
          {!hasProgram ? (
            <EmptyState />
          ) : (
            <>
              <PhaseHero data={data} />
              <WeekGrid days={data.weekDays} />
              <BottomRow data={data} />
            </>
          )}
        </div>
      </ClientDesktopShell>
    </div>
  );
}

function PhaseHero({ data }: { data: ProgramDesktopData }) {
  const wk = Math.max(1, Math.min(data.totalWeeks, data.weekNumber));
  return (
    <div className="mf-card-elev" style={{ padding: 20, marginBottom: 20 }}>
      <div className="flex items-center justify-between">
        <div>
          <div className="mf-eyebrow" style={{ marginBottom: 4 }}>
            ACTIVE PROGRAM
          </div>
          <div
            className="mf-font-display"
            style={{ fontSize: 28, letterSpacing: '-0.01em' }}
          >
            {data.programName}
            {data.phaseLabel ? ` · ${data.phaseLabel}` : ''}
          </div>
          <div
            className="mf-font-mono mf-fg-dim"
            style={{ fontSize: 11, marginTop: 8 }}
          >
            {[
              data.coachName ? `COACH ${data.coachName.toUpperCase()}` : null,
              data.startedLabel,
              `${data.totalWeeks}-WEEK BLOCK`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            className="mf-font-mono mf-fg-mute"
            style={{
              fontSize: 10,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}
          >
            WEEK
          </div>
          <div
            className="mf-font-display mf-tnum"
            style={{ fontSize: 52, lineHeight: 1 }}
          >
            {wk}
            <span className="mf-fg-mute" style={{ fontSize: 20 }}>
              /{data.totalWeeks}
            </span>
          </div>
        </div>
      </div>
      <div
        className="mt-4"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${data.totalWeeks}, minmax(0, 1fr))`,
          gap: 4,
        }}
      >
        {Array.from({ length: data.totalWeeks }).map((_, i) => {
          const bg =
            i + 1 < wk
              ? 'var(--mf-accent)'
              : i + 1 === wk
                ? 'var(--mf-accent-strong)'
                : 'var(--mf-surface-3)';
          return <div key={i} style={{ height: 8, borderRadius: 4, background: bg }} />;
        })}
      </div>
    </div>
  );
}

function WeekGrid({ days }: { days: ProgramDesktopWeekDay[] }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
        gap: 8,
      }}
    >
      {days.map((d) => (
        <div
          key={d.label}
          className="mf-card"
          style={{
            borderColor: d.isToday ? 'var(--mf-accent)' : undefined,
            background: d.isToday ? 'rgba(255,77,28,0.06)' : 'var(--mf-surface-1)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            className="flex items-center justify-between"
            style={{ padding: '12px 12px 0' }}
          >
            <div
              className="mf-font-mono mf-fg-mute"
              style={{
                fontSize: 10,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
              }}
            >
              {d.label}
            </div>
            {d.isToday && <Chip kind="live">TODAY</Chip>}
          </div>
          <div style={{ padding: '8px 12px 12px' }}>
            <div
              className="mf-font-display"
              style={{
                fontSize: 14,
                lineHeight: 1.2,
                marginBottom: 4,
                color: d.isRest ? 'var(--mf-fg-mute)' : 'var(--mf-fg)',
              }}
            >
              {d.sessionType}
            </div>
            <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 9 }}>
              {d.isRest ? '—' : d.exerciseCount > 0 ? `${d.exerciseCount} EX` : 'OPEN'}
            </div>
          </div>
          {!d.isRest && d.topExercises.length > 0 && (
            <div style={{ padding: '0 12px 12px' }}>
              {d.topExercises.map((ex, j) => (
                <div
                  key={j}
                  className="mf-font-mono mf-fg-dim"
                  style={{
                    fontSize: 10,
                    padding: '6px 0 4px',
                    borderTop: '1px solid var(--mf-hairline)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  • {ex.name}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function BottomRow({ data }: { data: ProgramDesktopData }) {
  const stats: Array<[string, string]> = [
    [
      'Sessions completed',
      `${data.stats.sessionsCompleted}/${data.stats.sessionsPlanned || '—'}`,
    ],
    ['Missed', `${data.stats.missed}`],
    [
      'This week',
      `${data.stats.weekSessionsDone}/${data.stats.weekSessionsPlanned || '—'}`,
    ],
    ['Week', `${data.weekNumber}/${data.totalWeeks}`],
  ];

  return (
    <div
      className="mt-6"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: 16,
      }}
    >
      <div className="mf-card" style={{ padding: 20 }}>
        <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
          COACH NOTES
        </div>
        {data.coachNotes ? (
          <p className="mf-fg-dim" style={{ fontSize: 13, lineHeight: 1.6 }}>
            {data.coachNotes}
          </p>
        ) : (
          <p className="mf-fg-mute" style={{ fontSize: 13, lineHeight: 1.6 }}>
            No notes from your coach for this block yet.
          </p>
        )}
      </div>

      <div className="mf-card" style={{ padding: 20 }}>
        <div className="mf-eyebrow" style={{ marginBottom: 12 }}>
          PROGRAM STATS
        </div>
        {stats.map(([l, v], i) => (
          <div
            key={l}
            className="flex justify-between items-baseline"
            style={{
              padding: '6px 0',
              borderBottom:
                i < stats.length - 1 ? '1px solid var(--mf-hairline)' : 'none',
            }}
          >
            <span className="mf-fg-dim" style={{ fontSize: 12 }}>
              {l}
            </span>
            <span className="mf-font-display mf-tnum" style={{ fontSize: 14 }}>
              {v}
            </span>
          </div>
        ))}
      </div>

      <div className="mf-card" style={{ padding: 20 }}>
        <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
          NEXT BLOCK
        </div>
        {data.nextBlock ? (
          <>
            <div className="mf-font-display" style={{ fontSize: 16, marginBottom: 4 }}>
              {data.nextBlock.label}
            </div>
            {data.nextBlock.note && (
              <p className="mf-fg-dim" style={{ fontSize: 12, lineHeight: 1.6, marginBottom: 12 }}>
                {data.nextBlock.note}
              </p>
            )}
            {data.nextBlock.sessionTypes.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {data.nextBlock.sessionTypes.map((s, i) => (
                  <div
                    key={i}
                    className="mf-font-mono mf-fg-dim"
                    style={{ fontSize: 10 }}
                  >
                    • {s}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="mf-fg-mute" style={{ fontSize: 13, lineHeight: 1.6 }}>
            Final week of this block. Your coach will assign the next program soon.
          </p>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      className="mf-card-elev"
      style={{
        padding: 40,
        textAlign: 'center',
      }}
    >
      <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
        NO ACTIVE PROGRAM
      </div>
      <div
        className="mf-font-display"
        style={{ fontSize: 22, letterSpacing: '-0.01em', marginBottom: 8 }}
      >
        Waiting on your coach
      </div>
      <p className="mf-fg-dim" style={{ fontSize: 13, maxWidth: 420, margin: '0 auto' }}>
        You don&apos;t have an active program assignment yet. Your coach will push one to your
        account when it&apos;s ready.
      </p>
    </div>
  );
}
