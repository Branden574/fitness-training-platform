// src/components/ui/mf/AttachmentBubble.tsx
//
// Single component that renders all four attachment-bubble shapes (image,
// video, voice, file) based on the message's `type` and the `attachment`
// JSON blob. Used by every chat surface so the rendering can't drift.

'use client';

import { useRef, useState } from 'react';
import { File as FileIcon, Pause, Play } from 'lucide-react';
import MessagePhotoLightbox from './MessagePhotoLightbox';

export interface AttachmentBubbleAttachment {
  url: string;
  mime: string;
  size: number;
  name?: string | null;
  durationSec?: number;
  width?: number;
  height?: number;
  posterUrl?: string;
}

export interface AttachmentBubbleProps {
  type: 'IMAGE' | 'VIDEO' | 'VOICE' | 'FILE';
  attachment: AttachmentBubbleAttachment;
  fromMe: boolean;
  /** Override the max thumbnail width for desktop. Default 240. */
  maxThumbWidth?: number;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

export default function AttachmentBubble({
  type,
  attachment,
  fromMe,
  maxThumbWidth = 240,
}: AttachmentBubbleProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [videoActive, setVideoActive] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [voicePlaying, setVoicePlaying] = useState(false);

  if (type === 'IMAGE') {
    return (
      <>
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          style={{
            padding: 0,
            border: 'none',
            background: 'transparent',
            borderRadius: 10,
            overflow: 'hidden',
            cursor: 'zoom-in',
            display: 'block',
          }}
        >
          <img
            src={attachment.url}
            alt={attachment.name ?? 'Photo'}
            style={{
              maxWidth: maxThumbWidth,
              maxHeight: maxThumbWidth * 1.33,
              borderRadius: 10,
              display: 'block',
              objectFit: 'cover',
            }}
          />
        </button>
        {lightboxOpen && (
          <MessagePhotoLightbox
            src={attachment.url}
            alt={attachment.name ?? ''}
            onClose={() => setLightboxOpen(false)}
          />
        )}
      </>
    );
  }

  if (type === 'VIDEO') {
    return (
      <div
        style={{
          maxWidth: maxThumbWidth,
          borderRadius: 10,
          overflow: 'hidden',
          background: '#000',
        }}
      >
        {videoActive ? (
          <video
            src={attachment.url}
            controls
            autoPlay
            style={{ width: '100%', display: 'block' }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setVideoActive(true)}
            style={{
              padding: 0,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              position: 'relative',
              display: 'block',
              width: '100%',
            }}
          >
            <video
              src={attachment.url}
              poster={attachment.posterUrl}
              preload="metadata"
              style={{ width: '100%', display: 'block', pointerEvents: 'none' }}
            />
            <span
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.9)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#000',
                  paddingLeft: 4,
                }}
              >
                <Play size={20} />
              </span>
            </span>
            {typeof attachment.durationSec === 'number' && (
              <span
                style={{
                  position: 'absolute',
                  bottom: 8,
                  right: 8,
                  background: 'rgba(0,0,0,0.6)',
                  color: '#fff',
                  fontSize: 11,
                  padding: '2px 6px',
                  borderRadius: 4,
                  fontFamily: 'monospace',
                }}
              >
                {formatDuration(attachment.durationSec)}
              </span>
            )}
          </button>
        )}
      </div>
    );
  }

  if (type === 'VOICE') {
    function toggleVoice() {
      if (!audioRef.current) {
        audioRef.current = new Audio(attachment.url);
        audioRef.current.addEventListener('ended', () => setVoicePlaying(false));
      }
      if (voicePlaying) {
        audioRef.current.pause();
        setVoicePlaying(false);
      } else {
        void audioRef.current.play();
        setVoicePlaying(true);
      }
    }
    const heights = [8, 14, 20, 12, 18, 10, 16, 8, 14, 6];
    return (
      <button
        type="button"
        onClick={toggleVoice}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          borderRadius: 18,
          background: fromMe ? 'var(--mf-accent)' : 'var(--mf-surface-2)',
          color: fromMe ? 'var(--mf-accent-ink)' : 'var(--mf-fg)',
          border: 'none',
          minWidth: 200,
          cursor: 'pointer',
        }}
      >
        <span
          style={{
            width: 32,
            height: 32,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {voicePlaying ? <Pause size={14} /> : <Play size={14} />}
        </span>
        <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
          {heights.map((h, i) => (
            <span
              key={i}
              style={{
                width: 2,
                height: h,
                background: 'currentColor',
                opacity: 0.7,
                borderRadius: 1,
              }}
            />
          ))}
        </span>
        <span style={{ fontFamily: 'monospace', fontSize: 11 }}>
          {typeof attachment.durationSec === 'number'
            ? formatDuration(attachment.durationSec)
            : '0:00'}
        </span>
      </button>
    );
  }

  // FILE
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderRadius: 10,
        background: fromMe ? 'var(--mf-accent)' : 'var(--mf-surface-2)',
        color: fromMe ? 'var(--mf-accent-ink)' : 'var(--mf-fg)',
        textDecoration: 'none',
        minWidth: 220,
        maxWidth: 320,
      }}
    >
      <span
        style={{
          width: 36,
          height: 44,
          borderRadius: 4,
          background: 'rgba(255,255,255,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <FileIcon size={18} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: 'block',
            fontSize: 13,
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {attachment.name ?? 'File'}
        </span>
        <span
          className="mf-font-mono"
          style={{ display: 'block', fontSize: 10, opacity: 0.7 }}
        >
          {formatBytes(attachment.size)}
        </span>
      </span>
    </a>
  );
}
