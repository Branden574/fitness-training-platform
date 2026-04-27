// src/components/ui/mf/PendingAttachmentChip.tsx
//
// Composer-side preview for an attachment that's been picked but not sent
// yet. Shows a thumbnail (image/video) or a typed icon (file/voice) plus
// filename, size, and a remove `×`.

'use client';

import { useEffect, useState } from 'react';
import { File, Mic, Video, X } from 'lucide-react';

export interface PendingAttachmentChipProps {
  /** Local Blob (the picked file or recorded voice). May be null if upload has already completed and only the URL is known. */
  blob?: Blob | null;
  /** R2 URL — set after upload succeeds, used as a fallback preview source. */
  url?: string | null;
  mime: string;
  size: number;
  name?: string | null;
  /** Upload progress 0..1, or undefined when not uploading. */
  progress?: number;
  onRemove: () => void;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PendingAttachmentChip({
  blob,
  url,
  mime,
  size,
  name,
  progress,
  onRemove,
}: PendingAttachmentChipProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (blob && (mime.startsWith('image/') || mime.startsWith('video/'))) {
      const obj = URL.createObjectURL(blob);
      setPreviewUrl(obj);
      return () => URL.revokeObjectURL(obj);
    }
    setPreviewUrl(null);
    return () => undefined;
  }, [blob, mime]);

  const isImage = mime.startsWith('image/');
  const isVideo = mime.startsWith('video/');
  const isVoice = mime.startsWith('audio/');

  const thumbSrc = previewUrl ?? (isImage ? url : null);

  return (
    <div
      className="mf-card"
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: 8,
        marginBottom: 8,
        maxWidth: 320,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 6,
          background: 'var(--mf-surface-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        {isImage && thumbSrc ? (
          <img
            src={thumbSrc}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : isVideo ? (
          <Video size={18} className="mf-fg-mute" />
        ) : isVoice ? (
          <Mic size={18} className="mf-fg-mute" />
        ) : (
          <File size={18} className="mf-fg-mute" />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {name ?? (isImage ? 'Photo' : isVideo ? 'Video' : isVoice ? 'Voice note' : 'File')}
        </div>
        <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 10 }}>
          {formatBytes(size)}
          {typeof progress === 'number' && progress < 1
            ? ` · ${Math.round(progress * 100)}%`
            : ''}
        </div>
        {typeof progress === 'number' && progress < 1 && (
          <div
            style={{
              marginTop: 4,
              height: 3,
              background: 'var(--mf-surface-2)',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${Math.round(progress * 100)}%`,
                height: '100%',
                background: 'var(--mf-accent)',
                transition: 'width 120ms ease',
              }}
            />
          </div>
        )}
      </div>
      <button
        type="button"
        aria-label="Remove attachment"
        onClick={onRemove}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--mf-fg-mute)',
          padding: 4,
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
