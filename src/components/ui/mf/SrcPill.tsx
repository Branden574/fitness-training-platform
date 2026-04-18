export type FoodSource = 'usda' | 'local' | 'community' | 'openfoodfacts' | 'custom';

export interface SrcPillProps {
  src: FoodSource;
  barcode?: string | null;
  className?: string;
}

const MAP: Record<FoodSource, { label: string; color: string }> = {
  usda:          { label: 'USDA',      color: '#4D9EFF' },
  local:         { label: 'LOCAL',     color: '#A1A1A6' },
  community:     { label: 'COMMUNITY', color: '#FF4D1C' },
  openfoodfacts: { label: 'OFF',       color: '#2BD985' },
  custom:        { label: 'CUSTOM',    color: '#F5B544' },
};

export default function SrcPill({ src, barcode, className }: SrcPillProps) {
  const m = MAP[src];
  return (
    <span
      className={`mf-font-mono inline-flex items-center gap-1 ${className ?? ''}`}
      style={{
        fontSize: 8,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        padding: '2px 4px',
        borderRadius: 3,
        background: `${m.color}1A`,
        color: m.color,
        border: `1px solid ${m.color}40`,
      }}
    >
      {barcode ? <span style={{ fontSize: 9, lineHeight: 1 }}>▥</span> : null}
      {m.label}
    </span>
  );
}
