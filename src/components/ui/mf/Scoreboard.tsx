export interface ScoreboardProps {
  value: string | number;
  unit?: string;
  label?: string;
  size?: number;
  delta?: string;
  accent?: boolean;
  className?: string;
}

function deltaColor(delta: string): string {
  if (delta.startsWith('+')) return 'var(--mf-green)';
  if (delta.startsWith('-')) return 'var(--mf-red)';
  return 'var(--mf-fg-dim)';
}

export default function Scoreboard({
  value,
  unit,
  label,
  size = 72,
  delta,
  accent,
  className,
}: ScoreboardProps) {
  return (
    <div className={className}>
      {label ? <div className="mf-eyebrow mb-1">{label}</div> : null}
      <div className="flex items-baseline gap-2">
        <span
          className="mf-font-display mf-tnum"
          style={{
            fontSize: size,
            fontWeight: 600,
            lineHeight: 1,
            letterSpacing: '-0.02em',
            color: accent ? 'var(--mf-accent)' : 'var(--mf-fg)',
          }}
        >
          {value}
        </span>
        {unit ? (
          <span
            className="mf-font-mono mf-fg-dim"
            style={{
              fontSize: 12,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            {unit}
          </span>
        ) : null}
      </div>
      {delta ? (
        <div
          className="mf-font-mono"
          style={{ fontSize: 11, marginTop: 4, color: deltaColor(delta) }}
        >
          {delta}
        </div>
      ) : null}
    </div>
  );
}
