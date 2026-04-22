import type { ReactNode } from 'react';

export default function ProfileSection({
  num,
  title,
  right,
  border = true,
  children,
}: {
  num: string;
  title: string;
  right?: ReactNode;
  border?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      style={{
        padding: '56px 0',
        borderTop: border ? '1px solid var(--mf-hairline)' : 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: 32,
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div className="mf-eyebrow" style={{ marginBottom: 10 }}>
            {num}
          </div>
          <h2
            className="mf-font-display"
            style={{
              fontSize: 'clamp(30px, 4vw, 42px)',
              lineHeight: 0.95,
              textTransform: 'uppercase',
              letterSpacing: '-0.01em',
              fontWeight: 600,
              margin: 0,
            }}
          >
            {title}
          </h2>
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}
