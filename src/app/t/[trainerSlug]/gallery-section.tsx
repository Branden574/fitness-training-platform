'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Grid } from 'lucide-react';
import Lightbox, { type LightboxItem } from '@/components/ui/mf/Lightbox';
import { safeImageUrl } from '@/lib/safeUrl';
import ProfileSection from './profile-section';

function isUrl(s: string): boolean {
  return /^https?:\/\//i.test(s) || s.startsWith('/');
}

export default function GallerySection({ gallery }: { gallery: string[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const items: LightboxItem[] = gallery.map((g) => ({
    src: g,
    alt: isUrl(g) ? 'Training moment' : g,
    caption: isUrl(g) ? undefined : g,
  }));

  if (gallery.length === 0) {
    return (
      <ProfileSection num="03 / GALLERY" title="Training moments.">
        <div
          className="mf-card"
          style={{ padding: '60px 40px', textAlign: 'center' }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              margin: '0 auto 20px',
              background: 'var(--mf-surface-3)',
              display: 'grid',
              placeItems: 'center',
              border: '1px dashed var(--mf-hairline-strong)',
            }}
          >
            <Grid size={22} className="mf-fg-mute" />
          </div>
          <div
            className="mf-font-display"
            style={{ fontSize: 22, textTransform: 'uppercase' }}
          >
            Gallery coming soon
          </div>
          <div className="mf-fg-dim" style={{ marginTop: 8, fontSize: 13 }}>
            New training photos land here once the coach uploads them.
          </div>
        </div>
      </ProfileSection>
    );
  }

  return (
    <>
      <ProfileSection num="03 / GALLERY" title="Training moments.">
        <div
          style={{
            display: 'grid',
            // Cap each tile at ~220px so a trainer with only 1–2 photos
            // gets thumbnail-sized tiles instead of one image that fills
            // the whole row. `auto-fill` lays out as many fixed-size
            // columns as fit; `justify-content: start` keeps extras from
            // being distributed into empty space.
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 220px))',
            justifyContent: 'start',
            gap: 12,
          }}
        >
          {gallery.map((g, idx) => {
            const safeImg = safeImageUrl(g);
            const isImg = !!safeImg && isUrl(g);
            return (
              <button
                key={`${g}-${idx}`}
                type="button"
                onClick={() => setOpenIdx(idx)}
                aria-label={`Open image ${idx + 1} of ${gallery.length}`}
                className="ph-img"
                style={{
                  aspectRatio: '1 / 1',
                  borderRadius: 8,
                  overflow: 'hidden',
                  position: 'relative',
                  cursor: 'zoom-in',
                  padding: 0,
                  border: 0,
                  background: isImg ? 'transparent' : undefined,
                }}
              >
                {isImg ? (
                  <Image
                    src={safeImg}
                    alt={`Gallery ${idx + 1}`}
                    fill
                    sizes="(max-width: 768px) 50vw, 260px"
                    style={{ objectFit: 'cover' }}
                  />
                ) : (
                  <span
                    style={{
                      position: 'relative',
                      zIndex: 2,
                      alignSelf: 'flex-end',
                      padding: 8,
                    }}
                  >
                    {g}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </ProfileSection>
      {openIdx !== null ? (
        <Lightbox
          items={items}
          index={openIdx}
          onClose={() => setOpenIdx(null)}
          onIndexChange={(i) => setOpenIdx(i)}
        />
      ) : null}
    </>
  );
}
