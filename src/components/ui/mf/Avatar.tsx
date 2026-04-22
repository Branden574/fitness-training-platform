import { safeImageUrl } from '@/lib/safeUrl';

export interface AvatarProps {
  initials: string;
  /** Optional profile image URL. Falls back to initials tile on error/missing. */
  image?: string | null;
  /** Accessible name override. Defaults to initials. */
  alt?: string;
  size?: number;
  active?: boolean;
  className?: string;
}

export default function Avatar({
  initials,
  image,
  alt,
  size = 32,
  active,
  className,
}: AvatarProps) {
  // safeImageUrl gates out javascript:/data:/file: so a malicious DB row
  // can't inject a CSS payload into the inline style below.
  const safeImg = safeImageUrl(image);
  const hasImage = !!safeImg;
  return (
    <div
      className={`mf-font-mono ${className ?? ''}`}
      style={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: 6,
        background: hasImage
          ? `var(--mf-surface-3) center/cover no-repeat url(${JSON.stringify(safeImg)})`
          : 'var(--mf-surface-3)',
        color: 'var(--mf-fg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
        fontSize: size * 0.4,
        border: '1px solid var(--mf-hairline)',
        position: 'relative',
        overflow: 'hidden',
      }}
      aria-label={alt ?? initials}
    >
      {!hasImage && initials}
      {active && (
        <span
          style={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            width: 10,
            height: 10,
            borderRadius: 10,
            background: 'var(--mf-green)',
            border: '2px solid var(--mf-surface-1)',
          }}
        />
      )}
    </div>
  );
}
