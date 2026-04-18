'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, Calendar, MessageSquare, Layers, User, type LucideIcon } from 'lucide-react';

export type TrainerMobileTabKey = 'roster' | 'schedule' | 'inbox' | 'program' | 'profile';

export interface TrainerMobileTabsProps {
  active?: TrainerMobileTabKey;
  unreadInbox?: number;
  className?: string;
}

interface Tab {
  k: TrainerMobileTabKey;
  i: LucideIcon;
  l: string;
  href: string;
}

const TABS: Tab[] = [
  { k: 'roster', i: Users, l: 'Roster', href: '/trainer' },
  { k: 'schedule', i: Calendar, l: 'Today', href: '/trainer/schedule' },
  { k: 'inbox', i: MessageSquare, l: 'Inbox', href: '/trainer/messages' },
  { k: 'program', i: Layers, l: 'Programs', href: '/trainer/builder' },
  { k: 'profile', i: User, l: 'Me', href: '/trainer/settings' },
];

function deriveActive(pathname: string | null): TrainerMobileTabKey {
  if (!pathname) return 'roster';
  if (pathname.startsWith('/trainer/messages')) return 'inbox';
  if (pathname.startsWith('/trainer/schedule')) return 'schedule';
  if (pathname.startsWith('/trainer/builder')) return 'program';
  if (pathname.startsWith('/trainer/settings')) return 'profile';
  if (pathname.startsWith('/trainer/clients')) return 'roster';
  return 'roster';
}

export default function TrainerMobileTabs({
  active,
  unreadInbox = 0,
  className,
}: TrainerMobileTabsProps) {
  const pathname = usePathname();
  const resolved = active ?? deriveActive(pathname);

  return (
    <nav
      className={`mf-s1 flex items-center justify-around ${className ?? ''}`}
      style={{
        borderTop: '1px solid var(--mf-hairline)',
        paddingTop: 8,
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        paddingInline: 4,
      }}
      aria-label="Primary trainer navigation"
    >
      {TABS.map((t) => {
        const Icon = t.i;
        const isActive = resolved === t.k;
        const showBadge = t.k === 'inbox' && unreadInbox > 0;
        return (
          <Link
            key={t.k}
            href={t.href}
            className="flex flex-col items-center gap-0.5 px-2 py-1.5"
            style={{
              color: isActive ? 'var(--mf-accent)' : 'var(--mf-fg-mute)',
              position: 'relative',
            }}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon size={18} />
            {showBadge && (
              <span
                className="mf-font-mono"
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 4,
                  fontSize: 8,
                  padding: '0 4px',
                  borderRadius: 4,
                  background: 'var(--mf-accent)',
                  color: 'var(--mf-accent-ink)',
                }}
              >
                {unreadInbox}
              </span>
            )}
            <span
              className="mf-font-mono"
              style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em' }}
            >
              {t.l}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
