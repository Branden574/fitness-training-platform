import ApplyGenericClient from './apply-generic-client';

export const metadata = {
  title: 'Apply · RepLab',
};

export default function ApplyPage() {
  return (
    <>
      <main
        data-mf
        className="mf-bg mf-fg"
        style={{ minHeight: '100vh', padding: '48px 20px 80px' }}
      >
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
            APPLY · REPLAB
          </div>
          <h1
            className="mf-font-display"
            style={{
              fontSize: 40,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              margin: 0,
            }}
          >
            Train with a coach who knows your numbers.
          </h1>
          <p
            className="mf-fg-dim"
            style={{
              fontSize: 15,
              marginTop: 12,
              maxWidth: 560,
              lineHeight: 1.5,
            }}
          >
            1:1 programming, weekly check-ins, invite-only. 48-hour review.
          </p>

          <div style={{ marginTop: 32 }}>
            <ApplyGenericClient />
          </div>
        </div>
      </main>
    </>
  );
}
