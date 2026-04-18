'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, Apple, BarChart3, MessageSquare, User, type LucideIcon } from 'lucide-react';

export type ClientTabKey = 'today' | 'program' | 'food' | 'progress' | 'messages' | 'profile';

export interface BottomTabsProps {
  active?: ClientTabKey;
  className?: string;
  hrefMap?: Partial<Record<ClientTabKey, string>>;
}

interface Tab {
  k: ClientTabKey;
  i: LucideIcon;
  l: string;
  href: string;
}

const DEFAULT_TABS: Tab[] = [
  { k: 'today',    i: Home,          l: 'Today',    href: '/client' },
  { k: 'program',  i: Calendar,      l: 'Program',  href: '/client/program' },
  { k: 'food',     i: Apple,         l: 'Food',     href: '/client/food' },
  { k: 'progress', i: BarChart3,     l: 'Progress', href: '/client/progress' },
  { k: 'messages', i: MessageSquare, l: 'Chat',     href: '/client/messages' },
  { k: 'profile',  i: User,          l: 'Me',       href: '/client/profile' },
];

function deriveActive(pathname: string | null): ClientTabKey {
  if (!pathname) return 'today';
  if (pathname.startsWith('/client/program')) return 'program';
  if (pathname.startsWith('/client/food')) return 'food';
  if (pathname.startsWith('/client/progress')) return 'progress';
  if (pathname.startsWith('/client/messages')) return 'messages';
  if (pathname.startsWith('/client/profile')) return 'profile';
  if (pathname.startsWith('/client/workout')) return 'today';
  return 'today';
}

export default function BottomTabs({ active, className, hrefMap }: BottomTabsProps) {
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
      aria-label="Primary navigation"
    >
      {DEFAULT_TABS.map((t) => {
        const Icon = t.i;
        const isActive = resolved === t.k;
        const href = hrefMap?.[t.k] ?? t.href;
        return (
          <Link
            key={t.k}
            href={href}
            className="flex flex-col items-center gap-0.5 px-2 py-1.5"
            style={{ color: isActive ? 'var(--mf-accent)' : 'var(--mf-fg-mute)' }}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon size={18} />
            <span
              className="mf-font-mono"
              style={{
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              {t.l}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
