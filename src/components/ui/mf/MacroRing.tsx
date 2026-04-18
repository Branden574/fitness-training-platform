export interface MacroRingProps {
  pct?: number;
  color?: string;
  label?: string;
  value: string | number;
  target: string | number;
  size?: number;
  stroke?: number;
  className?: string;
}

export default function MacroRing({
  pct = 0,
  color = 'var(--mf-accent)',
  label,
  value,
  target,
  size = 68,
  stroke = 6,
  className,
}: MacroRingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  const offset = c - (clamped / 100) * c;

  return (
    <div className={`flex flex-col items-center gap-1 ${className ?? ''}`}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="var(--mf-hairline-strong)"
            strokeWidth={stroke}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={c}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset .6s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="mf-font-display mf-tnum"
            style={{ fontSize: 15, lineHeight: 1 }}
          >
            {value}
          </span>
          <span className="mf-font-mono mf-fg-mute" style={{ fontSize: 8 }}>
            /{target}
          </span>
        </div>
      </div>
      {label ? (
        <span
          className="mf-font-mono mf-fg-dim"
          style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em' }}
        >
          {label}
        </span>
      ) : null}
    </div>
  );
}
