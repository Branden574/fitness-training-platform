export interface LoadingPulseProps {
  label?: string;
  full?: boolean;
  className?: string;
}

export default function LoadingPulse({
  label = 'LOADING',
  full = true,
  className,
}: LoadingPulseProps) {
  return (
    <div
      data-mf
      className={`mf-bg mf-fg ${className ?? ''}`}
      style={{
        minHeight: full ? '100vh' : 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="flex items-center gap-3">
        <span
          className="mf-pulse"
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'var(--mf-accent)',
            display: 'inline-block',
          }}
        />
        <span
          className="mf-font-mono mf-fg-mute"
          style={{
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
