// v4 · phase 0 stub — implemented in phase 1
export interface ScoreboardProps {
  value: string | number;
  unit?: string;
  label?: string;
  size?: number;
  delta?: string;
  accent?: boolean;
  className?: string;
}

export default function Scoreboard({ value, unit, label, size = 72, delta, accent, className }: ScoreboardProps) {
  return (
    <div data-mf-stub="Scoreboard" data-accent={accent ? '' : undefined} className={className}>
      {label ? <div className="mf-eyebrow">{label}</div> : null}
      <span className="mf-font-display mf-tnum" style={{ fontSize: size }}>{value}</span>
      {unit ? <span className="mf-font-mono">{unit}</span> : null}
      {delta ? <div className="mf-font-mono">{delta}</div> : null}
    </div>
  );
}
