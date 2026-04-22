import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import ProfileSection from './profile-section';
import type { ProfileService } from './types';

export default function ServicesSection({
  services,
  slug,
}: {
  services: ProfileService[];
  slug: string;
}) {
  if (services.length === 0) return null;
  return (
    <ProfileSection num="05 / SERVICES" title="How we work together.">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
        }}
      >
        {services.map((s, i) => (
          <article
            key={`${s.title}-${i}`}
            className="mf-card"
            style={{
              padding: 24,
              position: 'relative',
              borderColor: s.featured ? 'var(--mf-accent)' : 'var(--mf-hairline)',
              background: s.featured
                ? 'linear-gradient(180deg, rgba(255,77,28,0.06), transparent 50%)'
                : 'var(--mf-surface-1)',
            }}
          >
            {s.featured ? (
              <div
                className="mf-font-mono"
                style={{
                  position: 'absolute',
                  top: -11,
                  left: 24,
                  background: 'var(--mf-accent)',
                  color: 'var(--mf-accent-ink)',
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  padding: '4px 10px',
                  borderRadius: 4,
                }}
              >
                MOST POPULAR
              </div>
            ) : null}
            <div
              className="mf-font-display"
              style={{
                fontSize: 20,
                textTransform: 'uppercase',
                letterSpacing: '-0.005em',
                lineHeight: 1.1,
              }}
            >
              {s.title}
            </div>
            <div
              className="mf-fg-dim"
              style={{
                fontSize: 13,
                lineHeight: 1.5,
                marginTop: 12,
                minHeight: 48,
              }}
            >
              {s.description}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 6,
                marginTop: 20,
                paddingTop: 20,
                borderTop: '1px solid var(--mf-hairline)',
              }}
            >
              <span
                className="mf-font-display tnum"
                style={{ fontSize: 40, lineHeight: 0.95, fontWeight: 600 }}
              >
                {s.price}
              </span>
              {s.per ? (
                <span
                  className="mf-font-mono mf-fg-mute"
                  style={{ fontSize: 11, letterSpacing: '0.05em' }}
                >
                  {s.per}
                </span>
              ) : null}
            </div>
            <Link
              href={`/apply/${slug}`}
              className={`mf-btn ${s.featured ? 'mf-btn-primary' : ''}`}
              style={{
                width: '100%',
                height: 44,
                marginTop: 20,
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {s.cta}
              <ArrowRight size={14} />
            </Link>
          </article>
        ))}
      </div>
    </ProfileSection>
  );
}
