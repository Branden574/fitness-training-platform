export interface CalRingProps {
  eaten?: number;
  target?: number;
  burn?: number;
  className?: string;
}

export default function CalRing({
  eaten = 0,
  target = 2000,
  burn = 0,
  className,
}: CalRingProps) {
  const left = Math.max(0, target - eaten);
  const pct = Math.min(100, (eaten / target) * 100);
  const size = 148;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <div className={`flex items-center gap-4 ${className ?? ''}`}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="var(--mf-hairline-strong)"
            strokeWidth={stroke}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="var(--mf-accent)"
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={c}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="mf-eyebrow">REMAINING</span>
          <span
            className="mf-font-display mf-tnum"
            style={{ fontSize: 40, lineHeight: 1, marginTop: 2 }}
          >
            {left}
          </span>
          <span
            className="mf-font-mono mf-fg-mute"
            style={{ fontSize: 10, marginTop: 4 }}
          >
            KCAL
          </span>
        </div>
      </div>
      <div className="flex-1" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="mf-eyebrow">TARGET</div>
            <div className="mf-font-display mf-tnum" style={{ fontSize: 18, lineHeight: 1 }}>
              {target}
            </div>
          </div>
          <span className="mf-font-mono mf-fg-mute" style={{ fontSize: 10 }}>−</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="mf-eyebrow">FOOD</div>
            <div className="mf-font-display mf-tnum" style={{ fontSize: 18, lineHeight: 1 }}>
              {eaten}
            </div>
          </div>
          <span className="mf-font-mono mf-fg-mute" style={{ fontSize: 10 }}>+</span>
        </div>
        <div
          className="flex items-center justify-between"
          style={{ borderTop: '1px solid var(--mf-hairline)', paddingTop: 8 }}
        >
          <div>
            <div className="mf-eyebrow" style={{ color: 'var(--mf-accent)' }}>EXERCISE</div>
            <div
              className="mf-font-display mf-tnum mf-accent"
              style={{ fontSize: 18, lineHeight: 1 }}
            >
              {burn}
            </div>
          </div>
          <span className="mf-font-mono mf-fg-mute" style={{ fontSize: 10 }}>=</span>
        </div>
      </div>
    </div>
  );
}
