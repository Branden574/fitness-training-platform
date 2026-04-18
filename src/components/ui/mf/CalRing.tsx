// v4 · phase 0 stub — implemented in phase 1
export interface CalRingProps {
  eaten?: number;
  target?: number;
  burn?: number;
  className?: string;
}

export default function CalRing({ eaten = 0, target = 2000, burn = 0, className }: CalRingProps) {
  return (
    <div
      data-mf-stub="CalRing"
      data-eaten={eaten}
      data-target={target}
      data-burn={burn}
      className={className}
    />
  );
}
