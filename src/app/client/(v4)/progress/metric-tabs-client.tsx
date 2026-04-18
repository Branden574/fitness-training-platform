'use client';

import { useState } from 'react';
import { LineChart } from '@/components/ui/mf';

interface MetricSeries {
  label: string;
  long: string;
  data: number[];
  labels: string[];
  unit: string;
}

interface ProgressMetricTabsClientProps {
  metrics: Record<'bench' | 'squat' | 'deadlift' | 'bw', MetricSeries>;
  benchDelta: string | null;
  bwDelta: string | null;
}

const ORDER: Array<keyof ProgressMetricTabsClientProps['metrics']> = ['bench', 'squat', 'deadlift', 'bw'];
const RANGES = ['4W', '8W', '12W', '1Y'] as const;

export default function ProgressMetricTabsClient({ metrics, benchDelta, bwDelta }: ProgressMetricTabsClientProps) {
  const [metric, setMetric] = useState<keyof typeof metrics>('bench');
  const [range, setRange] = useState<(typeof RANGES)[number]>('12W');
  const current = metrics[metric];
  const last = current.data[current.data.length - 1];
  const delta = metric === 'bench' ? benchDelta : metric === 'bw' ? bwDelta : null;

  const limited = (() => {
    if (range === '12W' || range === '1Y') return current;
    const n = range === '4W' ? 4 : 8;
    return {
      ...current,
      data: current.data.slice(-n),
      labels: current.labels.slice(-n),
    };
  })();

  return (
    <>
      <div className="flex gap-1" style={{ marginBottom: 12 }}>
        {ORDER.map((k) => {
          const active = metric === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setMetric(k)}
              className="flex-1 mf-font-mono"
              style={{
                height: 32,
                borderRadius: 6,
                background: active ? 'var(--mf-accent)' : 'var(--mf-surface-3)',
                color: active ? 'var(--mf-accent-ink)' : 'var(--mf-fg-dim)',
                border: `1px solid ${active ? 'var(--mf-accent)' : 'var(--mf-hairline)'}`,
                fontSize: 11,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              {metrics[k].label}
            </button>
          );
        })}
      </div>

      <div className="mf-card" style={{ padding: 12 }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
          <div>
            <div className="mf-eyebrow">{current.long}</div>
            <div
              className="mf-font-display mf-tnum"
              style={{ fontSize: 28, lineHeight: 1, marginTop: 2 }}
            >
              {last != null ? last : '—'}
              <span className="mf-fg-mute" style={{ fontSize: 13 }}> {current.unit}</span>
            </div>
          </div>
          <div className="flex gap-1">
            {RANGES.map((r) => {
              const active = range === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className="mf-font-mono"
                  style={{
                    padding: '0 8px',
                    height: 28,
                    borderRadius: 4,
                    background: active ? 'var(--mf-surface-3)' : 'transparent',
                    color: active ? 'var(--mf-fg)' : 'var(--mf-fg-mute)',
                    fontSize: 10,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {r}
                </button>
              );
            })}
          </div>
        </div>
        {limited.data.length > 1 ? (
          <LineChart data={limited.data} labels={limited.labels} h={160} />
        ) : (
          <div
            className="mf-fg-mute mf-font-mono"
            style={{
              textAlign: 'center',
              padding: '32px 0',
              fontSize: 11,
              letterSpacing: '0.1em',
            }}
          >
            LOG MORE SESSIONS TO SEE A TREND
          </div>
        )}
        {delta && (
          <div
            className="mf-font-mono mf-fg-mute"
            style={{ fontSize: 10, marginTop: 8, textAlign: 'right' }}
          >
            {delta}
          </div>
        )}
      </div>
    </>
  );
}
