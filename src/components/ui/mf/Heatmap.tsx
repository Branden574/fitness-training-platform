export interface HeatmapProps {
  cells: number[][];
  cols?: number;
  rows?: number;
  cell?: number;
  gap?: number;
  rowLabels?: string[];
  className?: string;
}

const DEFAULT_ROW_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function Heatmap({
  cells,
  cols,
  rows,
  cell = 14,
  gap = 3,
  rowLabels = DEFAULT_ROW_LABELS,
  className,
}: HeatmapProps) {
  const actualRows = rows ?? cells.length ?? 7;
  const actualCols = cols ?? cells[0]?.length ?? 12;
  const w = actualCols * (cell + gap) + 20;
  const h = actualRows * (cell + gap) + 6;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      className={className}
      style={{ display: 'block' }}
      aria-hidden
    >
      {Array.from({ length: actualRows }).map((_, r) => (
        <text
          key={`rl${r}`}
          x={0}
          y={r * (cell + gap) + cell - 3}
          fill="var(--mf-fg-mute)"
          fontSize="9"
          fontFamily="var(--font-mf-mono), ui-monospace, monospace"
        >
          {rowLabels[r] ?? ''}
        </text>
      ))}
      {Array.from({ length: actualRows }).map((_, r) =>
        Array.from({ length: actualCols }).map((_, c) => {
          const v = cells[r]?.[c] ?? 0;
          const op = v === 0 ? 0.08 : 0.2 + v * 0.8;
          return (
            <rect
              key={`${r}-${c}`}
              x={16 + c * (cell + gap)}
              y={r * (cell + gap)}
              width={cell}
              height={cell}
              rx={2}
              fill="var(--mf-accent)"
              opacity={op}
            />
          );
        }),
      )}
    </svg>
  );
}
