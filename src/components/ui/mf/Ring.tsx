export interface RingProps {
  pct?: number;
  size?: number;
  stroke?: number;
  label?: string;
  className?: string;
}

export default function Ring({
  pct = 0,
  size = 52,
  stroke = 4,
  label,
  className,
}: RingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  const offset = c - (clamped / 100) * c;

  return (
    <div
      className={className}
      style={{ position: 'relative', width: size, height: size }}
      role="img"
      aria-label={label ?? `${clamped}%`}
    >
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
          stroke="var(--mf-accent)"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset .6s ease' }}
        />
      </svg>
      <div
        className="mf-font-mono mf-tnum mf-fg absolute inset-0 flex items-center justify-center"
        style={{ fontSize: 11, fontWeight: 600 }}
      >
        {clamped}%
      </div>
    </div>
  );
}
