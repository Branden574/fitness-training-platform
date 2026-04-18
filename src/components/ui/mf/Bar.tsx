export interface BarProps {
  pct?: number;
  height?: number;
  accent?: boolean;
  className?: string;
}

export default function Bar({ pct = 0, height = 4, accent, className }: BarProps) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div
      className={className}
      style={{
        height,
        background: 'var(--mf-hairline)',
        borderRadius: 999,
        overflow: 'hidden',
      }}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        style={{
          width: `${clamped}%`,
          height: '100%',
          background: accent ? 'var(--mf-accent)' : 'var(--mf-fg)',
          transition: 'width .3s ease',
        }}
      />
    </div>
  );
}
