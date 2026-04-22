'use client';

import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import Image from 'next/image';
import { safeImageUrl } from '@/lib/safeUrl';

export interface LightboxItem {
  /** Image URL OR a plain label string (renders a tile placeholder). */
  src: string;
  alt?: string;
  caption?: string;
}

export interface LightboxProps {
  items: LightboxItem[];
  index: number;
  onClose: () => void;
  onIndexChange: (next: number) => void;
}

export default function Lightbox({
  items,
  index,
  onClose,
  onIndexChange,
}: LightboxProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const next = useCallback(() => {
    if (items.length === 0) return;
    onIndexChange((index + 1) % items.length);
  }, [index, items.length, onIndexChange]);

  const prev = useCallback(() => {
    if (items.length === 0) return;
    onIndexChange((index - 1 + items.length) % items.length);
  }, [index, items.length, onIndexChange]);

  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const { body } = document;
    const prevOverflow = body.style.overflow;
    body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prev();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    containerRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      body.style.overflow = prevOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [next, prev, onClose]);

  const item = items[index];
  if (!item) return null;

  const safeImg = safeImageUrl(item.src);

  const node = (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={item.alt ?? item.caption ?? 'Image viewer'}
      tabIndex={-1}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0,0,0,0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        outline: 'none',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="mf-btn mf-btn-ghost"
        style={{ position: 'absolute', top: 20, right: 20, width: 44, height: 44, padding: 0 }}
      >
        <X size={18} />
      </button>

      {items.length > 1 ? (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Previous image"
            className="mf-btn mf-btn-ghost"
            style={{
              position: 'absolute',
              left: 20,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 52,
              height: 52,
              padding: 0,
            }}
          >
            <ChevronLeft size={22} />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next image"
            className="mf-btn mf-btn-ghost"
            style={{
              position: 'absolute',
              right: 20,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 52,
              height: 52,
              padding: 0,
            }}
          >
            <ChevronRight size={22} />
          </button>
        </>
      ) : null}

      <div
        style={{
          position: 'relative',
          width: 'min(88vw, 1100px)',
          aspectRatio: '1 / 1',
          maxHeight: '80vh',
          background: 'var(--mf-surface-2)',
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        {safeImg ? (
          <Image
            src={safeImg}
            alt={item.alt ?? item.caption ?? 'Gallery image'}
            fill
            sizes="90vw"
            style={{ objectFit: 'contain' }}
            priority
          />
        ) : (
          <div
            className="ph-img"
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'flex-end',
              padding: 16,
              fontSize: 12,
            }}
          >
            <span style={{ position: 'relative', zIndex: 2 }}>{item.src}</span>
          </div>
        )}
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'var(--mf-surface-2)',
          border: '1px solid var(--mf-hairline)',
          borderRadius: 999,
          padding: '8px 16px',
          maxWidth: 'calc(100vw - 48px)',
        }}
      >
        <span className="mf-font-mono" style={{ fontSize: 11, letterSpacing: '0.08em' }}>
          {index + 1} / {items.length}
        </span>
        {item.caption ? (
          <>
            <span className="mf-fg-mute">·</span>
            <span
              className="mf-fg-dim"
              style={{
                fontSize: 12,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {item.caption}
            </span>
          </>
        ) : null}
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
