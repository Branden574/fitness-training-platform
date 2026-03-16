'use client';

import { ReactNode } from 'react';
import { clsx } from 'clsx';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export default function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={clsx('flex flex-col items-center justify-center py-16 px-6 text-center', className)}>
      {icon && (
        <div className="w-12 h-12 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-surface-400 mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-surface-900 dark:text-surface-100">{title}</h3>
      {description && (
        <p className="text-sm text-surface-500 dark:text-surface-400 mt-1 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
