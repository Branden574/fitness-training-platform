// v4 · phase 0 stub — implemented in phase 1
export interface RingProps {
  pct?: number;
  size?: number;
  stroke?: number;
  label?: string;
  className?: string;
}

export default function Ring({ pct = 0, size = 52, stroke = 4, label, className }: RingProps) {
  return (
    <div
      data-mf-stub="Ring"
      data-pct={pct}
      data-stroke={stroke}
      className={className}
      style={{ width: size, height: size }}
      aria-label={label ?? `${pct}%`}
    />
  );
}
