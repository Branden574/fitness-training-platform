// v4 · phase 0 stub — implemented in phase 1
export interface LineChartProps {
  data: number[];
  labels?: string[];
  h?: number;
  accent?: boolean;
  showGrid?: boolean;
  showAxis?: boolean;
  yUnit?: string;
  strokeW?: number;
  className?: string;
}

export default function LineChart({
  data,
  labels,
  h = 220,
  accent = true,
  showGrid = true,
  showAxis = true,
  strokeW = 2,
  className,
}: LineChartProps) {
  return (
    <svg
      data-mf-stub="LineChart"
      data-points={data.length}
      data-labels={labels?.length ?? 0}
      data-accent={accent ? '' : undefined}
      data-grid={showGrid ? '' : undefined}
      data-axis={showAxis ? '' : undefined}
      data-stroke={strokeW}
      viewBox={`0 0 600 ${h}`}
      width="100%"
      height={h}
      className={className}
      aria-hidden
    />
  );
}
