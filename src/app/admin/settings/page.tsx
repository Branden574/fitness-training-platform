import { requireAdminSession } from '@/lib/admin-data';
import { DesktopShell } from '@/components/ui/mf';
import ChangePasswordClient from './change-password-client';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  await requireAdminSession();

  return (
    <DesktopShell
      role="admin"
      active="settings"
      title="Settings"
      breadcrumbs="ADMIN / SETTINGS"
    >
      <div style={{ display: 'grid', gap: 24, maxWidth: 560 }}>
        <section>
          <div className="mf-eyebrow" style={{ marginBottom: 12 }}>
            ACCOUNT · PASSWORD
          </div>
          <ChangePasswordClient />
        </section>
      </div>
    </DesktopShell>
  );
}
