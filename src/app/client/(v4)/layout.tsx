import { requireClientSession } from '@/lib/client-data';
import { BottomTabs } from '@/components/ui/mf';
import NativePushRegistrar from '@/components/notifications/NativePushRegistrar';

export const dynamic = 'force-dynamic';

export default async function ClientV4Layout({ children }: { children: React.ReactNode }) {
  await requireClientSession();

  return (
    <div data-mf className="mf-bg mf-fg" style={{ minHeight: '100vh' }}>
      <NativePushRegistrar />
      <div className="flex justify-center md:hidden" style={{ minHeight: '100vh' }}>
        <div
          className="flex flex-col"
          style={{
            width: '100%',
            maxWidth: 430,
            minHeight: '100vh',
            borderInline: '1px solid var(--mf-hairline)',
          }}
        >
          <div style={{ flex: 1, overflowY: 'auto' }}>{children}</div>
          <BottomTabs />
        </div>
      </div>

      <div className="hidden md:block">{children}</div>
    </div>
  );
}
