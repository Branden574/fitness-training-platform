// v4 · phase 0 stub — implemented in phase 1
export interface SparklineProps {
  data: number[];
  w?: number;
  h?: number;
  fill?: boolean;
  className?: string;
}

export default function Sparkline({ data, w = 100, h = 32, fill = true, className }: SparklineProps) {
  return (
    <svg
      data-mf-stub="Sparkline"
      data-points={data.length}
      data-fill={fill ? '' : undefined}
      width={w}
      height={h}
      className={`mf-spark ${className ?? ''}`}
      aria-hidden
    />
  );
}
