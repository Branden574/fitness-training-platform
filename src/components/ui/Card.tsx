'use client';

import { ReactNode, HTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

const paddings = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export default function Card({ children, padding = 'md', hover, className, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-white dark:bg-surface-900 rounded-card border border-surface-200 dark:border-surface-800 shadow-card',
        paddings[padding],
        hover && 'transition-shadow duration-200 hover:shadow-elevated',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx('pb-4 border-b border-surface-100 dark:border-surface-800', className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h3 className={clsx('text-lg font-semibold text-surface-900 dark:text-surface-100', className)}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={clsx('text-sm text-surface-500 dark:text-surface-400 mt-1', className)}>
      {children}
    </p>
  );
}
