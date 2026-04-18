export type StatusDotKind = 'active' | 'behind' | 'paused' | 'new';

export interface StatusDotProps {
  kind?: StatusDotKind;
  className?: string;
}

const COLOR: Record<StatusDotKind, string> = {
  active: 'var(--mf-green)',
  behind: 'var(--mf-amber)',
  paused: 'var(--mf-fg-mute)',
  new: 'var(--mf-blue)',
};

export default function StatusDot({ kind = 'active', className }: StatusDotProps) {
  const c = COLOR[kind];
  return (
    <span
      className={className}
      style={{
        display: 'inline-block',
        width: 6,
        height: 6,
        borderRadius: 10,
        background: c,
        boxShadow: `0 0 0 3px ${c}20`,
      }}
      aria-label={kind}
    />
  );
}
