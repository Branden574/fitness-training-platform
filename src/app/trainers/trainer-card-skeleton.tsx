export default function TrainerCardSkeleton() {
  return (
    <div className="mf-card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: 10, paddingBottom: 0 }}>
        <div
          className="mf-shimmer"
          style={{
            height: 170,
            borderRadius: 8,
            background: 'var(--mf-surface-3)',
          }}
        />
      </div>
      <div style={{ padding: '36px 20px 20px', position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            top: -28,
            left: 20,
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: 'var(--mf-surface-3)',
            border: '2px solid var(--mf-surface-1)',
          }}
        />
        <div
          style={{
            height: 18,
            width: '60%',
            background: 'var(--mf-surface-3)',
            borderRadius: 4,
          }}
        />
        <div
          style={{
            height: 11,
            width: '90%',
            background: 'var(--mf-surface-3)',
            borderRadius: 4,
            marginTop: 12,
            opacity: 0.7,
          }}
        />
        <div
          style={{
            height: 11,
            width: '70%',
            background: 'var(--mf-surface-3)',
            borderRadius: 4,
            marginTop: 6,
            opacity: 0.7,
          }}
        />
        <div style={{ display: 'flex', gap: 6, marginTop: 16 }}>
          {[50, 70, 48].map((w, i) => (
            <div
              key={i}
              style={{
                height: 22,
                width: w,
                borderRadius: 999,
                background: 'var(--mf-surface-3)',
                opacity: 0.8,
              }}
            />
          ))}
        </div>
        <div style={{ height: 1, background: 'var(--mf-hairline)', marginTop: 20 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
          <div
            style={{
              height: 10,
              width: 100,
              background: 'var(--mf-surface-3)',
              borderRadius: 4,
              opacity: 0.6,
            }}
          />
          <div
            style={{
              height: 10,
              width: 60,
              background: 'var(--mf-surface-3)',
              borderRadius: 4,
              opacity: 0.6,
            }}
          />
        </div>
      </div>
    </div>
  );
}
