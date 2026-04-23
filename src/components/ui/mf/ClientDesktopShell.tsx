'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  Home,
  Layers,
  Play,
  Apple,
  TrendingUp,
  MessageSquare,
  Settings,
  Bell,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useAssignedTrainer } from '@/lib/hooks/useAssignedTrainer';
import { safeImageUrl } from '@/lib/safeUrl';
import NativePushRegistrar from '@/components/notifications/NativePushRegistrar';

export type ClientDesktopKey =
  | 'today'
  | 'program'
  | 'workout'
  | 'food'
  | 'progress'
  | 'messages'
  | 'settings';

export interface ClientDesktopShellProps {
  active?: ClientDesktopKey;
  title?: string;
  breadcrumbs?: string;
  headerRight?: ReactNode;
  children?: ReactNode;
  athleteInitials?: string;
  athleteName?: string;
  athleteMeta?: string;
  /**
   * The client's own profile photo (User.image). When present the sidebar
   * swaps the initials chip for their headshot — matching what the trainer
   * chip does above it.
   */
  athletePhotoUrl?: string | null;
  unreadMessages?: number;
}

interface NavItem {
  k: ClientDesktopKey;
  l: string;
  i: LucideIcon;
  href: string;
  accent?: boolean;
}

const NAV: NavItem[] = [
  { k: 'today', l: 'Today', i: Home, href: '/client' },
  { k: 'program', l: 'Program', i: Layers, href: '/client/program' },
  { k: 'workout', l: 'Workout', i: Play, href: '/client/workout', accent: true },
  { k: 'food', l: 'Food Log', i: Apple, href: '/client/food', accent: true },
  { k: 'progress', l: 'Progress', i: TrendingUp, href: '/client/progress' },
  { k: 'messages', l: 'Coach', i: MessageSquare, href: '/client/messages' },
  { k: 'settings', l: 'Settings', i: Settings, href: '/client/settings' },
];

function deriveActive(pathname: string | null): ClientDesktopKey {
  if (!pathname) return 'today';
  if (pathname.startsWith('/client/workout')) return 'workout';
  if (pathname.startsWith('/client/program')) return 'program';
  if (pathname.startsWith('/client/food')) return 'food';
  if (pathname.startsWith('/client/progress')) return 'progress';
  if (pathname.startsWith('/client/messages')) return 'messages';
  if (
    pathname.startsWith('/client/settings') ||
    pathname.startsWith('/client/profile')
  )
    return 'settings';
  return 'today';
}

