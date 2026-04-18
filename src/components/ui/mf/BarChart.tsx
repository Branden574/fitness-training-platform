// v4 · phase 0 stub — implemented in phase 1
export interface BarChartProps {
  data: number[];
  labels?: string[];
  h?: number;
  accent?: boolean;
  className?: string;
}

export default function BarChart({ data, labels, h = 180, accent, className }: BarChartProps) {
  return (
    <svg
      data-mf-stub="BarChart"
      data-points={data.length}
      data-labels={labels?.length ?? 0}
      data-accent={accent ? '' : undefined}
      viewBox={`0 0 600 ${h}`}
      width="100%"
      height={h}
      className={className}
      aria-hidden
    />
  );
}
