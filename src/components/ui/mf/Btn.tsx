// v4 · phase 0 stub — implemented in phase 1
import type { ButtonHTMLAttributes, ComponentType, ReactNode } from 'react';

export type BtnVariant = 'default' | 'primary' | 'ghost';

export interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  icon?: ComponentType<{ size?: number; className?: string }>;
  children?: ReactNode;
}

export default function Btn({
  variant = 'default',
  icon: Icon,
  children,
  className,
  ...rest
}: BtnProps) {
  const variantClass =
    variant === 'primary' ? 'mf-btn-primary' :
    variant === 'ghost'   ? 'mf-btn-ghost'   : '';
  return (
    <button
      data-mf-stub="Btn"
      className={`mf-btn ${variantClass} ${className ?? ''}`}
      {...rest}
    >
      {Icon ? <Icon size={14} /> : null}
      {children}
    </button>
  );
}
