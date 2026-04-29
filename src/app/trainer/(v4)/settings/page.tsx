// src/app/trainer/(v4)/settings/page.tsx
import { requireTrainerSession } from '@/lib/trainer-data';
import { prisma } from '@/lib/prisma';
import { DesktopShell } from '@/components/ui/mf';
import { IdentityStrip } from './identity-strip';
import SharingCardClient from './sharing-card-client';
import NotificationPreferences from '@/components/notifications/NotificationPreferences';
import { AccountList } from './account-list';
import { ReferralPerformance } from './referral-performance';
import { ComingSoonCard } from './coming-soon-card';

export const dynamic = 'force-dynamic';

export default async function TrainerSettingsPage() {
  const session = await requireTrainerSession();

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      trainerReferralCode: true,
      trainerClientStatus: true,
      trainerIsPublic: true,
    },
  });

  return (
    <DesktopShell
      role="trainer"
      active="settings"
      title="Settings"
      breadcrumbs="TRAINER / SETTINGS"
    >
      <div style={{ padding: 24, maxWidth: 1320, margin: '0 auto' }}>
        <IdentityStrip
          name={me?.name ?? ''}
          email={me?.email ?? session.user.email ?? ''}
          code={me?.trainerReferralCode ?? null}
          status={me?.trainerClientStatus ?? 'ACCEPTING'}
          isPublic={Boolean(me?.trainerIsPublic)}
        />

        <div
          className="mf-settings-grid"
          style={{ display: 'grid', gap: 20, gridTemplateColumns: '1fr' }}
        >
          {/* LEFT 8/12: Sharing + Notifications.
              NotificationPreferences renders its own NOTIFICATION PREFERENCES
              eyebrow internally — don't wrap it in another one. */}
          <div style={{ display: 'grid', gap: 20 }}>
            <SharingCardClient />
            <NotificationPreferences />
          </div>

          {/* RIGHT 4/12: Account + Referral KPIs + Coming soon */}
          <div style={{ display: 'grid', gap: 20 }}>
            <AccountList />
            <ReferralPerformance trainerId={session.user.id} />
            <ComingSoonCard />
          </div>
        </div>

        {/* Inline media-query: 8/4 grid at ≥1024px */}
        <style>{`
          @media (min-width: 1024px) {
            .mf-settings-grid {
              grid-template-columns: 8fr 4fr !important;
              align-items: start;
            }
          }
        `}</style>
      </div>
    </DesktopShell>
  );
}
