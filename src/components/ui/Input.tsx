'use client';

import { forwardRef, InputHTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-surface-700 dark:text-surface-300">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            'block w-full rounded-input border px-3.5 py-2.5 text-sm',
            'transition-colors duration-150',
            'placeholder:text-surface-400',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            error
              ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500'
              : 'border-surface-300 text-surface-900 focus:ring-brand-500 focus:border-brand-500',
            'dark:bg-surface-900 dark:border-surface-700 dark:text-surface-100',
            'disabled:bg-surface-50 disabled:text-surface-500 disabled:cursor-not-allowed',
            className,
          )}
          {...props}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {hint && !error && <p className="text-sm text-surface-500">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
