import SignupFormClient from './signup-form-client';

export const metadata = {
  title: 'Become a trainer · RepLab',
  description:
    'List your practice on RepLab. 14-day trial, no card required.',
};

export default function TrainerSignupPage() {
  return (
    <main
      data-mf
      className="mf-bg mf-fg"
      style={{ minHeight: '100vh', padding: '48px 20px 80px' }}
    >
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
          TRAINER · NEW ACCOUNT
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
          List your practice. Get clients.
        </h1>
        <p
          className="mf-fg-dim"
          style={{ fontSize: 15, marginTop: 12, lineHeight: 1.5 }}
        >
          14-day trial. No card required. Set your rates, publish your profile,
          accept client applications, and get paid through the platform.
        </p>

        <div
          className="mf-card"
          style={{ padding: 16, marginTop: 24, marginBottom: 16 }}
        >
          <div
            className="mf-font-mono mf-fg-dim"
            style={{ fontSize: 10, letterSpacing: '0.15em', marginBottom: 8 }}
          >
            WHAT&apos;S INCLUDED
          </div>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'grid',
              gap: 6,
              fontSize: 13,
            }}
          >
            <li>+ Public profile with bio, testimonials, before/after gallery</li>
            <li>+ Unique /apply link + QR code for marketing</li>
            <li>+ Client management, program builder, messaging</li>
            <li>+ Stripe Connect for direct client payments</li>
          </ul>
        </div>

        <SignupFormClient />
      </div>
    </main>
  );
}
