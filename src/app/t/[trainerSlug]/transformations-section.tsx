import Image from 'next/image';
import { safeImageUrl } from '@/lib/safeUrl';
import ProfileSection from './profile-section';
import type { ProfileTransformation } from './types';

function isUrl(s: string): boolean {
  return /^https?:\/\//i.test(s) || s.startsWith('/');
}

function TileWithLabel({
  src,
  labelText,
  labelKind,
}: {
  src: string;
  labelText: string;
  labelKind: 'before' | 'after';
}) {
  const safeImg = safeImageUrl(src);
  const isImg = !!safeImg && isUrl(src);
  const badgeStyle =
    labelKind === 'after'
      ? { background: 'var(--mf-accent)', color: 'var(--mf-accent-ink)', fontWeight: 600 as const }
      : { background: 'rgba(10,10,11,0.8)', color: 'var(--mf-fg)', fontWeight: 500 as const };
  return (
    <div style={{ position: 'relative' }}>
      <div
        className="ph-img"
        style={{
          aspectRatio: '3 / 4',
          borderRadius: 6,
          overflow: 'hidden',
          position: 'relative',
          backgroundColor: labelKind === 'after' ? '#22181A' : undefined,
        }}
      >
        {isImg ? (
          <Image src={safeImg} alt={labelText} fill sizes="300px" style={{ objectFit: 'cover' }} />
        ) : (
          <span style={{ position: 'relative', zIndex: 2 }}>{src}</span>
        )}
      </div>
      <span
        className="mf-font-mono"
        style={{
          position: 'absolute',
          top: 8,
          left: 8,
          fontSize: 9,
          letterSpacing: '0.1em',
          padding: '4px 8px',
          borderRadius: 4,
          textTransform: 'uppercase',
          ...badgeStyle,
        }}
      >
        {labelKind === 'after' ? 'AFTER' : 'BEFORE'}
      </span>
    </div>
  );
}

export default function TransformationsSection({
  transformations,
}: {
  transformations: ProfileTransformation[];
}) {
  if (transformations.length === 0) return null;
  return (
    <ProfileSection num="04 / RESULTS" title="Client transformations.">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
        }}
      >
        {transformations.map((t) => (
          <div key={t.id} className="mf-card" style={{ padding: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <TileWithLabel src={t.beforePhotoUrl} labelText="Before" labelKind="before" />
              <TileWithLabel src={t.afterPhotoUrl} labelText="After" labelKind="after" />
            </div>
            {t.caption || t.durationWeeks ? (
              <div style={{ marginTop: 16 }}>
                {t.durationWeeks ? (
                  <div
                    className="mf-font-mono mf-fg-mute"
                    style={{
                      fontSize: 10,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {t.durationWeeks} WEEKS
                  </div>
                ) : null}
                {t.caption ? (
                  <div
                    className="mf-fg-dim"
                    style={{ fontSize: 13, marginTop: 8, lineHeight: 1.5 }}
                  >
                    {t.caption}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </ProfileSection>
  );
}
