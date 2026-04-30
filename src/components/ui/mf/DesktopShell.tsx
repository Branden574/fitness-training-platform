'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState, type ReactNode, type FormEvent } from 'react';
import { signOut } from 'next-auth/react';
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
  Camera,
  AlertTriangle,
  Search,
  LogOut,
  Menu,
  X,
  Inbox,
  type LucideIcon,
} from 'lucide-react';
import NotificationBell from '@/components/notifications/NotificationBell';
import PushNotificationPrompt from '@/components/notifications/PushNotificationPrompt';
import NativePushRegistrar from '@/components/notifications/NativePushRegistrar';

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
  { k: 'applications', l: 'Applications',     i: Inbox,         href: '/trainer/applications' },
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
  { k: 'transformations', l: 'Transformations', i: Camera,    href: '/admin/transformations' },
  { k: 'takedowns',   l: 'Takedowns',     i: AlertTriangle,   href: '/admin/takedowns' },
  { k: 'settings',    l: 'Settings',      i: Settings,        href: '/admin/settings' },
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
  brandName = 'REPLAB',
  brandMeta,
  footer,
  searchPlaceholder = 'Search athletes, exercises…',
  nav,
}: DesktopShellProps) {
  const navItems = nav ?? (role === 'admin' ? ADMIN_NAV : TRAINER_NAV);
  const resolvedMeta = brandMeta ?? (role === 'admin' ? 'ADMIN · V4' : 'TRAINER · V4');

  const router = useRouter();
  const pathname = usePathname();
  // Deliberately NOT calling useSearchParams() at the module top — it opts
  // the enclosing route into dynamic rendering and has bitten us with server-
  // component render failures on /trainer. Read query params inside the
  // submit handler from window.location instead (safe — onSubmit only fires
  // from a real DOM event, so `window` always exists).
  const [searchValue, setSearchValue] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const onSearchSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = searchValue.trim();
    // Pages that already read `q` from the URL: /admin/users, /admin/contacts
    const targetPath =
      pathname?.startsWith('/admin')
        ? pathname.startsWith('/admin/contacts') || pathname.startsWith('/admin/users')
          ? pathname
          : '/admin/users'
        : pathname?.startsWith('/trainer/exercises')
          ? pathname
          : '/trainer';
    const params = new URLSearchParams(window.location.search);
    if (q) params.set('q', q);
    else params.delete('q');
    const qs = params.toString();
    router.push(qs ? `${targetPath}?${qs}` : targetPath);
  };

  const sidebarContent = (
    <>
      <div
        className="px-4 flex items-center gap-2"
        style={{ height: 56, borderBottom: '1px solid var(--mf-hairline)' }}
      >
        <BrandMark role={role} />
        <div style={{ flex: 1 }}>
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
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          className="md:hidden mf-btn mf-btn-ghost"
          style={{ height: 32, width: 32, padding: 0 }}
          aria-label="Close menu"
        >
          <X size={14} />
        </button>
      </div>
      <nav
        className="px-2 py-3 flex-1 mf-scroll"
        style={{ display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}
      >
        {navItems.map((n) => {
          const Icon = n.i;
          const isActive = active === n.k;
          return (
            <Link
              key={n.k}
              href={n.href}
              onClick={() => setDrawerOpen(false)}
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
      <div style={{ padding: 12, borderTop: '1px solid var(--mf-hairline)' }}>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/auth/signin' })}
          className="flex items-center gap-2.5 px-2.5 py-2 text-sm w-full"
          style={{
            borderRadius: 6,
            color: 'var(--mf-fg-dim)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <LogOut size={15} />
          <span className="flex-1">Sign out</span>
        </button>
      </div>
    </>
  );

  return (
    <div
      data-mf
      className={`flex mf-bg mf-fg ${className ?? ''}`}
      style={{ minHeight: '100vh' }}
    >
      {/* Persistent sidebar — md+ only */}
      <aside
        className="mf-s1 hidden md:flex flex-col"
        style={{
          width: 220,
          borderRight: '1px solid var(--mf-hairline)',
          // Pin the sidebar to the viewport so Sign out at the bottom
          // stays visible even when the main content is taller than
          // the screen.
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto',
        }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile drawer — same sidebar content, slides in from left on hamburger tap */}
      {drawerOpen && (
        <>
          <div
            className="md:hidden"
            onClick={() => setDrawerOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              zIndex: 90,
            }}
            aria-hidden
          />
          <aside
            className="mf-s1 md:hidden flex flex-col"
            style={{
              position: 'fixed',
              top: 0,
              bottom: 0,
              left: 0,
              width: 260,
              borderRight: '1px solid var(--mf-hairline)',
              zIndex: 95,
            }}
          >
            {sidebarContent}
          </aside>
        </>
      )}

      {/* Main */}
      <main className="flex-1 flex flex-col" style={{ overflow: 'hidden', minWidth: 0 }}>
        <div
          className="mf-s1 flex items-center justify-between"
          style={{
            height: 56,
            borderBottom: '1px solid var(--mf-hairline)',
            paddingLeft: 12,
            paddingRight: 12,
          }}
        >
          <div className="flex items-center gap-2" style={{ minWidth: 0, flex: 1 }}>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="md:hidden mf-btn mf-btn-ghost"
              style={{ height: 36, width: 36, padding: 0, flexShrink: 0 }}
              aria-label="Open menu"
            >
              <Menu size={16} />
            </button>
            <div style={{ minWidth: 0 }}>
              {breadcrumbs ? (
                <div
                  className="mf-font-mono mf-fg-mute hidden sm:block"
                  style={{
                    fontSize: 10,
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {breadcrumbs}
                </div>
              ) : null}
              {title ? (
                <div
                  className="mf-font-display"
                  style={{
                    fontSize: 18,
                    letterSpacing: '-0.01em',
                    lineHeight: 1,
                    marginTop: 2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {title}
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
            <form
              onSubmit={onSearchSubmit}
              className="hidden lg:block"
              style={{ position: 'relative' }}
            >
              <Search
                size={14}
                className="mf-fg-mute"
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                className="mf-input"
                style={{ height: 36, paddingLeft: 36, paddingRight: 12, width: 240 }}
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                aria-label="Search"
              />
            </form>
            {headerRight}
            <NotificationBell />
          </div>
        </div>
        <PushNotificationPrompt />
        <NativePushRegistrar />
        <div className="flex-1 mf-scroll" style={{ overflowY: 'auto' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
