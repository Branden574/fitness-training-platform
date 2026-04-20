import Link from 'next/link';
import type { TrainerStats } from '@/lib/trainerStats';

interface Testimonial {
  id: string;
  quote: string;
  attribution: string;
}

interface Transformation {
  id: string;
  beforePhotoUrl: string;
  afterPhotoUrl: string;
  caption: string | null;
  durationWeeks: number | null;
}

const TIER_DISPLAY: Record<string, string> = {
  'tier-1': '$',
  'tier-2': '$$',
  'tier-3': '$$$',
  contact: 'Contact for pricing',
};

function titleCase(s: string): string {
  return s
    .split(' ')
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : ''))
    .join(' ');
}

export default function ProfileSections(props: {
  bio: string | null;
  specialties: string[];
  certifications: unknown;
  priceTier: string | null;
  hourlyRate: number | null;
  acceptsInPerson: boolean;
  acceptsOnline: boolean;
  stats: TrainerStats | null;
  testimonials: Testimonial[];
  transformations: Transformation[];
  trainerName: string;
  trainerSlug: string;
}) {
  const certs = Array.isArray(props.certifications)
    ? (props.certifications.filter((c) => typeof c === 'string') as string[])
    : [];
  const showStats =
    props.stats && (props.stats.activeClients > 0 || props.stats.prsThisYear > 0);
  const priceLabel = props.priceTier ? TIER_DISPLAY[props.priceTier] : null;
  const hourly =
    typeof props.hourlyRate === 'number' && props.hourlyRate > 0
      ? `$${props.hourlyRate.toLocaleString('en-US', { maximumFractionDigits: 0 })}/hr`
      : null;

  return (
    <div style={{ display: 'grid', gap: 24, marginTop: 32 }}>
      {props.bio && (
        <Section title="ABOUT">
          <p style={{ fontSize: 15, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
            {props.bio}
          </p>
        </Section>
      )}

      {props.specialties.length > 0 && (
        <Section title="SPECIALTIES">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {props.specialties.map((s) => (
              <span
                key={s}
                style={{
                  padding: '6px 12px',
                  background: 'var(--mf-accent, #FF4D1C)',
                  color: '#0A0A0B',
                  fontSize: 12,
                  borderRadius: 999,
                  fontFamily: 'var(--font-mf-mono), monospace',
                  letterSpacing: '.06em',
                }}
              >
                {titleCase(s)}
              </span>
            ))}
          </div>
        </Section>
      )}

      {certs.length > 0 && (
        <Section title="CERTIFICATIONS">
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.8 }}>
            {certs.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </Section>
      )}

      {(priceLabel || hourly || props.acceptsInPerson || props.acceptsOnline) && (
        <Section title="PRICING & AVAILABILITY">
          <div style={{ display: 'grid', gap: 8, fontSize: 14 }}>
            {priceLabel && (
              <div>
                <span className="mf-fg-dim">Tier</span> · {priceLabel}
              </div>
            )}
            {hourly && (
              <div>
                <span className="mf-fg-dim">Rate</span> · {hourly}
              </div>
            )}
            {(props.acceptsInPerson || props.acceptsOnline) && (
              <div>
                <span className="mf-fg-dim">Modes</span>
                {props.acceptsInPerson ? ' · In-person' : ''}
                {props.acceptsOnline ? ' · Online' : ''}
              </div>
            )}
          </div>
        </Section>
      )}

      {showStats && props.stats && (
        <Section title="VERIFIED RESULTS">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 12,
            }}
          >
            <Stat label="ACTIVE CLIENTS" value={props.stats.activeClients.toString()} />
            <Stat label="PRs THIS YEAR" value={props.stats.prsThisYear.toString()} />
            <Stat
              label="PLATFORM YEARS"
              value={props.stats.yearsOnPlatform.toString()}
            />
          </div>
        </Section>
      )}

      {props.testimonials.length > 0 && (
        <Section title="TESTIMONIALS">
          <div style={{ display: 'grid', gap: 12 }}>
            {props.testimonials.map((t) => (
              <div
                key={t.id}
                className="mf-card"
                style={{ padding: 16, background: 'var(--mf-surface-2)' }}
              >
                <div style={{ fontSize: 14, lineHeight: 1.5 }}>
                  &ldquo;{t.quote}&rdquo;
                </div>
                <div className="mf-fg-dim" style={{ fontSize: 12, marginTop: 8 }}>
                  — {t.attribution}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {props.transformations.length > 0 && (
        <Section title="TRANSFORMATIONS">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 16,
            }}
          >
            {props.transformations.map((tr) => (
              <div key={tr.id} className="mf-card" style={{ padding: 12 }}>
                <div
                  style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={tr.beforePhotoUrl}
                    alt="Before"
                    style={{
                      width: '100%',
                      aspectRatio: '4 / 5',
                      objectFit: 'cover',
                      borderRadius: 4,
                    }}
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={tr.afterPhotoUrl}
                    alt="After"
                    style={{
                      width: '100%',
                      aspectRatio: '4 / 5',
                      objectFit: 'cover',
                      borderRadius: 4,
                    }}
                  />
                </div>
                {tr.caption && (
                  <div style={{ fontSize: 13, marginTop: 8 }}>{tr.caption}</div>
                )}
                {tr.durationWeeks && (
                  <div className="mf-fg-dim" style={{ fontSize: 11, marginTop: 4 }}>
                    {tr.durationWeeks} week{tr.durationWeeks === 1 ? '' : 's'}
                  </div>
                )}
                <div
                  style={{
                    marginTop: 10,
                    paddingTop: 8,
                    borderTop: '1px solid var(--mf-hairline)',
                    fontSize: 10,
                    color: 'var(--mf-fg-mute)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>Posted by {props.trainerName}</span>
                  <Link
                    href={`/legal/takedown?type=transformation&contentId=${tr.id}`}
                    className="mf-fg-mute"
                    style={{ fontSize: 10 }}
                  >
                    Report →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mf-eyebrow" style={{ marginBottom: 12 }}>
        {title}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="mf-card" style={{ padding: 14 }}>
      <div
        className="mf-font-display"
        style={{ fontSize: 28, lineHeight: 1, color: 'var(--mf-accent, #FF4D1C)' }}
      >
        {value}
      </div>
      <div
        className="mf-font-mono mf-fg-dim"
        style={{ fontSize: 10, letterSpacing: '.15em', marginTop: 6 }}
      >
        {label}
      </div>
    </div>
  );
}
