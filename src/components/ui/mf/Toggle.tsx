// v4 · phase 0 stub — implemented in phase 1
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
      data-mf-stub="Toggle"
      data-checked={checked ? '' : undefined}
      onClick={() => onChange(!checked)}
      className={className}
      role="switch"
      aria-checked={checked}
      aria-label={label}
    >
      {label}
    </button>
  );
}
