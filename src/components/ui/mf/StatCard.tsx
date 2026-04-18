import Sparkline from './Sparkline';

export interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  delta?: string;
  sparkData?: number[];
  accent?: boolean;
  className?: string;
}

export default function StatCard({
  label,
  value,
  unit,
  delta,
  sparkData,
  accent,
  className,
}: StatCardProps) {
  const deltaSign = delta?.startsWith('+') ? '+' : delta?.startsWith('-') ? '-' : '';
  const deltaGood =
    deltaSign === '+' ||
    // Churn/failure metrics: "-" is good
    (deltaSign === '-' && /churn|failed|risk/i.test(label));
  const deltaColor = delta
    ? deltaGood
      ? 'var(--mf-green)'
      : deltaSign === '-'
        ? 'var(--mf-red)'
        : 'var(--mf-fg-dim)'
    : undefined;
  const arrow = deltaSign === '+' ? '▲' : deltaSign === '-' ? '▼' : '•';

  return (
    <div className={`mf-card ${className ?? ''}`} style={{ padding: 16 }}>
      <div className="mf-eyebrow mb-2">{label}</div>
      <div className="flex items-end justify-between gap-2">
        <div className="flex items-baseline" style={{ gap: 6 }}>
          <span
            className="mf-font-display mf-tnum"
            style={{
              fontSize: 34,
              lineHeight: 1,
              color: accent ? 'var(--mf-accent)' : 'var(--mf-fg)',
            }}
          >
            {value}
          </span>
          {unit ? (
            <span
              className="mf-font-mono mf-fg-mute"
              style={{
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              {unit}
            </span>
          ) : null}
        </div>
        {sparkData ? <Sparkline data={sparkData} w={80} h={28} /> : null}
      </div>
      {delta ? (
        <div
          className="mf-font-mono flex items-center gap-1"
          style={{ fontSize: 11, marginTop: 8, color: deltaColor }}
        >
          {arrow} {delta.replace(/^[+-]/, '')}
        </div>
      ) : null}
    </div>
  );
}
