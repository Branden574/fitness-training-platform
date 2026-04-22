import { Star } from 'lucide-react';
import RoundAvatar from '@/components/ui/mf/RoundAvatar';
import ProfileSection from './profile-section';
import type { ProfileTestimonial } from './types';

export default function TestimonialsSection({
  testimonials,
}: {
  testimonials: ProfileTestimonial[];
}) {
  if (testimonials.length === 0) return null;
  return (
    <ProfileSection num="06 / VOICES" title="What clients say.">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 16,
        }}
      >
        {testimonials.map((t) => {
          const [byName, byRole] = splitAttribution(t.attribution);
          return (
            <blockquote
              key={t.id}
              className="mf-card"
              style={{ padding: 28, margin: 0 }}
            >
              <Star size={16} style={{ color: 'var(--mf-accent)' }} />
              <div
                className="mf-font-display"
                style={{
                  fontSize: 20,
                  lineHeight: 1.25,
                  textTransform: 'uppercase',
                  letterSpacing: '-0.005em',
                  marginTop: 16,
                }}
              >
                &ldquo;{t.quote}&rdquo;
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginTop: 24,
                  paddingTop: 20,
                  borderTop: '1px solid var(--mf-hairline)',
                }}
              >
                <RoundAvatar initials={t.initials} size={36} />
                <div>
                  <div className="mf-fg" style={{ fontSize: 13, fontWeight: 600 }}>
                    {byName}
                  </div>
                  {byRole ? (
                    <div
                      className="mf-font-mono mf-fg-mute"
                      style={{
                        fontSize: 10,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {byRole}
                    </div>
                  ) : null}
                </div>
              </div>
            </blockquote>
          );
        })}
      </div>
    </ProfileSection>
  );
}

function splitAttribution(a: string): [string, string | null] {
  const parts = a.split('·').map((p) => p.trim());
  if (parts.length <= 1) return [a.trim(), null];
  return [parts[0]!, parts.slice(1).join(' · ')];
}
