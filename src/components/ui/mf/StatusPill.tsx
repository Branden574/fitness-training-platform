export type StatusPillKind = 'accepting' | 'waitlist' | 'closed';
export type StatusPillSize = 'sm' | 'lg';

export interface StatusPillProps {
  kind: StatusPillKind;
  size?: StatusPillSize;
  className?: string;
}

const STYLES: Record<
  StatusPillKind,
  { bg: string; border: string; color: string; dot: string; label: string }
> = {
  accepting: {
    bg: 'rgba(43,217,133,0.10)',
    border: 'rgba(43,217,133,0.32)',
    color: 'var(--mf-green)',
    dot: 'var(--mf-green)',
    label: 'ACCEPTING CLIENTS',
  },
  waitlist: {
    bg: 'rgba(245,181,68,0.10)',
    border: 'rgba(245,181,68,0.32)',
    color: 'var(--mf-amber)',
    dot: 'var(--mf-amber)',
    label: 'WAITLIST',
  },
  closed: {
    bg: 'rgba(255,77,94,0.10)',
    border: 'rgba(255,77,94,0.30)',
    color: 'var(--mf-red)',
    dot: 'var(--mf-red)',
    label: 'NOT ACCEPTING',
  },
};

export default function StatusPill({ kind, size = 'sm', className }: StatusPillProps) {
  const s = STYLES[kind];
  const height = size === 'lg' ? 28 : 22;
  const fontSize = size === 'lg' ? 11 : 10;
  return (
    <span
      className={`mf-font-mono ${className ?? ''}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height,
        padding: '0 10px',
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: s.color,
        borderRadius: 999,
        fontSize,
        fontWeight: 500,
        letterSpacing: '0.1em',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: s.dot,
          boxShadow: `0 0 0 3px ${s.bg}`,
        }}
      />
      {s.label}
    </span>
  );
}
