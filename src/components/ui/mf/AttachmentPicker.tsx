// src/components/ui/mf/AttachmentPicker.tsx
//
// Paperclip-popover trigger. On tap, opens an action sheet with three rows:
// Photo or video (native picker), Voice note (inline recorder), File. The
// caller passes a `onPicked(intent, file)` for non-voice intents and a
// separate `onVoiceRequest()` to swap the composer into voice-record mode.

'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, Mic, Paperclip, Plus } from 'lucide-react';
import type { AttachmentIntent } from '@/lib/messages/attachmentLimits';

export interface AttachmentPickerProps {
  onPicked: (intent: AttachmentIntent, file: File) => void;
  onVoiceRequest: () => void;
  /** Render the trigger as Paperclip (mobile) or Plus (desktop). Default Paperclip. */
  trigger?: 'paperclip' | 'plus';
  /** Optional className for the trigger button (sizing, color tweaks). */
  triggerClassName?: string;
  ariaLabel?: string;
}

export default function AttachmentPicker({
  onPicked,
  onVoiceRequest,
  trigger = 'paperclip',
  triggerClassName,
  ariaLabel = 'Attach',
}: AttachmentPickerProps) {
  const [open, setOpen] = useState(false);
  const photoVideoRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  // Intent must follow the file's actual mime, not the picker row tapped.
  // OS file dialogs often ignore `accept` filters (especially macOS) so a user
  // can pick a JPEG via the "File" row; without this inference, the upload
  // route receives intent=file + mime=image/jpeg and rejects.
  function inferIntent(f: File): AttachmentIntent {
    const t = f.type;
    if (t.startsWith('image/')) return 'image';
    if (t.startsWith('video/')) return 'video';
    if (t.startsWith('audio/')) return 'voice';
    return 'file';
  }

  function handlePhotoOrVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = ''; // reset so picking the same file twice works
    setOpen(false);
    if (!f) return;
    onPicked(inferIntent(f), f);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    setOpen(false);
    if (!f) return;
    onPicked(inferIntent(f), f);
  }

  const TriggerIcon = trigger === 'plus' ? Plus : Paperclip;

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        className={triggerClassName ?? 'mf-btn mf-btn-ghost'}
        style={{ height: 36, width: 36, padding: 0 }}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <TriggerIcon size={16} />
      </button>

      <input
        ref={photoVideoRef}
        type="file"
        accept="image/*,video/*"
        style={{ display: 'none' }}
        onChange={handlePhotoOrVideo}
      />
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,text/plain,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        style={{ display: 'none' }}
        onChange={handleFile}
      />

      {open && (
        <div
          role="menu"
          className="mf-card"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: 0,
            zIndex: 40,
            minWidth: 220,
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
            boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
          }}
        >
          <PickerRow
            icon={<Camera size={16} />}
            label="Photo or video"
            onClick={() => photoVideoRef.current?.click()}
          />
          <PickerRow
            icon={<Mic size={16} />}
            label="Voice note"
            onClick={() => {
              setOpen(false);
              onVoiceRequest();
            }}
          />
          <PickerRow
            icon={<Paperclip size={16} />}
            label="File"
            onClick={() => fileRef.current?.click()}
          />
        </div>
      )}
    </div>
  );
}

function PickerRow({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="mf-fg"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 12px',
        background: 'transparent',
        border: 'none',
        textAlign: 'left',
        fontSize: 13,
        cursor: 'pointer',
        borderRadius: 6,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'var(--mf-surface-2)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
      }}
    >
      <span className="mf-fg-mute">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
