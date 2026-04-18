import { requireClientSession } from '@/lib/client-data';
import { BottomTabs } from '@/components/ui/mf';

export const dynamic = 'force-dynamic';

export default async function ClientV4Layout({ children }: { children: React.ReactNode }) {
  await requireClientSession();

  return (
    <div
      data-mf
      className="mf-bg mf-fg"
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 430,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          borderInline: '1px solid var(--mf-hairline)',
          background: 'var(--mf-bg)',
        }}
      >
        <div style={{ flex: 1, overflowY: 'auto' }}>{children}</div>
        <BottomTabs />
      </div>
    </div>
  );
}
