'use client';

import { useState } from 'react';
import { Award, Flame, Scale, TrendingUp } from 'lucide-react';
import {
  ClientDesktopShell,
  Chip,
  Heatmap,
  LineChart,
  Sparkline,
  StatCard,
} from '@/components/ui/mf';
import type { ClientContext } from '@/lib/client-data';
import type { ProgressMobileData } from './progress-mobile';

export interface ProgressDesktopData extends ProgressMobileData {
  heatmap180: number[][];
  prsThisMonth: number;
  streak: number;
  weekSessions: number;
  bodyWeight: number | null;
  bwTrendDelta: string | null;
  bwSparkline: number[];
}

type LiftKey = 'bench' | 'squat' | 'deadlift';

const LIFT_LABELS: Record<LiftKey, string> = {
  bench: 'Bench Press',
  squat: 'Back Squat',
  deadlift: 'Deadlift',
};

const LIFT_TAB_LABELS: Record<LiftKey, string> = {
  bench: 'BENCH',
  squat: 'SQUAT',
  deadlift: 'DEADLIFT',
};

export default function ProgressDesktop({
  ctx,
  data,
}: {
  ctx: ClientContext;
  data: ProgressDesktopData;
}) {
  const [lift, setLift] = useState<LiftKey>('bench');

  const liftSeries =
    lift === 'bench'
      ? data.benchSeries
      : lift === 'squat'
        ? data.squatSeries
        : data.deadliftSeries;
  const liftValues = liftSeries.map((p) => p.value);
  const liftLabels = liftSeries.map((p) => p.weekLabel);
  const liftCurrent = liftValues[liftValues.length - 1];
  const liftFirst = liftValues[0];
  const liftDelta =
    liftCurrent != null && liftFirst != null && Math.abs(liftCurrent - liftFirst) >= 0.1
      ? `${liftCurrent > liftFirst ? '+' : '−'}${Math.abs(liftCurrent - liftFirst).toFixed(0)} LB / ${liftValues.length}W`
      : null;

  const weeklyTarget = 5;
  const streakChip =
    data.streak > 0 ? `STREAK · ${data.streak}D` : data.weekSessions > 0 ? 'ON TRACK' : 'READY';

  const recent = data.recentEntry;
  const bf = recent?.bodyFat;

  return (
    <div className="hidden md:block">
      <ClientDesktopShell
        active="progress"
        title="Progress"
        breadcrumbs="ANALYZE"
        athleteInitials={ctx.initials}
        athleteName={ctx.name ?? ctx.email}
        athleteMeta={ctx.trainer?.name ? `COACH · ${ctx.trainer.name.toUpperCase()}` : undefined}
        headerRight={
          <Chip kind={data.streak > 0 ? 'ok' : 'default'}>{streakChip}</Chip>
        }
      >
        <div className="p-6 grid grid-cols-12 gap-5">
          {/* KPI row */}
          <div className="col-span-12 grid grid-cols-4 gap-3">
            <StatCard
              label="BODY WEIGHT"
              value={data.bodyWeight != null ? data.bodyWeight.toFixed(1) : '—'}
              unit="LB"
              delta={data.bwTrendDelta ?? undefined}
              sparkData={data.bwSparkline.length > 1 ? data.bwSparkline : undefined}
            />
            <StatCard
              label="STREAK"
              value={data.streak}
              unit={`DAY${data.streak === 1 ? '' : 'S'}`}
              accent={data.streak > 0}
            />
            <StatCard
              label="THIS WEEK"
              value={data.weekSessions}
              unit={`/${weeklyTarget} SESSIONS`}
              delta={
                data.weekSessions >= weeklyTarget
                  ? '+ON TARGET'
                  : data.weekSessions > 0
                    ? undefined
                    : undefined
              }
            />
            <StatCard
              label="PRS THIS MONTH"
              value={data.prsThisMonth}
              unit={data.prsThisMonth === 1 ? 'LIFT' : 'LIFTS'}
              accent={data.prsThisMonth > 0}
            />
          </div>

          {/* Lift trend */}
          <div className="col-span-8 mf-card-elev" style={{ padding: 20 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
              <div>
                <div className="mf-eyebrow flex items-center gap-2">
                  <TrendingUp size={12} />
                  LIFT TREND · PEAK WEIGHT
                </div>
                <div
                  className="mf-font-display"
                  style={{
                    fontSize: 22,
                    letterSpacing: '-0.01em',
                    lineHeight: 1,
                    marginTop: 4,
                  }}
                >
                  {LIFT_LABELS[lift]}
                </div>
                <div
                  className="mf-font-mono mf-fg-dim"
                  style={{ fontSize: 10, marginTop: 4 }}
                >
                  {liftCurrent != null
                    ? `CURRENT · ${liftCurrent} LB`
                    : 'NO LOGS YET'}
                </div>
              </div>
              <div className="flex gap-1">
                {(Object.keys(LIFT_TAB_LABELS) as LiftKey[]).map((k) => {
                  const active = lift === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setLift(k)}
                      className="mf-font-mono"
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        background: active ? 'var(--mf-accent)' : 'var(--mf-surface-3)',
                        color: active ? 'var(--mf-accent-ink)' : 'var(--mf-fg-dim)',
                        fontSize: 10,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {LIFT_TAB_LABELS[k]}
                    </button>
                  );
                })}
              </div>
            </div>
            {liftValues.length > 1 ? (
              <LineChart data={liftValues} labels={liftLabels} h={220} />
            ) : (
              <div
                className="mf-fg-mute mf-font-mono grid place-items-center"
                style={{
                  height: 220,
                  fontSize: 11,
                  letterSpacing: '0.1em',
                }}
              >
                LOG MORE SESSIONS TO SEE THIS TREND
              </div>
            )}
            {liftDelta && (
              <div
                className="mf-font-mono mf-fg-mute"
                style={{ fontSize: 10, marginTop: 8, textAlign: 'right' }}
              >
                {liftDelta}
              </div>
            )}
          </div>

          {/* PR timeline */}
          <div className="col-span-4 mf-card" style={{ padding: 20 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
              <div className="mf-eyebrow flex items-center gap-2">
                <Award size={12} />
                PR TIMELINE
              </div>
              <Chip kind={data.prsThisMonth > 0 ? 'ok' : 'default'}>
                {data.prsThisMonth} · 30D
              </Chip>
            </div>
            {data.prTimeline.length > 0 ? (
              <div className="flex flex-col" style={{ gap: 0 }}>
                {data.prTimeline.map((p, i) => (
                  <div
                    key={`${p.lift}-${p.date}-${i}`}
                    className="flex items-center gap-2"
                    style={{
                      padding: '10px 0',
                      borderBottom:
                        i < data.prTimeline.length - 1
                          ? '1px solid var(--mf-hairline)'
                          : 'none',
                    }}
                  >
                    <div
                      style={{
                        width: 2,
                        height: 28,
                        background: 'var(--mf-accent)',
                        borderRadius: 1,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {p.lift}
                      </div>
                      <div
                        className="mf-font-mono mf-fg-mute mf-tnum"
                        style={{ fontSize: 9, marginTop: 2 }}
                      >
                        {p.date}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div
                        className="mf-font-display mf-tnum"
                        style={{ fontSize: 13, lineHeight: 1 }}
                      >
                        {p.weight}
                      </div>
                      <div
                        className="mf-font-mono"
                        style={{
                          fontSize: 9,
                          marginTop: 3,
                          fontWeight: 600,
                          color: 'var(--mf-green)',
                        }}
                      >
                        {p.delta}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="mf-fg-mute mf-font-mono"
                style={{
                  padding: '32px 0',
                  textAlign: 'center',
                  fontSize: 11,
                  letterSpacing: '0.1em',
                }}
              >
                NO PRS LOGGED YET
              </div>
            )}
          </div>

          {/* 180-day heatmap */}
          <div className="col-span-8 mf-card" style={{ padding: 20 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
              <div>
                <div className="mf-eyebrow flex items-center gap-2">
                  <Flame size={12} />
                  TRAINING HEATMAP · 180 DAYS
                </div>
                <div
                  className="mf-font-display mf-tnum"
                  style={{ fontSize: 22, lineHeight: 1, marginTop: 4 }}
                >
                  {data.adherencePct}
                  <span className="mf-fg-mute" style={{ fontSize: 12 }}>
                    % · {data.sessionCount} SESSIONS
                  </span>
                </div>
              </div>
              <div
                className="flex items-center gap-2 mf-font-mono mf-fg-mute"
                style={{ fontSize: 9, letterSpacing: '0.1em' }}
              >
                <span>OFF</span>
                <div className="flex" style={{ gap: 2 }}>
                  {[0, 1].map((v) => (
                    <div
                      key={v}
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 2,
                        background: 'var(--mf-accent)',
                        opacity: v === 0 ? 0.08 : 1,
                      }}
                    />
                  ))}
                </div>
                <span>DONE</span>
              </div>
            </div>
            <Heatmap
              cells={data.heatmap180}
              cols={data.heatmap180[0]?.length ?? 26}
              rows={7}
              cell={12}
              gap={3}
            />
          </div>

          {/* Body comp */}
          <div className="col-span-4 mf-card" style={{ padding: 20 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
              <div className="mf-eyebrow flex items-center gap-2">
                <Scale size={12} />
                BODY COMPOSITION
              </div>
            </div>
            <div
              className="mf-font-mono mf-fg-mute"
              style={{ fontSize: 9, letterSpacing: '0.1em', marginBottom: 4 }}
            >
              BODY WEIGHT
            </div>
            <div className="flex items-baseline" style={{ gap: 8 }}>
              <div
                className="mf-font-display mf-tnum"
                style={{ fontSize: 36, lineHeight: 1 }}
              >
                {data.bodyWeight != null ? data.bodyWeight.toFixed(1) : '—'}
                <span className="mf-fg-mute" style={{ fontSize: 14 }}>
                  {' '}
                  LB
                </span>
              </div>
            </div>
            {data.bwTrendDelta && (
              <div
                className="mf-font-mono"
                style={{
                  fontSize: 10,
                  marginTop: 6,
                  color: data.bwTrendDelta.startsWith('▼')
                    ? 'var(--mf-green)'
                    : data.bwTrendDelta.startsWith('▲')
                      ? 'var(--mf-fg-dim)'
                      : 'var(--mf-fg-mute)',
                }}
              >
                {data.bwTrendDelta}
              </div>
            )}
            {data.bwSparkline.length > 1 && (
              <div style={{ marginTop: 12 }}>
                <Sparkline data={data.bwSparkline} w={260} h={44} />
              </div>
            )}

            <div
              style={{
                marginTop: 16,
                paddingTop: 16,
                borderTop: '1px solid var(--mf-hairline)',
              }}
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div
                    className="mf-font-mono mf-fg-mute"
                    style={{ fontSize: 9, letterSpacing: '0.1em', marginBottom: 4 }}
                  >
                    BODY FAT
                  </div>
                  <div
                    className="mf-font-display mf-tnum"
                    style={{ fontSize: 24, lineHeight: 1 }}
                  >
                    {bf != null ? bf.toFixed(1) : '—'}
                    <span className="mf-fg-mute" style={{ fontSize: 12 }}>
                      %
                    </span>
                  </div>
                </div>
                <div>
                  <div
                    className="mf-font-mono mf-fg-mute"
                    style={{ fontSize: 9, letterSpacing: '0.1em', marginBottom: 4 }}
                  >
                    SLEEP
                  </div>
                  <div
                    className="mf-font-display mf-tnum"
                    style={{ fontSize: 24, lineHeight: 1 }}
                  >
                    {recent?.sleep != null ? recent.sleep.toFixed(1) : '—'}
                    <span className="mf-fg-mute" style={{ fontSize: 12 }}>
                      {' '}
                      HR
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ClientDesktopShell>
    </div>
  );
}
