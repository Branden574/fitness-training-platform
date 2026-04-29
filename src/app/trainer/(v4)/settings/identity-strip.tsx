// src/app/trainer/(v4)/settings/identity-strip.tsx
import Link from 'next/link';
import { Avatar } from '@/components/ui/mf';
import type { TrainerClientStatus } from '@prisma/client';
import { TRAINER_STATUS_LABELS } from '@/lib/trainerStatus';

export function IdentityStrip({
  name,
  email,
  code,
  status,
  isPublic,
}: {
  name: string;
  email: string;
  code: string | null;
  status: TrainerClientStatus;
  isPublic: boolean;
}) {
  const statusDot =
    status === 'ACCEPTING'
      ? 'var(--mf-green, #2BD985)'
      : status === 'WAITLIST'
      ? 'var(--mf-amber, #F5B544)'
      : 'var(--mf-fg-mute, #6E6E76)';

  const initials =
    (name || email)
      .split(/\s+/)
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '—';

  return (
    <div
      className="mf-card"
      style={{
        padding: 20,
        marginBottom: 20,
        display: 'flex',
        gap: 20,
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      <Avatar initials={initials} size={56} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'var(--font-mf-display), sans-serif',
            fontSize: 22,
            letterSpacing: '-0.01em',
            lineHeight: 1,
          }}
        >
          {name || 'Unnamed trainer'}
        </div>
        <div
          className="mf-fg-mute"
          style={{
            fontFamily: 'var(--font-mf-mono), monospace',
            fontSize: 11,
            marginTop: 6,
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <span>{email}</span>
          {code && (
            <>
              <span>·</span>
              <span>MF-{code}</span>
            </>
          )}
          <span>·</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                display: 'inline-block',
                width: 6,
                height: 6,
                borderRadius: 999,
                background: statusDot,
              }}
            />
            {TRAINER_STATUS_LABELS[status].toUpperCase()}
          </span>
          <span>·</span>
          <span>{isPublic ? 'PUBLIC LISTING' : 'PRIVATE — DIRECT LINK'}</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Link
          href="/trainer/settings/profile"
          className="mf-btn"
          style={{ height: 36, alignItems: 'center', display: 'inline-flex' }}
        >
          Edit profile
        </Link>
        <Link
          href="/auth/change-password"
          className="mf-btn"
          style={{ height: 36, alignItems: 'center', display: 'inline-flex' }}
        >
          Change password
        </Link>
        <Link
          href="/api/auth/signout"
          className="mf-btn"
          style={{ height: 36, alignItems: 'center', display: 'inline-flex' }}
        >
          Sign out
        </Link>
      </div>
    </div>
  );
}
