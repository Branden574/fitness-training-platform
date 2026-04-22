import Image from 'next/image';
import { safeImageUrl } from '@/lib/safeUrl';

export type RoundAvatarStatus = 'accepting' | 'waitlist';

export interface RoundAvatarProps {
  initials: string;
  image?: string | null;
  alt?: string;
  size?: number;
  ring?: boolean;
  ringColor?: string;
  status?: RoundAvatarStatus;
  className?: string;
}

export default function RoundAvatar({
  initials,
  image,
  alt,
  size = 56,
  ring = false,
  ringColor = 'var(--mf-accent)',
  status,
  className,
}: RoundAvatarProps) {
  const safeImg = safeImageUrl(image);
  const initialsToShow = initials.slice(0, 3).toUpperCase();
  const statusColor =
    status === 'accepting'
      ? 'var(--mf-green)'
      : status === 'waitlist'
        ? 'var(--mf-amber)'
        : null;
  const dotSize = Math.max(10, Math.round(size * 0.2));

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: 'var(--mf-surface-3)',
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'var(--font-display), ui-sans-serif, system-ui, sans-serif',
          fontWeight: 600,
          letterSpacing: '0.02em',
          fontSize: size * 0.36,
          color: 'var(--mf-fg)',
          border: ring ? `2px solid ${ringColor}` : '2px solid var(--mf-surface-1)',
          boxShadow: '0 4px 18px -6px rgba(0,0,0,0.6)',
          overflow: 'hidden',
          position: 'relative',
        }}
        aria-label={alt ?? initialsToShow}
      >
        {safeImg ? (
          <Image
            src={safeImg}
            alt={alt ?? initialsToShow}
            fill
            sizes={`${size}px`}
            style={{ objectFit: 'cover' }}
          />
        ) : (
          initialsToShow
        )}
      </div>
      {statusColor ? (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            bottom: 2,
            right: 2,
            width: dotSize,
            height: dotSize,
            borderRadius: '50%',
            background: statusColor,
            border: '2px solid var(--mf-surface-1)',
          }}
        />
      ) : null}
    </div>
  );
}
