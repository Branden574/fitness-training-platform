import Link from 'next/link';
import { ArrowRight, MessageSquare } from 'lucide-react';
import Btn from '@/components/ui/mf/Btn';

export default function ClosingCTA({
  trainerFirstName,
  slug,
  accepting,
}: {
  trainerFirstName: string;
  slug: string;
  accepting: boolean;
}) {
  return (
    <section
      style={{
        padding: '80px 0 100px',
        borderTop: '1px solid var(--mf-hairline)',
        background: 'var(--mf-surface-1)',
        marginTop: 40,
      }}
    >
      <div
        style={{
          maxWidth: 900,
          margin: '0 auto',
          padding: '0 24px',
          textAlign: 'center',
        }}
      >
        <div className="mf-eyebrow" style={{ marginBottom: 16 }}>
          READY?
        </div>
        <h2
          className="mf-font-display"
          style={{
            fontSize: 'clamp(36px, 6vw, 64px)',
            lineHeight: 0.95,
            letterSpacing: '-0.015em',
            textTransform: 'uppercase',
            fontWeight: 600,
            margin: 0,
          }}
        >
          Let&apos;s see if we&apos;re a fit.
        </h2>
        <p
          className="mf-fg-dim"
          style={{
            marginTop: 20,
            fontSize: 15,
            lineHeight: 1.6,
            maxWidth: 520,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          Free 20-minute consultation. No pressure, no pitch. If we&apos;re not the
          right fit {trainerFirstName} will tell you, and refer you to someone who is.
        </p>
        <div
          style={{
            marginTop: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <Link
            href={`/apply/${slug}`}
            className="mf-btn mf-btn-primary"
            style={{ height: 48, padding: '0 24px', gap: 8 }}
          >
            {accepting ? 'Book Consultation' : 'Join Waitlist'}
            <ArrowRight size={14} />
          </Link>
          <Btn icon={MessageSquare} style={{ height: 48, padding: '0 24px' }}>
            Send a message
          </Btn>
        </div>
      </div>
    </section>
  );
}
