export interface AvatarProps {
  initials: string;
  size?: number;
  active?: boolean;
  className?: string;
}

export default function Avatar({ initials, size = 32, active, className }: AvatarProps) {
  return (
    <div
      className={`mf-font-mono ${className ?? ''}`}
      style={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: 6,
        background: 'var(--mf-surface-3)',
        color: 'var(--mf-fg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
        fontSize: size * 0.4,
        border: '1px solid var(--mf-hairline)',
        position: 'relative',
      }}
      aria-label={initials}
    >
      {initials}
      {active && (
        <span
          style={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            width: 10,
            height: 10,
            borderRadius: 10,
            background: 'var(--mf-green)',
            border: '2px solid var(--mf-surface-1)',
          }}
        />
      )}
    </div>
  );
}
