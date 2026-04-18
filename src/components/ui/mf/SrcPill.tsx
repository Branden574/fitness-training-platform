// v4 · phase 0 stub — implemented in phase 1
export type FoodSource = 'usda' | 'local' | 'community' | 'openfoodfacts' | 'custom';

export interface SrcPillProps {
  src: FoodSource;
  barcode?: string | null;
  className?: string;
}

export default function SrcPill({ src, barcode, className }: SrcPillProps) {
  return (
    <span
      data-mf-stub="SrcPill"
      data-src={src}
      data-barcode={barcode ?? undefined}
      className={className}
    >
      {src.toUpperCase()}
    </span>
  );
}
