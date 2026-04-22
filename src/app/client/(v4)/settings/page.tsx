import { requireClientSession, getClientContext } from '@/lib/client-data';
import { prisma } from '@/lib/prisma';
import { ClientDesktopShell } from '@/components/ui/mf';
import SettingsClient from './settings-client';
import NotificationPreferences from '@/components/notifications/NotificationPreferences';
import BiometricToggle from '@/components/auth/BiometricToggle';

export const dynamic = 'force-dynamic';

export default async function ClientSettingsPage() {
  const session = await requireClientSession();
  const [ctx, user] = await Promise.all([
    getClientContext(session.user.id),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        email: true,
        timezone: true,
        createdAt: true,
      },
    }),
  ]);

  if (!user) {
    // Session says we're authed but the row vanished — shouldn't happen, but
    // fail closed with a readable error rather than crashing.
    return (
      <main style={{ padding: 24 }}>
        <div className="mf-fg-dim">Account not found. Try signing in again.</div>
      </main>
    );
  }

  return (
    <>
      {/* Mobile — plain stacked layout, no sidebar */}
      <main className="md:hidden" style={{ padding: '16px 16px 32px' }}>
        <div className="mf-eyebrow" style={{ marginBottom: 4 }}>
          SETTINGS
        </div>
        <h1
          className="mf-font-display"
          style={{
            fontSize: 28,
            lineHeight: 1.05,
            letterSpacing: '-0.01em',
            margin: 0,
            marginBottom: 20,
          }}
        >
          {(user.name ?? 'Athlete').toUpperCase()}
        </h1>
        <SettingsClient
          initialTimezone={user.timezone}
          email={user.email}
          trainerName={ctx.trainer?.name ?? null}
        />
        <BiometricToggle />
        <div style={{ marginTop: 24 }}>
          <NotificationPreferences />
        </div>
      </main>

      {/* Desktop — full ClientDesktopShell wrap */}
      <div className="hidden md:block">
        <ClientDesktopShell
          active="settings"
          title="Settings"
          breadcrumbs="ACCOUNT / SETTINGS"
          athleteInitials={ctx.initials}
          athleteName={ctx.name ?? ctx.email}
          athleteMeta={
            ctx.trainer?.name ? `COACH · ${ctx.trainer.name.toUpperCase()}` : undefined
          }
        >
          <div style={{ padding: 24, maxWidth: 720 }}>
            <SettingsClient
              initialTimezone={user.timezone}
              email={user.email}
              trainerName={ctx.trainer?.name ?? null}
            />
            <BiometricToggle />
            <div style={{ marginTop: 32 }}>
              <NotificationPreferences />
            </div>
          </div>
        </ClientDesktopShell>
      </div>
    </>
  );
}
