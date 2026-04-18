// v4 · phase 0 stub — implemented in phase 1
export interface BarProps {
  pct?: number;
  height?: number;
  accent?: boolean;
  className?: string;
}

export default function Bar({ pct = 0, height = 4, accent, className }: BarProps) {
  return (
    <div
      data-mf-stub="Bar"
      data-pct={pct}
      data-accent={accent ? '' : undefined}
      className={className}
      style={{ height }}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    />
  );
}
