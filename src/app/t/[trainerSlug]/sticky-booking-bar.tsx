'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import RoundAvatar from '@/components/ui/mf/RoundAvatar';

export default function StickyBookingBar({
  name,
  initials,
  photoUrl,
  clientStatus,
  entryPrice,
  slug,
}: {
  name: string;
  initials: string;
  photoUrl: string | null;
  clientStatus: 'ACCEPTING' | 'WAITLIST' | 'NOT_ACCEPTING';
  entryPrice: string | null;
  slug: string;
}) {
  const statusLabel =
    clientStatus === 'ACCEPTING'
      ? 'Accepting'
      : clientStatus === 'WAITLIST'
      ? 'Waitlist'
      : 'Not accepting';
  const ctaLabel =
    clientStatus === 'ACCEPTING'
      ? 'Book'
      : clientStatus === 'WAITLIST'
      ? 'Join'
      : 'Notify';
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const cta = document.querySelector<HTMLElement>('[data-profile-cta]');
    if (!cta || typeof IntersectionObserver === 'undefined') {
      // Always show if we can't detect scroll position
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (!e) return;
        setVisible(!e.isIntersecting);
      },
      { rootMargin: '-100px 0px 0px 0px', threshold: 0 },
    );
    observer.observe(cta);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      aria-hidden={!visible}
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        padding: 12,
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        background: 'rgba(20,20,22,0.94)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--mf-hairline-strong)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        zIndex: 40,
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 220ms ease',
        pointerEvents: visible ? 'auto' : 'none',
      }}
      className="md:hidden"
    >
      <RoundAvatar initials={initials} image={photoUrl} size={40} alt={name} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="mf-font-display"
          style={{
            fontSize: 14,
            textTransform: 'uppercase',
            letterSpacing: '-0.005em',
            lineHeight: 1.1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </div>
        <div
          className="mf-font-mono mf-fg-mute"
          style={{
            fontSize: 9,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginTop: 2,
          }}
        >
          {statusLabel}
          {entryPrice ? ` · ${entryPrice}` : ''}
        </div>
      </div>
      <Link
        href={`/apply/${slug}`}
        className="mf-btn mf-btn-primary"
        style={{ height: 40, padding: '0 16px', gap: 6 }}
      >
        {ctaLabel}
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}
