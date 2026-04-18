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
  const v =
    variant === 'primary' ? 'mf-btn-primary' :
    variant === 'ghost'   ? 'mf-btn-ghost'   : '';
  return (
    <button className={`mf-btn ${v} ${className ?? ''}`} {...rest}>
      {Icon ? <Icon size={14} /> : null}
      {children}
    </button>
  );
}
