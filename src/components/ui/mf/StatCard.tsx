// v4 · phase 0 stub — implemented in phase 1
export interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  delta?: string;
  sparkData?: number[];
  accent?: boolean;
  className?: string;
}

export default function StatCard({ label, value, unit, delta, accent, className }: StatCardProps) {
  return (
    <div data-mf-stub="StatCard" data-accent={accent ? '' : undefined} className={`mf-card ${className ?? ''}`}>
      <div className="mf-eyebrow">{label}</div>
      <span className="mf-font-display mf-tnum">{value}</span>
      {unit ? <span className="mf-font-mono">{unit}</span> : null}
      {delta ? <div className="mf-font-mono">{delta}</div> : null}
    </div>
  );
}
