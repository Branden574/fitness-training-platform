import type { ReactNode } from 'react';

export interface SectionProps {
  eyebrow?: string;
  title?: string;
  right?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export default function Section({ eyebrow, title, right, children, className }: SectionProps) {
  return (
    <div className={className}>
      <div className="flex items-end justify-between mb-3">
        <div>
          {eyebrow ? <div className="mf-eyebrow mb-1">{eyebrow}</div> : null}
          {title ? (
            <div
              className="mf-fg"
              style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em' }}
            >
              {title}
            </div>
          ) : null}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}
