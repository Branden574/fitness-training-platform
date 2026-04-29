import Link from 'next/link';
import { ArrowRight, Bell, BellOff, Clock } from 'lucide-react';

export default function StatusBanner({
  slug,
  status,
}: {
  slug: string;
  status: 'WAITLIST' | 'NOT_ACCEPTING';
}) {
  const isWaitlist = status === 'WAITLIST';

  const Icon = isWaitlist ? Clock : BellOff;
  const iconColor = isWaitlist ? 'var(--mf-amber)' : 'var(--mf-fg-mute)';
  const background = isWaitlist
    ? 'rgba(245,181,68,0.06)'
    : 'rgba(110,110,118,0.06)';
  const border = isWaitlist
    ? '1px solid rgba(245,181,68,0.25)'
    : '1px solid var(--mf-fg-mute)';
  const eyebrow = isWaitlist
    ? 'Currently at capacity'
    : 'Not taking new clients right now';
  const sub = isWaitlist
    ? "Reach out to join the waitlist — we'll reach back when spots open."
    : "Drop your email on the apply page and we'll let you know when they reopen.";
  const buttonLabel = isWaitlist ? 'Join waitlist' : 'Get notified';

  return (
    <div
      style={{
        padding: '16px 20px',
        background,
        border,
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
        <Icon size={18} style={{ color: iconColor }} />
        <div>
          <div
            className="mf-font-display"
            style={{ fontSize: 16, textTransform: 'uppercase' }}
          >
            {eyebrow}
          </div>
          <div className="mf-fg-dim" style={{ fontSize: 13, marginTop: 2 }}>
            {sub}
          </div>
        </div>
      </div>
      <Link
        href={`/apply/${slug}`}
        className="mf-btn mf-btn-primary"
        style={{ gap: 8 }}
      >
        <Bell size={14} />
        {buttonLabel}
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}
