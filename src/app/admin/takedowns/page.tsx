import { requireAdminSession } from '@/lib/admin-data';
import { DesktopShell } from '@/components/ui/mf';
import TakedownsClient from './takedowns-client';

export const dynamic = 'force-dynamic';

export default async function AdminTakedownsPage() {
  await requireAdminSession();
  return (
    <DesktopShell
      role="admin"
      active="takedowns"
      title="Takedown Requests"
      breadcrumbs="ADMIN / TAKEDOWNS"
    >
      <div style={{ padding: 24, maxWidth: 960 }}>
        <div className="mf-fg-dim" style={{ fontSize: 12, marginBottom: 16 }}>
          Public requests to remove content (transformations, testimonials,
          profiles). Resolving with &ldquo;remove&rdquo; soft-deletes the content;
          &ldquo;keep&rdquo; records the decision without altering the content.
        </div>
        <TakedownsClient />
      </div>
    </DesktopShell>
  );
}
