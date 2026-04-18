export interface BarChartProps {
  data: number[];
  labels?: string[];
  h?: number;
  accent?: boolean;
  className?: string;
}

export default function BarChart({
  data,
  labels,
  h = 180,
  accent,
  className,
}: BarChartProps) {
  if (!data?.length) return null;

  const w = 600;
  const padL = 30;
  const padR = 12;
  const padT = 10;
  const padB = 20;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const max = Math.max(...data) * 1.1 || 1;

  const bw = (innerW / data.length) * 0.7;
  const gap = (innerW / data.length) * 0.3;
  const fill = accent ? 'var(--mf-accent)' : 'var(--mf-fg)';

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      className={className}
      style={{ display: 'block' }}
    >
      <line
        x1={padL}
        x2={w - padR}
        y1={h - padB}
        y2={h - padB}
        stroke="var(--mf-hairline-strong)"
      />
      {data.map((v, i) => {
        const bh = (v / max) * innerH;
        const x = padL + i * (bw + gap) + gap / 2;
        const y = h - padB - bh;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={bh} fill={fill} rx={1} />
            {labels?.[i] ? (
              <text
                x={x + bw / 2}
                y={h - 6}
                fill="var(--mf-fg-mute)"
                fontSize="9"
                fontFamily="var(--font-mf-mono), ui-monospace, monospace"
                textAnchor="middle"
              >
                {labels[i]}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
