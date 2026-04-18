// v4 · phase 0 stub — implemented in phase 1
import type { ReactNode } from 'react';

export type ChipKind = 'default' | 'live' | 'ok' | 'warn' | 'bad';

export interface ChipProps {
  kind?: ChipKind;
  children?: ReactNode;
  className?: string;
}

export default function Chip({ kind = 'default', children, className }: ChipProps) {
  const kindClass =
    kind === 'live' ? 'mf-chip-live' :
    kind === 'ok'   ? 'mf-chip-ok'   :
    kind === 'warn' ? 'mf-chip-warn' :
    kind === 'bad'  ? 'mf-chip-bad'  : '';
  return (
    <span data-mf-stub="Chip" className={`mf-chip ${kindClass} ${className ?? ''}`}>
      {children}
    </span>
  );
}
