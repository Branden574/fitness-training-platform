// v4 · phase 0 stub — implemented in phase 1
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
    <div data-mf-stub="Section" className={className}>
      {eyebrow ? <div className="mf-eyebrow">{eyebrow}</div> : null}
      {title ? <div className="mf-font-display">{title}</div> : null}
      {right}
      {children}
    </div>
  );
}
