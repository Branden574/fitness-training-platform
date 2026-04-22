'use client';

import { useRef, useState } from 'react';
import { pickProgressPhoto } from '@/lib/nativeCameraClient';

interface Props {
  initialImage: string | null;
  initials: string;
}

/**
 * Self-contained profile-photo picker for clients. Wraps nativeCameraClient
 * so Capacitor gets the native action sheet (Camera / Photo Library) while
 * web falls back to a plain <input type="file">. Writes to User.image via
 * POST /api/profile/photo, renders in the trainer roster and anywhere else
 * User.image is shown.
 */
export default function ProfilePhotoUploader({
  initialImage,
  initials,
}: Props) {
  const [image, setImage] = useState<string | null>(initialImage);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setError(null);
    setBusy(true);
    try {
      const form = new FormData();
      form.append('photo', file);
      const res = await fetch('/api/profile/photo', {
        method: 'POST',
        body: form,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Upload failed');
        return;
      }
      const data = await res.json();
      setImage(data.image);
      setFlash('Photo updated');
      setTimeout(() => setFlash(null), 1800);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!image) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/profile/photo', { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Could not remove photo');
        return;
      }
      setImage(null);
      setFlash('Photo removed');
      setTimeout(() => setFlash(null), 1800);
    } finally {
      setBusy(false);
    }
  };

  const pick = async () => {
    // Prefer the shared native-or-web picker so Capacitor users get the
    // Camera / Photo Library action sheet instead of a file-input.
    try {
      const files = await pickProgressPhoto();
      const file = files[0];
      if (file) {
        await upload(file);
        return;
      }
    } catch {
      // fall through to plain file input
    }
    inputRef.current?.click();
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 8,
            background: image
              ? `center/cover no-repeat url(${JSON.stringify(image)})`
              : 'var(--mf-surface-3)',
            border: '1px solid var(--mf-hairline)',
            display: 'grid',
            placeItems: 'center',
            fontSize: 22,
            fontWeight: 600,
          }}
          className="mf-font-mono"
          aria-label={image ? 'Profile photo' : `Initials ${initials}`}
        >
          {!image && initials}
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className="mf-btn"
              onClick={pick}
              disabled={busy}
              style={{ height: 36, fontSize: 12 }}
            >
              {busy ? 'Uploading…' : image ? 'Replace' : 'Upload photo'}
            </button>
            {image && (
              <button
                type="button"
                className="mf-btn mf-btn-ghost"
                onClick={remove}
                disabled={busy}
                style={{ height: 36, fontSize: 12 }}
              >
                Remove
              </button>
            )}
          </div>
          <div className="mf-fg-dim" style={{ fontSize: 11 }}>
            JPEG, PNG, or WebP · Max 5 MB. Shown to your coach in their
            roster and anywhere your profile appears.
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
            // reset so picking the same file twice still fires onChange
            if (inputRef.current) inputRef.current.value = '';
          }}
        />
      </div>
      {flash && (
        <div
          style={{
            marginTop: 10,
            padding: '8px 10px',
            background: 'rgba(43, 217, 133, 0.1)',
            border: '1px solid rgba(43, 217, 133, 0.35)',
            color: '#86efac',
            borderRadius: 4,
            fontSize: 12,
          }}
        >
          {flash}
        </div>
      )}
      {error && (
        <div
          role="alert"
          style={{
            marginTop: 10,
            padding: '8px 10px',
            background: '#2a1212',
            border: '1px solid #6b1f1f',
            color: '#fca5a5',
            borderRadius: 4,
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
