import { requireAdminSession } from '@/lib/admin-data';
import { DesktopShell } from '@/components/ui/mf';
import ModerationClient from './moderation-client';

export const dynamic = 'force-dynamic';

export default async function AdminTransformationsPage() {
  await requireAdminSession();
  return (
    <DesktopShell
      role="admin"
      active="transformations"
      title="Transformation Moderation"
      breadcrumbs="ADMIN / TRANSFORMATIONS"
    >
      <div style={{ padding: 24, maxWidth: 960 }}>
        <div className="mf-fg-dim" style={{ fontSize: 12, marginBottom: 16 }}>
          Review trainer-uploaded before/after transformation photos. Approved
          items appear on the trainer&apos;s public profile. Rejected items are
          hidden with the reason shown to the trainer.
        </div>
        <ModerationClient />
      </div>
    </DesktopShell>
  );
}
