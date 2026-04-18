import { useId } from 'react';

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
  const uid = useId().replace(/:/g, '');
  if (!data?.length) return null;

  const w = 600;
  const padL = 36;
  const padR = 12;
  const padT = 12;
  const padB = 24;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const pad = (max - min) * 0.15 || 1;
  const yMin = Math.max(0, min - pad);
  const yMax = max + pad;
  const yRange = yMax - yMin;

  const x = (i: number) => padL + (i / (data.length - 1)) * innerW;
  const y = (v: number) => padT + innerH - ((v - yMin) / yRange) * innerH;

  const pathD = data
    .map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`)
    .join(' ');
  const fillD = `${pathD} L${x(data.length - 1)},${padT + innerH} L${x(0)},${padT + innerH} Z`;

  const yTicks = 4;
  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => yMin + (yRange * i) / yTicks);
  const stroke = accent ? 'var(--mf-accent)' : 'var(--mf-fg)';
  const gradId = `mf-linegrad-${uid}`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      className={className}
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.25" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>

      {showGrid &&
        ticks.map((t, i) => (
          <line
            key={`g${i}`}
            x1={padL}
            x2={w - padR}
            y1={y(t)}
            y2={y(t)}
            stroke="var(--mf-hairline)"
            strokeWidth="1"
            strokeDasharray={i === 0 ? '' : '2 4'}
          />
        ))}

      {showAxis &&
        ticks.map((t, i) => (
          <text
            key={`t${i}`}
            x={padL - 6}
            y={y(t) + 3}
            textAnchor="end"
            fill="var(--mf-fg-mute)"
            fontSize="9"
            fontFamily="var(--font-mf-mono), ui-monospace, monospace"
          >
            {Math.round(t)}
          </text>
        ))}

      {showAxis && labels?.length
        ? labels.map((l, i) =>
            i % Math.ceil(labels.length / 6) === 0 ? (
              <text
                key={`l${i}`}
                x={x(i)}
                y={h - 6}
                textAnchor="middle"
                fill="var(--mf-fg-mute)"
                fontSize="9"
                fontFamily="var(--font-mf-mono), ui-monospace, monospace"
              >
                {l}
              </text>
            ) : null,
          )
        : null}

      <path d={fillD} fill={`url(#${gradId})`} />
      <path
        d={pathD}
        stroke={stroke}
        strokeWidth={strokeW}
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      <circle cx={x(data.length - 1)} cy={y(data[data.length - 1])} r="3.5" fill={stroke} />
      <circle
        cx={x(data.length - 1)}
        cy={y(data[data.length - 1])}
        r="6"
        fill="none"
        stroke={stroke}
        strokeWidth="1"
        opacity="0.4"
      />
    </svg>
  );
}
