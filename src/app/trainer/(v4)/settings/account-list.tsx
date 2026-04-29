// src/app/trainer/(v4)/settings/account-list.tsx
import Link from 'next/link';
import { ChevronRight, Lock, User, MessageSquare, TrendingUp } from 'lucide-react';
import BiometricToggle from '@/components/auth/BiometricToggle';

type StaticRow = {
  href: string;
  label: string;
  sub: string;
  Icon: typeof Lock;
};

const ROWS: StaticRow[] = [
  { href: '/auth/change-password',             label: 'Change password',         sub: 'Last changed in account settings', Icon: Lock },
  { href: '/trainer/settings/profile',         label: 'Edit public profile',     sub: 'Photo, bio, specialties, rates',   Icon: User },
  { href: '/trainer/settings/testimonials',    label: 'Manage testimonials',     sub: 'Published + pending entries',      Icon: MessageSquare },
  { href: '/trainer/settings/transformations', label: 'Manage transformations',  sub: 'Client before / afters',           Icon: TrendingUp },
];

export function AccountList() {
  return (
    <section>
      <div className="mf-eyebrow" style={{ marginBottom: 8 }}>ACCOUNT</div>
      <div className="mf-card" style={{ padding: '4px 16px' }}>
        {ROWS.map((row, i) => {
          const Icon = row.Icon;
          return (
            <Link
              key={row.href}
              href={row.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 0',
                borderBottom:
                  i < ROWS.length - 1
                    ? '1px solid var(--mf-hairline, #1F1F22)'
                    : 'none',
                textDecoration: 'none',
                color: 'var(--mf-fg, #fff)',
              }}
            >
              <Icon size={14} className="mf-fg-mute" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, lineHeight: 1.2 }}>{row.label}</div>
                <div className="mf-fg-mute" style={{ fontSize: 11, marginTop: 2 }}>
                  {row.sub}
                </div>
              </div>
              <ChevronRight size={13} className="mf-fg-mute" style={{ flexShrink: 0 }} />
            </Link>
          );
        })}
      </div>
      {/*
        BiometricToggle renders its own mf-card frame and returns null on
        non-native or non-supporting devices, so it cleanly nests as a sibling
        below the Account card without doubling up on chrome. The Claude-Design
        bundle had biometric inline, but the existing component already owns its
        own row UI; matching it would mean reimplementing biometric logic.
      */}
      <BiometricToggle />
    </section>
  );
}
