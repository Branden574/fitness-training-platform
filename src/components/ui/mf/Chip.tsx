import type { ReactNode } from 'react';

export type ChipKind = 'default' | 'live' | 'ok' | 'warn' | 'bad';

export interface ChipProps {
  kind?: ChipKind;
  children?: ReactNode;
  className?: string;
}

export default function Chip({ kind = 'default', children, className }: ChipProps) {
  const k =
    kind === 'live' ? 'mf-chip-live' :
    kind === 'ok'   ? 'mf-chip-ok'   :
    kind === 'warn' ? 'mf-chip-warn' :
    kind === 'bad'  ? 'mf-chip-bad'  : '';
  return <span className={`mf-chip ${k} ${className ?? ''}`}>{children}</span>;
}
