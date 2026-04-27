// src/components/ui/mf/MessagePhotoLightbox.tsx
//
// Fullscreen image overlay rendered via a portal so it escapes mf-card
// overflow:hidden (per feedback_portal_dropdowns_in_cards.md). Click outside
// or press Escape to dismiss. Native pinch-zoom on iOS WebView is supported
// because the <img> sits in a fixed container without touch-action: none.

'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface MessagePhotoLightboxProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

export default function MessagePhotoLightbox({
  src,
  alt,
  onClose,
}: MessagePhotoLightboxProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          background: 'rgba(255,255,255,0.12)',
          border: 'none',
          color: '#fff',
          borderRadius: 999,
          width: 36,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <X size={18} />
      </button>
      <img
        src={src}
        alt={alt ?? ''}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
          userSelect: 'none',
        }}
      />
    </div>,
    document.body,
  );
}
