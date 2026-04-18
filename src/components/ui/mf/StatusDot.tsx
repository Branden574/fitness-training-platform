// v4 · phase 0 stub — implemented in phase 1
export type StatusDotKind = 'active' | 'behind' | 'paused' | 'new';

export interface StatusDotProps {
  kind?: StatusDotKind;
  className?: string;
}

export default function StatusDot({ kind = 'active', className }: StatusDotProps) {
  return <span data-mf-stub="StatusDot" data-kind={kind} className={className} aria-hidden />;
}
