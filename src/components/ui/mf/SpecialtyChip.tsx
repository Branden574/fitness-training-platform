import type { MouseEventHandler, ReactNode } from 'react';

export interface SpecialtyChipProps {
  children: ReactNode;
  selected?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  as?: 'button' | 'span';
  className?: string;
}

export default function SpecialtyChip({
  children,
  selected = false,
  onClick,
  as,
  className,
}: SpecialtyChipProps) {
  const style = {
    display: 'inline-flex',
    alignItems: 'center',
    height: 26,
    padding: '0 10px',
    borderRadius: 999,
    background: selected ? 'var(--mf-accent)' : 'var(--mf-surface-2)',
    border: `1px solid ${selected ? 'var(--mf-accent)' : 'var(--mf-hairline-strong)'}`,
    color: selected ? 'var(--mf-accent-ink)' : 'var(--mf-fg-dim)',
    fontSize: 10,
    fontWeight: 500,
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    cursor: onClick ? 'pointer' : 'default',
  };
  const cls = `mf-font-mono ${className ?? ''}`;
  const Tag = as ?? (onClick ? 'button' : 'span');
  if (Tag === 'button') {
    return (
      <button type="button" onClick={onClick} className={cls} style={style}>
        {children}
      </button>
    );
  }
  return (
    <span className={cls} style={style}>
      {children}
    </span>
  );
}
