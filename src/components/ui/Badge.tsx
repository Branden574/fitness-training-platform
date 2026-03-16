'use client';

import { ReactNode } from 'react';
import { clsx } from 'clsx';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'brand';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-surface-100 text-surface-700 dark:bg-surface-800 dark:text-surface-300',
  success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  danger:  'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  info:    'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  brand:   'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400',
};

const dotStyles: Record<BadgeVariant, string> = {
  default: 'bg-surface-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger:  'bg-red-500',
  info:    'bg-blue-500',
  brand:   'bg-brand-500',
};

export default function Badge({ children, variant = 'default', size = 'sm', dot, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium rounded-full',
        size === 'sm' ? 'text-xs px-2 py-0.5 gap-1' : 'text-sm px-2.5 py-0.5 gap-1.5',
        variantStyles[variant],
        className,
      )}
    >
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full', dotStyles[variant])} />}
      {children}
    </span>
  );
}
