import Image from 'next/image';
import { safeImageUrl } from '@/lib/safeUrl';

export type TrainerCoverTone =
  | 'default'
  | 'warm'
  | 'cool'
  | 'olive'
  | 'clay'
  | 'smoke';

export interface TrainerCoverProps {
  /** Label rendered on the placeholder (ignored when imageUrl is present). */
  label?: string;
  /** Optional actual cover image. When provided, tone gradient is omitted. */
  imageUrl?: string | null;
  /** Alt text for the image. Defaults to the label. */
  alt?: string;
  height?: number;
  radius?: number;
  tone?: TrainerCoverTone;
  /** Adds a bottom-to-top dark gradient for text legibility. */
  overlay?: boolean;
  className?: string;
  /** next/image sizes hint. */
  sizes?: string;
  priority?: boolean;
}

const TONES: Record<TrainerCoverTone, { bg: string; tint: string }> = {
  default: { bg: '#1C1C1F', tint: 'rgba(255,77,28,0.10)' },
  warm: { bg: '#22181A', tint: 'rgba(255,77,28,0.22)' },
  cool: { bg: '#141B20', tint: 'rgba(77,158,255,0.14)' },
  olive: { bg: '#1B1D17', tint: 'rgba(212,255,77,0.10)' },
  clay: { bg: '#241A16', tint: 'rgba(255,140,77,0.14)' },
  smoke: { bg: '#17181B', tint: 'rgba(255,255,255,0.04)' },
};

export default function TrainerCover({
  label,
  imageUrl,
  alt,
  height = 180,
  radius = 10,
  tone = 'default',
  overlay = true,
  className,
  sizes,
  priority,
}: TrainerCoverProps) {
  const safeImg = safeImageUrl(imageUrl);

  if (safeImg) {
    return (
      <div
        className={`relative overflow-hidden ${className ?? ''}`}
        style={{ height, borderRadius: radius, background: '#141416' }}
      >
        <Image
          src={safeImg}
          alt={alt ?? label ?? 'Cover image'}
          fill
          priority={priority}
          sizes={sizes ?? '(max-width: 768px) 100vw, 1280px'}
          style={{ objectFit: 'cover' }}
        />
        {overlay ? (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(180deg, transparent 50%, rgba(10,10,11,0.55) 100%)',
            }}
          />
        ) : null}
        {label ? (
          <div
            className="mf-font-mono"
            style={{
              position: 'absolute',
              left: 12,
              bottom: 10,
              color: 'rgba(255,255,255,0.75)',
              fontSize: 10,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            {label}
          </div>
        ) : null}
      </div>
    );
  }

  const t = TONES[tone];
  return (
    <div
      className={`relative overflow-hidden ${className ?? ''}`}
      style={{
        height,
        borderRadius: radius,
        background: t.bg,
        backgroundImage: `
          radial-gradient(120% 80% at 20% 10%, ${t.tint}, transparent 55%),
          linear-gradient(135deg, transparent 49.5%, rgba(255,255,255,0.035) 49.5%, rgba(255,255,255,0.035) 50.5%, transparent 50.5%)
        `,
        backgroundSize: 'auto, 14px 14px',
      }}
      aria-label={alt ?? label ?? 'Cover placeholder'}
    >
      {overlay ? (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, transparent 40%, rgba(10,10,11,0.65) 100%)',
          }}
        />
      ) : null}
      {label ? (
        <div
          className="mf-font-mono"
          style={{
            position: 'absolute',
            left: 12,
            bottom: 10,
            color: 'rgba(255,255,255,0.35)',
            fontSize: 10,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </div>
      ) : null}
    </div>
  );
}
