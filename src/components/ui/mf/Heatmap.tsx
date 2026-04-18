// v4 · phase 0 stub — implemented in phase 1
export interface HeatmapProps {
  cells: number[][];
  cols?: number;
  rows?: number;
  cell?: number;
  gap?: number;
  rowLabels?: string[];
  className?: string;
}

export default function Heatmap({
  cells,
  cols = 12,
  rows = 7,
  cell = 14,
  gap = 3,
  rowLabels,
  className,
}: HeatmapProps) {
  const w = cols * (cell + gap) + 20;
  const h = rows * (cell + gap) + 6;
  return (
    <svg
      data-mf-stub="Heatmap"
      data-rows={cells.length}
      data-cell={cell}
      data-gap={gap}
      data-rowlabels={rowLabels?.length ?? 0}
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      className={className}
      aria-hidden
    />
  );
}
