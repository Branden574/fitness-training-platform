// v4 · phase 0 stub — implemented in phase 1
import type { ReactNode } from 'react';

export type DesktopShellRole = 'trainer' | 'admin';

export interface DesktopShellProps {
  role?: DesktopShellRole;
  active?: string;
  title?: string;
  breadcrumbs?: string;
  headerRight?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export default function DesktopShell({
  role = 'trainer',
  active,
  title,
  breadcrumbs,
  headerRight,
  children,
  className,
}: DesktopShellProps) {
  return (
    <div
      data-mf-stub="DesktopShell"
      data-role={role}
      data-active={active}
      className={className}
    >
      {breadcrumbs ? <div className="mf-eyebrow">{breadcrumbs}</div> : null}
      {title ? <div className="mf-font-display">{title}</div> : null}
      {headerRight}
      {children}
    </div>
  );
}
