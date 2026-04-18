import { Trophy, Filter } from 'lucide-react';
import { Chip, Heatmap } from '@/components/ui/mf';
import ProgressMetricTabsClient from './metric-tabs-client';

interface SeriesPoint {
  weekLabel: string;
  value: number;
}

export interface ProgressRecentEntry {
  weight: number | null;
  bodyFat: number | null;
  mood: number | null;
  energy: number | null;
  sleep: number | null;
  date: Date;
}

export interface ProgressPRTimelineEntry {
  date: string;
  lift: string;
  weight: string;
  delta: string;
}

export interface ProgressMobileData {
  bodyweightSeries: SeriesPoint[];
  benchSeries: SeriesPoint[];
  squatSeries: SeriesPoint[];
  deadliftSeries: SeriesPoint[];
  compliance: number[][];
  prTimeline: ProgressPRTimelineEntry[];
  adherencePct: number;
  sessionCount: number;
  recentEntry: ProgressRecentEntry | null;
  benchDelta: string | null;
  bwDelta: string | null;
}

export default function ProgressMobile({ data }: { data: ProgressMobileData }) {
  const hero = data.prTimeline[0];
  const recent = data.recentEntry;

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

  return (
    <main className="md:hidden" style={{ padding: '12px 0 24px' }}>
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
        <ProgressMetricTabsClient metrics={metrics} benchDelta={data.benchDelta} bwDelta={data.bwDelta} />

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
            delta={data.bwDelta}
            good={data.bwDelta?.startsWith('−') ?? null}
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
