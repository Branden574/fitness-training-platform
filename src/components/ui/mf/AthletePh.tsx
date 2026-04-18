// v4 · phase 0 stub — implemented in phase 1
export interface AthletePhProps {
  label?: string;
  className?: string;
  h?: number | string;
}

export default function AthletePh({ label = 'ATHLETE', className, h = 260 }: AthletePhProps) {
  return (
    <div
      data-mf-stub="AthletePh"
      className={`mf-duotone ${className ?? ''}`}
      style={{ height: h, borderRadius: 8, position: 'relative' }}
    >
      <div className="mf-ph-img" style={{ position: 'absolute', inset: 0, borderRadius: 8 }}>
        <span style={{ position: 'relative', zIndex: 2 }}>{label}</span>
      </div>
    </div>
  );
}
