'use client';

import { ReactNode } from 'react';
import { clsx } from 'clsx';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  change?: { value: string; positive: boolean };
  className?: string;
}

export default function StatCard({ label, value, icon, change, className }: StatCardProps) {
  return (
    <div
      className={clsx(
        'bg-white dark:bg-surface-900 rounded-card border border-surface-200 dark:border-surface-800 p-5',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-surface-500 dark:text-surface-400">{label}</p>
          <p className="text-2xl font-bold text-surface-900 dark:text-surface-100 mt-1">{value}</p>
          {change && (
            <p className={clsx(
              'text-xs font-medium mt-1',
              change.positive ? 'text-emerald-600' : 'text-red-600'
            )}>
              {change.positive ? '+' : ''}{change.value}
            </p>
          )}
        </div>
        {icon && (
          <div className="p-2 rounded-lg bg-surface-50 dark:bg-surface-800 text-surface-500">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
