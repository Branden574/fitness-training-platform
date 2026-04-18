'use client';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  className?: string;
}

export default function Toggle({ checked, onChange, label, className }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`inline-flex items-center gap-2 text-xs mf-fg-dim ${className ?? ''}`}
      role="switch"
      aria-checked={checked}
      aria-label={label}
    >
      <span
        style={{
          width: 32,
          height: 18,
          borderRadius: 10,
          background: checked ? 'var(--mf-accent)' : 'var(--mf-hairline-strong)',
          position: 'relative',
          transition: 'background .2s ease',
          display: 'inline-block',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: checked ? 16 : 2,
            width: 14,
            height: 14,
            borderRadius: 10,
            background: '#fff',
            transition: 'left .2s ease',
          }}
        />
      </span>
      {label}
    </button>
  );
}
