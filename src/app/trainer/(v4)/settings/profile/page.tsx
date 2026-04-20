import Link from 'next/link';
import { requireTrainerSession } from '@/lib/trainer-data';
import { DesktopShell } from '@/components/ui/mf';
import ProfileEditorClient from './profile-editor-client';

export const dynamic = 'force-dynamic';

export default async function TrainerProfileEditorPage() {
  await requireTrainerSession();

  return (
    <DesktopShell
      role="trainer"
      active="settings"
      title="Public Profile"
      breadcrumbs="TRAINER / SETTINGS / PROFILE"
    >
      <div style={{ padding: 24, maxWidth: 720 }}>
        <SubNav current="profile" />
        <div style={{ marginTop: 16 }}>
          <ProfileEditorClient />
        </div>
      </div>
    </DesktopShell>
  );
}

function SubNav({ current }: { current: 'profile' | 'testimonials' | 'transformations' }) {
  const items = [
    { k: 'profile', l: 'Profile', href: '/trainer/settings/profile' },
    { k: 'testimonials', l: 'Testimonials', href: '/trainer/settings/testimonials' },
    { k: 'transformations', l: 'Transformations', href: '/trainer/settings/transformations' },
  ] as const;
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
      {items.map((it) => (
        <Link
          key={it.k}
          href={it.href}
          className="mf-btn"
          style={{
            height: 36,
            padding: '0 14px',
            background: it.k === current ? 'var(--mf-accent)' : 'transparent',
            color: it.k === current ? '#0A0A0B' : 'var(--mf-fg)',
            fontSize: 12,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          {it.l}
        </Link>
      ))}
      <Link
        href="/trainer/settings"
        className="mf-btn"
        style={{
          height: 36,
          padding: '0 14px',
          marginLeft: 'auto',
          fontSize: 12,
          textDecoration: 'none',
          display: 'inline-flex',
          alignItems: 'center',
        }}
      >
        ← Back to Settings
      </Link>
    </div>
  );
}
