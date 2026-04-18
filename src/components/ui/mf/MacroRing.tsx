// v4 · phase 0 stub — implemented in phase 1
export interface MacroRingProps {
  pct?: number;
  color?: string;
  label?: string;
  value: string | number;
  target: string | number;
  size?: number;
  stroke?: number;
  className?: string;
}

export default function MacroRing({ pct = 0, color, label, value, target, size = 68, stroke = 6, className }: MacroRingProps) {
  return (
    <div
      data-mf-stub="MacroRing"
      data-pct={pct}
      data-stroke={stroke}
      className={className}
      style={{ width: size, height: size, color }}
      aria-label={`${label ?? 'macro'} ${value} of ${target}`}
    />
  );
}
