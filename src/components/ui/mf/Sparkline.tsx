export interface SparklineProps {
  data: number[];
  w?: number;
  h?: number;
  fill?: boolean;
  className?: string;
}

export default function Sparkline({
  data,
  w = 100,
  h = 32,
  fill = true,
  className,
}: SparklineProps) {
  if (!data?.length) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const pts = data.map<[number, number]>((v, i) => [
    (i / (data.length - 1)) * w,
    h - ((v - min) / range) * (h - 2) - 1,
  ]);

  const d = pts
    .map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ');
  const fd = `${d} L${w},${h} L0,${h} Z`;

  return (
    <svg width={w} height={h} className={`mf-spark block ${className ?? ''}`} aria-hidden>
      {fill ? <path className="fill" d={fd} /> : null}
      <path d={d} />
    </svg>
  );
}
