'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  Users,
  Layers,
  User,
  Dumbbell,
  Apple,
  MessageSquare,
  Calendar,
  Settings,
  Activity,
  CreditCard,
  Shield,
  ShoppingBag,
  Search,
  Bell,
  type LucideIcon,
} from 'lucide-react';

export type DesktopShellRole = 'trainer' | 'admin';

export interface DesktopShellNavItem {
  k: string;
  l: string;
  i: LucideIcon;
  href: string;
  badge?: number;
}

export interface DesktopShellProps {
  role?: DesktopShellRole;
  active?: string;
  title?: string;
  breadcrumbs?: string;
  headerRight?: ReactNode;
  children?: ReactNode;
  className?: string;
  brandInitials?: string;
  brandName?: string;
  brandMeta?: string;
  rosterCount?: number;
  footer?: ReactNode;
  searchPlaceholder?: string;
  nav?: DesktopShellNavItem[];
}

const TRAINER_NAV: DesktopShellNavItem[] = [
  { k: 'roster',       l: 'Roster',           i: Users,         href: '/trainer' },
  { k: 'builder',      l: 'Program Builder',  i: Layers,        href: '/trainer/builder' },
  { k: 'clientdetail', l: 'Client Detail',    i: User,          href: '/trainer/clients' },
  { k: 'exercises',    l: 'Exercise Library', i: Dumbbell,      href: '/trainer/exercises' },
  { k: 'nutrition',    l: 'Nutrition',        i: Apple,         href: '/trainer/nutrition' },
  { k: 'messages',     l: 'Inbox',            i: MessageSquare, href: '/trainer/messages' },
  { k: 'schedule',     l: 'Schedule',         i: Calendar,      href: '/trainer/schedule' },
  { k: 'settings',     l: 'Settings',         i: Settings,      href: '/trainer/settings' },
];

const ADMIN_NAV: DesktopShellNavItem[] = [
  { k: 'stats',       l: 'Overview',      i: Activity,        href: '/admin' },
  { k: 'users',       l: 'Users',         i: Users,           href: '/admin/users' },
  { k: 'invitations', l: 'Invitations',   i: MessageSquare,   href: '/admin/invitations' },
  { k: 'contacts',    l: 'Contacts',      i: User,            href: '/admin/contacts' },
  { k: 'billing',     l: 'Billing',       i: CreditCard,      href: '/admin/billing' },
  { k: 'audit',       l: 'Audit Log',     i: Shield,          href: '/admin/audit' },
  { k: 'shop',        l: 'Shop',          i: ShoppingBag,     href: '/admin/shop' },
];

function BrandMark({ role }: { role: DesktopShellRole }) {
  if (role === 'admin') {
    return (
      <div
        className="grid place-items-center"
        style={{ width: 24, height: 24, background: '#fff', borderRadius: 4 }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A0A0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      </div>
    );
  }
  return (
    <div
      className="grid place-items-center"
      style={{ width: 24, height: 24, background: 'var(--mf-accent)', borderRadius: 4 }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A0A0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m7 13-2 2 3 3 2-2" />
        <path d="m17 11 2-2-3-3-2 2" />
      </svg>
    </div>
  );
}

export default function DesktopShell({
  role = 'trainer',
  active,
  title,
  breadcrumbs,
  headerRight,
  children,
  className,
  brandName = 'MARTINEZ/FIT',
  brandMeta,
  footer,
  searchPlaceholder = 'Search athletes, exercises…',
  nav,
}: DesktopShellProps) {
  const navItems = nav ?? (role === 'admin' ? ADMIN_NAV : TRAINER_NAV);
  const resolvedMeta = brandMeta ?? (role === 'admin' ? 'ADMIN · V4' : 'TRAINER · V4');

  return (
    <div
      data-mf
      className={`flex mf-bg mf-fg ${className ?? ''}`}
      style={{ minHeight: '100vh' }}
    >
      {/* Sidebar */}
      <aside
        className="mf-s1 flex flex-col"
        style={{ width: 220, borderRight: '1px solid var(--mf-hairline)' }}
      >
        <div
          className="px-4 flex items-center gap-2"
          style={{ height: 56, borderBottom: '1px solid var(--mf-hairline)' }}
        >
          <BrandMark role={role} />
          <div>
            <div
              className="mf-font-display"
              style={{ fontSize: 14, letterSpacing: '-0.01em', lineHeight: 1 }}
            >
              {brandName}
            </div>
            <div
              className="mf-font-mono mf-fg-mute"
              style={{ fontSize: 9, marginTop: 2 }}
            >
              {resolvedMeta}
            </div>
          </div>
        </div>
        <nav className="px-2 py-3 flex-1" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map((n) => {
            const Icon = n.i;
            const isActive = active === n.k;
            return (
              <Link
                key={n.k}
                href={n.href}
                className="flex items-center gap-2.5 px-2.5 py-2 text-sm"
                style={{
                  position: 'relative',
                  borderRadius: 6,
                  background: isActive ? 'var(--mf-surface-3)' : 'transparent',
                  color: isActive ? 'var(--mf-fg)' : 'var(--mf-fg-dim)',
                }}
              >
                {isActive && (
                  <span
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 6,
                      bottom: 6,
                      width: 2,
                      background: 'var(--mf-accent)',
                    }}
                  />
                )}
                <Icon size={15} />
                <span className="flex-1">{n.l}</span>
                {n.badge ? (
                  <span
                    className="mf-font-mono"
                    style={{
                      fontSize: 9,
                      background: 'var(--mf-accent)',
                      color: 'var(--mf-accent-ink)',
                      padding: '2px 6px',
                      borderRadius: 4,
                    }}
                  >
                    {n.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        {footer ? (
          <div className="p-3" style={{ borderTop: '1px solid var(--mf-hairline)' }}>
            {footer}
          </div>
        ) : null}
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col" style={{ overflow: 'hidden' }}>
        <div
          className="mf-s1 flex items-center justify-between px-6"
          style={{ height: 56, borderBottom: '1px solid var(--mf-hairline)' }}
        >
          <div>
            {breadcrumbs ? (
              <div
                className="mf-font-mono mf-fg-mute"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                }}
              >
                {breadcrumbs}
              </div>
            ) : null}
            {title ? (
              <div
                className="mf-font-display"
                style={{ fontSize: 18, letterSpacing: '-0.01em', lineHeight: 1, marginTop: 2 }}
              >
                {title}
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <div style={{ position: 'relative' }}>
              <Search
                size={14}
                className="mf-fg-mute"
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                className="mf-input"
                style={{ height: 36, paddingLeft: 36, paddingRight: 12, width: 240 }}
                placeholder={searchPlaceholder}
              />
            </div>
            {headerRight}
            <button
              className="mf-btn mf-btn-ghost"
              style={{ height: 36, width: 36, padding: 0, position: 'relative' }}
              aria-label="Notifications"
            >
              <Bell size={14} />
              <span
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--mf-accent)',
                }}
              />
            </button>
          </div>
        </div>
        <div className="flex-1 mf-scroll" style={{ overflowY: 'auto' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
