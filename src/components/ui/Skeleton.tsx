'use client';

import { clsx } from 'clsx';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export default function Skeleton({ className, variant = 'text', width, height }: SkeletonProps) {
  return (
    <div
      className={clsx(
        'animate-pulse bg-surface-200 dark:bg-surface-800',
        variant === 'text' && 'h-4 rounded',
        variant === 'circular' && 'rounded-full',
        variant === 'rectangular' && 'rounded-card',
        className,
      )}
      style={{ width, height }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-surface-900 rounded-card border border-surface-200 dark:border-surface-800 p-6 space-y-4">
      <Skeleton className="w-1/3 h-4" />
      <Skeleton className="w-full h-8" />
      <div className="space-y-2">
        <Skeleton className="w-full h-3" />
        <Skeleton className="w-4/5 h-3" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">
          <Skeleton variant="circular" width={32} height={32} />
          <Skeleton className="flex-1 h-4" />
          <Skeleton className="w-20 h-4" />
          <Skeleton className="w-16 h-4" />
        </div>
      ))}
    </div>
  );
}
