import Link from 'next/link';
import { ArrowRight, Bell, Clock } from 'lucide-react';

export default function WaitlistBanner({ slug }: { slug: string }) {
  return (
    <div
      style={{
        padding: '16px 20px',
        background: 'rgba(245,181,68,0.06)',
        border: '1px solid rgba(245,181,68,0.25)',
        borderRadius: 8,
        marginBottom: 24,
        marginTop: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 20,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Clock size={18} style={{ color: 'var(--mf-amber)' }} />
        <div>
          <div
            className="mf-font-display"
            style={{ fontSize: 16, textTransform: 'uppercase' }}
          >
            Currently at capacity
          </div>
          <div className="mf-fg-dim" style={{ fontSize: 13, marginTop: 2 }}>
            Reach out to join the waitlist — we&apos;ll reach back when spots open.
          </div>
        </div>
      </div>
      <Link
        href={`/apply/${slug}`}
        className="mf-btn mf-btn-primary"
        style={{ gap: 8 }}
      >
        <Bell size={14} />
        Join waitlist
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}
