'use client';

import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';
import { clsx } from 'clsx';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
}

const variants: Record<Variant, string> = {
  primary:   'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-soft hover:shadow-elevated',
  secondary: 'bg-surface-900 text-white hover:bg-surface-800 active:bg-surface-700',
  outline:   'border border-surface-300 text-surface-700 hover:bg-surface-50 active:bg-surface-100',
  ghost:     'text-surface-600 hover:bg-surface-50 hover:text-surface-900 active:bg-surface-100',
  danger:    'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
};

const sizes: Record<Size, string> = {
  sm: 'text-sm px-3 py-1.5 gap-1.5',
  md: 'text-sm px-4 py-2 gap-2',
  lg: 'text-base px-5 py-2.5 gap-2',
  xl: 'text-base px-6 py-3 gap-2.5',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, iconRight, fullWidth, className, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(
          'inline-flex items-center justify-center font-medium rounded-btn transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:pointer-events-none',
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          className,
        )}
        {...props}
      >
        {loading ? (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : icon ? (
          <span className="shrink-0">{icon}</span>
        ) : null}
        {children}
        {iconRight && <span className="shrink-0">{iconRight}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
