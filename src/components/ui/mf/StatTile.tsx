import type { ComponentType } from 'react';

export interface StatTileProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: ComponentType<{ size?: number; className?: string }>;
  accent?: boolean;
  className?: string;
}

export default function StatTile({
  label,
  value,
  unit,
  icon: Icon,
  accent,
  className,
}: StatTileProps) {
  return (
    <div className={`mf-card ${className ?? ''}`} style={{ padding: '18px', minHeight: 92 }}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="mf-eyebrow mb-2">{label}</div>
          <div className="flex items-baseline gap-1.5">
            <span
              className="mf-font-display tnum"
              style={{
                fontSize: 34,
                lineHeight: 0.95,
                color: accent ? 'var(--mf-accent)' : 'var(--mf-fg)',
                fontWeight: 600,
              }}
            >
              {value}
            </span>
            {unit ? (
              <span
                className="mf-font-mono mf-fg-mute"
                style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}
              >
                {unit}
              </span>
            ) : null}
          </div>
        </div>
        {Icon ? <Icon size={16} className="mf-fg-mute" /> : null}
      </div>
    </div>
  );
}
