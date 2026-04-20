import Link from 'next/link';

export interface TrainerCardData {
  id: string;
  name: string | null;
  image: string | null;
  trainerSlug: string | null;
  trainerAcceptingClients: boolean;
  trainer: {
    bio: string | null;
    photoUrl: string | null;
    location: string | null;
    experience: number;
    specialties: string[];
    priceTier: string | null;
  } | null;
}

const TIER_DISPLAY: Record<string, string> = {
  'tier-1': '$',
  'tier-2': '$$',
  'tier-3': '$$$',
  contact: 'Contact',
};

function titleCase(s: string): string {
  return s
    .split(' ')
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : ''))
    .join(' ');
}

export default function TrainerCard({ trainer }: { trainer: TrainerCardData }) {
  if (!trainer.trainerSlug) return null;
  const photo = trainer.trainer?.photoUrl ?? trainer.image;
  const meta = [
    trainer.trainer?.location,
    trainer.trainer?.experience && trainer.trainer.experience > 0
      ? `${trainer.trainer.experience} YRS`
      : null,
    trainer.trainer?.priceTier ? TIER_DISPLAY[trainer.trainer.priceTier] : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Link
      href={`/t/${trainer.trainerSlug}`}
      className="mf-card"
      style={{
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
        overflow: 'hidden',
        transition: 'transform 120ms ease, border-color 120ms ease',
      }}
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo}
          alt={trainer.name ?? 'Trainer'}
          style={{
            width: '100%',
            aspectRatio: '4 / 5',
            objectFit: 'cover',
            display: 'block',
            borderBottom: '1px solid var(--mf-hairline)',
          }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            aspectRatio: '4 / 5',
            background: 'var(--mf-surface-2)',
            display: 'grid',
            placeItems: 'center',
            fontFamily: 'var(--font-mf-mono), monospace',
            fontSize: 28,
            color: 'var(--mf-fg-dim)',
            borderBottom: '1px solid var(--mf-hairline)',
          }}
        >
          {trainer.name
            ? trainer.name
                .split(/\s+/)
                .map((p) => p[0])
                .slice(0, 2)
                .join('')
            : '?'}
        </div>
      )}
      <div style={{ padding: 16 }}>
        {meta && (
          <div className="mf-eyebrow" style={{ marginBottom: 6 }}>
            {meta.toUpperCase()}
          </div>
        )}
        <div
          className="mf-font-display"
          style={{
            fontSize: 22,
            lineHeight: 1.1,
            letterSpacing: '-0.01em',
            marginBottom: 8,
          }}
        >
          {trainer.name}
        </div>
        {trainer.trainer?.bio && (
          <p
            className="mf-fg-dim"
            style={{
              fontSize: 13,
              lineHeight: 1.5,
              margin: 0,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical' as const,
              overflow: 'hidden',
            }}
          >
            {trainer.trainer.bio}
          </p>
        )}
        {trainer.trainer?.specialties && trainer.trainer.specialties.length > 0 && (
          <div
            style={{
              marginTop: 10,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 4,
            }}
          >
            {trainer.trainer.specialties.slice(0, 3).map((s) => (
              <span
                key={s}
                style={{
                  padding: '2px 8px',
                  background: 'transparent',
                  border: '1px solid var(--mf-hairline)',
                  color: 'var(--mf-fg-dim)',
                  fontSize: 10,
                  borderRadius: 999,
                  fontFamily: 'var(--font-mf-mono), monospace',
                }}
              >
                {titleCase(s)}
              </span>
            ))}
            {trainer.trainer.specialties.length > 3 && (
              <span
                className="mf-fg-mute"
                style={{ fontSize: 10, alignSelf: 'center' }}
              >
                +{trainer.trainer.specialties.length - 3}
              </span>
            )}
          </div>
        )}
        <div
          style={{
            marginTop: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span
            className="mf-font-mono"
            style={{
              fontSize: 10,
              color: trainer.trainerAcceptingClients
                ? 'var(--mf-accent, #FF4D1C)'
                : 'var(--mf-fg-mute)',
              letterSpacing: '.15em',
            }}
          >
            {trainer.trainerAcceptingClients ? '● ACCEPTING' : '○ WAITLIST'}
          </span>
          <span
            className="mf-font-mono mf-accent"
            style={{ fontSize: 11, letterSpacing: '.1em' }}
          >
            VIEW →
          </span>
        </div>
      </div>
    </Link>
  );
}
