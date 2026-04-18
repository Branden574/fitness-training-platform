export interface AthletePhProps {
  label?: string;
  className?: string;
  h?: number | string;
}

export default function AthletePh({
  label = 'ATHLETE',
  className,
  h = 260,
}: AthletePhProps) {
  return (
    <div
      className={`mf-duotone ${className ?? ''}`}
      style={{ height: h, position: 'relative', borderRadius: 8 }}
    >
      <div
        className="mf-ph-img"
        style={{ position: 'absolute', inset: 0, borderRadius: 8 }}
      >
        <span style={{ position: 'relative', zIndex: 2 }}>{label}</span>
      </div>
    </div>
  );
}