export default function ClientDesktopShell({
  active,
  title,
  breadcrumbs,
  headerRight,
  children,
  athleteInitials = 'JR',
  athleteName = 'Athlete',
  athleteMeta,
  athletePhotoUrl,
  unreadMessages,
}: ClientDesktopShellProps) {
  const safeAthletePhoto = safeImageUrl(athletePhotoUrl);
  const pathname = usePathname();
  const resolved = active ?? deriveActive(pathname);
  const { trainer } = useAssignedTrainer();
  const brandDisplayName = trainer?.name
    ? trainer.name.toUpperCase()
    : 'MARTINEZ/FIT';
  const brandSubLabel = trainer ? 'YOUR COACH' : 'ATHLETE · WEB';

  return (
    <div data-mf className="flex mf-bg mf-fg" style={{ minHeight: '100vh' }}>
      <aside
        className="mf-s1 flex flex-col shrink-0"
        style={{
          width: 220,
          borderRight: '1px solid var(--mf-hairline)',
          // Pin the sidebar to the viewport so Sign out at the bottom
          // stays visible even when the main content is much taller than
          // the screen (client settings, programs, schedule, etc).
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto',
        }}
      >
        <CoachBrandChip
          brandDisplayName={brandDisplayName}
          brandSubLabel={brandSubLabel}
          trainerSlug={trainer?.slug ?? null}
          trainerIsPublic={trainer?.isPublic ?? false}
          trainerPhotoUrl={trainer?.photoUrl ?? null}
        />

        <div
          className="px-3 flex items-center gap-2"
          style={{ padding: '16px 12px', borderBottom: '1px solid var(--mf-hairline)' }}
        >
          {safeAthletePhoto ? (
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 6,
                backgroundImage: `url(${JSON.stringify(safeAthletePhoto)})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                border: '1px solid var(--mf-hairline)',
              }}
              aria-label={athleteName}
            />
          ) : (
            <div
              className="grid place-items-center mf-font-mono"
              style={{
                width: 30,
                height: 30,
                borderRadius: 6,
                background: 'var(--mf-surface-3)',
                border: '1px solid var(--mf-hairline)',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {athleteInitials}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {athleteName}
            </div>
            {athleteMeta && (
              <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 9, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {athleteMeta}
              </div>
            )}
          </div>
        </div>

        <nav className="px-2 py-3 flex-1" style={{ display: 'flex', flexDirection: 'column', gap: 2, minHeight: 0 }}>
          {NAV.map((n) => {
            const Icon = n.i;
            const isActive = resolved === n.k;
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
                  <span style={{ position: 'absolute', left: 0, top: 6, bottom: 6, width: 2, background: 'var(--mf-accent)' }} />
                )}
                <Icon size={15} />
                <span className="flex-1">{n.l}</span>
                {n.accent && !isActive && (
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--mf-accent)' }} />
                )}
                {n.k === 'messages' && unreadMessages && unreadMessages > 0 && (
                  <span
                    className="mf-font-mono"
                    style={{
                      fontSize: 9,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: 'var(--mf-accent)',
                      color: 'var(--mf-accent-ink)',
                    }}
                  >
                    {unreadMessages}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div
          style={{ padding: 12, borderTop: '1px solid var(--mf-hairline)' }}
        >
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
      </aside>

      <main className="flex-1 flex flex-col" style={{ overflow: 'hidden' }}>
        <div
          className="mf-s1 flex items-center justify-between px-6 shrink-0"
          style={{ height: 56, borderBottom: '1px solid var(--mf-hairline)' }}
        >
          <div>
            {breadcrumbs && (
              <div
                className="mf-font-mono mf-fg-mute"
                style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase' }}
              >
                {breadcrumbs}
              </div>
            )}
            {title && (
              <div
                className="mf-font-display"
                style={{ fontSize: 18, letterSpacing: '-0.01em', lineHeight: 1, marginTop: 2 }}
              >
                {title}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {headerRight}
            <button
              className="mf-btn mf-btn-ghost"
              style={{ height: 36, width: 36, padding: 0 }}
              aria-label="Notifications"
            >
              <Bell size={14} />
            </button>
          </div>
        </div>
        <div className="flex-1 mf-scroll" style={{ overflowY: 'auto' }}>
          {children}
        </div>
        <NativePushRegistrar />
      </main>
    </div>
  );
}

// Top-of-sidebar brand row showing the client's coach. When the trainer
// has a public slug AND has opted into the directory, renders as a Link
// to /t/[slug] so clicking jumps into the coach's public profile. Falls
// back to a plain div when there's no slug or the trainer is private —
// sending clients into a guaranteed 404 is worse than a non-interactive
// chip. Re-published trainers get the link back on next mount.
function CoachBrandChip({
  brandDisplayName,
  brandSubLabel,
  trainerSlug,
  trainerIsPublic,
  trainerPhotoUrl,
}: {
  brandDisplayName: string;
  brandSubLabel: string;
  trainerSlug: string | null;
  trainerIsPublic: boolean;
  trainerPhotoUrl: string | null;
}) {
  const safePhoto = safeImageUrl(trainerPhotoUrl);
  const body = (
    <>
      {safePhoto ? (
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            backgroundImage: `url(${JSON.stringify(safePhoto)})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            border: '1px solid var(--mf-hairline)',
          }}
          aria-label={brandDisplayName}
        />
      ) : (
        <div
          className="grid place-items-center"
          style={{ width: 24, height: 24, background: 'var(--mf-accent)', borderRadius: 4 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A0A0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m7 13-2 2 3 3 2-2" />
            <path d="m17 11 2-2-3-3-2 2" />
          </svg>
        </div>
      )}
      <div>
        <div className="mf-font-display" style={{ fontSize: 14, letterSpacing: '-0.01em', lineHeight: 1 }}>
          {brandDisplayName}
        </div>
        <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 9, marginTop: 2 }}>
          {brandSubLabel}
        </div>
      </div>
    </>
  );

  const sharedStyle = {
    height: 56,
    borderBottom: '1px solid var(--mf-hairline)',
    textDecoration: 'none',
    color: 'inherit',
  } as const;

  if (trainerSlug && trainerIsPublic) {
    return (
      <Link
        href={`/t/${trainerSlug}`}
        className="px-4 flex items-center gap-2"
        style={sharedStyle}
        title="View coach profile"
      >
        {body}
      </Link>
    );
  }

  return (
    <div className="px-4 flex items-center gap-2" style={sharedStyle}>
      {body}
    </div>
  );
}
