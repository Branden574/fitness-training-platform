import Link from 'next/link';
import { ChevronRight, User, Lock, Image as ImageIcon, MessageSquare, Sparkles } from 'lucide-react';
import { requireTrainerSession } from '@/lib/trainer-data';
import { DesktopShell } from '@/components/ui/mf';
import SharingPanelClient from './sharing-panel-client';
import NotificationPreferences from '@/components/notifications/NotificationPreferences';

export const dynamic = 'force-dynamic';

export default async function TrainerSettingsPage() {
  const session = await requireTrainerSession();

  const rows: Array<{ label: string; href?: string; Icon: typeof User }> = [
    { label: `Signed in as ${session.user.email}`, Icon: User },
    { label: 'Change password', href: '/auth/change-password', Icon: Lock },
    { label: 'Edit public profile', href: '/trainer/settings/profile', Icon: ImageIcon },
    { label: 'Manage testimonials', href: '/trainer/settings/testimonials', Icon: MessageSquare },
    { label: 'Manage transformations', href: '/trainer/settings/transformations', Icon: Sparkles },
  ];

  return (
    <DesktopShell
      role="trainer"
      active="settings"
      title="Settings"
      breadcrumbs="TRAINER / SETTINGS"
    >
      <div style={{ padding: 24, maxWidth: 720 }}>
        <div className="mf-eyebrow" style={{ marginBottom: 8 }}>ACCOUNT</div>
        <div className="mf-card" style={{ overflow: 'hidden' }}>
          {rows.map((row, i) => {
            const Icon = row.Icon;
            const content = (
              <>
                <Icon size={16} className="mf-fg-mute" />
                <span style={{ flex: 1, fontSize: 14 }}>{row.label}</span>
                {row.href ? <ChevronRight size={14} className="mf-fg-mute" /> : null}
              </>
            );
            const style = {
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '14px 16px',
              borderBottom: i < rows.length - 1 ? '1px solid var(--mf-hairline)' : 'none',
            };
            if (row.href) {
              return (
                <Link key={row.label} href={row.href} style={style}>
                  {content}
                </Link>
              );
            }
            return (
              <div key={row.label} style={style}>
                {content}
              </div>
            );
          })}
        </div>

        <SharingPanelClient />

        <div style={{ marginTop: 32 }}>
          <NotificationPreferences />
        </div>

        <div
          className="mf-card"
          style={{ padding: 24, marginTop: 24, borderStyle: 'dashed' }}
        >
          <div className="mf-eyebrow" style={{ marginBottom: 8 }}>COMING</div>
          <div className="mf-fg-dim" style={{ fontSize: 13, lineHeight: 1.5 }}>
            Coach-side preferences (default session times, availability, auto-reply templates)
            land in a future phase. For now, essentials live above.
          </div>
        </div>
      </div>
    </DesktopShell>
  );
}
