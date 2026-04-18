// v4 · phase 0 stub — implemented in phase 1
export interface PlaceholderProps {
  label?: string;
  aspect?: string;
  className?: string;
  minH?: number | string;
}

export default function Placeholder({ label = 'IMG', aspect = '16/9', className, minH }: PlaceholderProps) {
  return (
    <div
      data-mf-stub="Placeholder"
      className={`mf-ph-img ${className ?? ''}`}
      style={{ aspectRatio: aspect, minHeight: minH }}
    >
      <span>{label}</span>
    </div>
  );
}
