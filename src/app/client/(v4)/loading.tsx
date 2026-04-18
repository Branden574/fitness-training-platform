import LoadingPulse from '@/components/ui/mf/LoadingPulse';

export default function ClientV4Loading() {
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
        }}
      >
        <div style={{ flex: 1 }}>
          <LoadingPulse label="LOADING TODAY" />
        </div>
      </div>
    </div>
  );
}
