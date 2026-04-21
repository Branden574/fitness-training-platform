'use client';

import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Upload, X } from 'lucide-react';
import { Btn } from '@/components/ui/mf';

type Difficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export default function NewExerciseClient() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [targetMuscle, setTargetMuscle] = useState('');
  const [equipment, setEquipment] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('INTERMEDIATE');
  const [instructions, setInstructions] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setName('');
    setTargetMuscle('');
    setEquipment('');
    setDifficulty('INTERMEDIATE');
    setInstructions('');
    setImageUrl('');
    setVideoUrl('');
    setError(null);
    setUploadError(null);
  };

  const handleUpload = async (file: File) => {
    setUploadError(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.append('image', file);
      const res = await fetch('/api/exercises/upload-image', {
        method: 'POST',
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setUploadError(data.error ?? `Upload failed (${res.status})`);
        return;
      }
      if (data.imageUrl) setImageUrl(data.imageUrl);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const close = () => {
    setOpen(false);
    reset();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    if (!targetMuscle.trim()) {
      setError('Target muscle is required.');
      return;
    }
    setBusy(true);
    try {
      // POST /api/exercises creates the row. It normalizes image/video URLs
      // to null when empty so the card falls back to the placeholder
      // gradient rather than broken <img> requests.
      const createRes = await fetch('/api/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          targetMuscle: targetMuscle
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          difficulty,
          instructions: instructions
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
          equipment: equipment
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      const data = await createRes.json().catch(() => ({}));
      if (!createRes.ok) {
        setError(data.message ?? 'Create failed');
        return;
      }

      // Apply image / video URLs via PATCH if provided (POST schema doesn't
      // cover them; separating the calls keeps the POST simple + lets the
      // PATCH endpoint do its own URL validation).
      if (imageUrl.trim() || videoUrl.trim()) {
        await fetch(`/api/exercises/${data.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl: imageUrl.trim() || null,
            videoUrl: videoUrl.trim() || null,
          }),
        });
      }

      close();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Btn variant="primary" icon={Plus} onClick={() => setOpen(true)}>
        New exercise
      </Btn>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <form
            onSubmit={submit}
            className="mf-card-elev"
            style={{
              width: 'min(560px, 100%)',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 24,
              display: 'grid',
              gap: 14,
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="mf-eyebrow">NEW EXERCISE</div>
                <div
                  className="mf-font-display"
                  style={{
                    fontSize: 20,
                    letterSpacing: '-0.01em',
                    marginTop: 2,
                  }}
                >
                  Add to library
                </div>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="mf-btn mf-btn-ghost"
                style={{ height: 32, width: 32, padding: 0 }}
              >
                <X size={14} />
              </button>
            </div>

            <Field label="NAME" required>
              <input
                className="mf-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                maxLength={120}
                autoFocus
                placeholder="Barbell Bench Press"
              />
            </Field>

            <Field
              label="TARGET MUSCLES"
              required
              hint="Comma-separated (e.g. chest, triceps, shoulders)"
            >
              <input
                className="mf-input"
                value={targetMuscle}
                onChange={(e) => setTargetMuscle(e.target.value)}
                required
                maxLength={400}
                placeholder="chest, triceps"
              />
            </Field>

            <Field label="EQUIPMENT" hint="Comma-separated, or leave blank">
              <input
                className="mf-input"
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
                maxLength={400}
                placeholder="barbell, bench"
              />
            </Field>

            <Field label="DIFFICULTY">
              <div style={{ display: 'flex', gap: 6 }}>
                {(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const).map(
                  (d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDifficulty(d)}
                      className="mf-btn"
                      style={{
                        flex: 1,
                        height: 36,
                        fontSize: 11,
                        background:
                          difficulty === d ? 'var(--mf-accent)' : undefined,
                        color:
                          difficulty === d ? '#0A0A0B' : undefined,
                        borderColor:
                          difficulty === d ? 'var(--mf-accent)' : undefined,
                      }}
                    >
                      {d}
                    </button>
                  ),
                )}
              </div>
            </Field>

            <Field
              label="IMAGE / GIF"
              hint="Upload your own, paste a URL, or leave blank — Fill Images can auto-match from free-exercise-db later."
            >
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="url"
                  className="mf-input"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  maxLength={500}
                  placeholder="https://… or click Upload"
                  style={{ flex: 1 }}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(f);
                    e.target.value = '';
                  }}
                />
                <Btn
                  icon={Upload}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? 'Uploading…' : 'Upload'}
                </Btn>
              </div>
              {imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt="Preview"
                  style={{
                    marginTop: 8,
                    width: '100%',
                    maxHeight: 160,
                    objectFit: 'cover',
                    borderRadius: 4,
                    background: 'var(--mf-surface-3)',
                  }}
                />
              )}
              {uploadError && (
                <div
                  role="alert"
                  className="mf-font-mono"
                  style={{ fontSize: 11, color: '#fca5a5', marginTop: 6 }}
                >
                  {uploadError}
                </div>
              )}
            </Field>

            <Field label="VIDEO URL (optional)">
              <input
                type="url"
                className="mf-input"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                maxLength={500}
                placeholder="https://…"
              />
            </Field>

            <Field
              label="INSTRUCTIONS"
              hint="One step per line, or leave blank."
            >
              <textarea
                className="mf-input"
                rows={4}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                maxLength={2000}
                placeholder={`Lie flat on bench\nGrip bar slightly wider than shoulders\nLower bar to mid-chest\nPress back up`}
              />
            </Field>

            {error && (
              <div
                role="alert"
                style={{
                  padding: '10px 12px',
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

            <div className="flex justify-end gap-2">
              <button type="button" onClick={close} className="mf-btn">
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="mf-btn mf-btn-primary"
              >
                {busy ? 'Creating…' : 'Create exercise'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label style={{ display: 'block' }}>
      <div
        style={{
          fontFamily: 'var(--font-mf-mono), monospace',
          fontSize: 10,
          letterSpacing: '.15em',
          color: 'var(--mf-fg-dim)',
          marginBottom: 6,
        }}
      >
        {label}
        {required && (
          <span style={{ color: 'var(--mf-accent)', marginLeft: 4 }}>*</span>
        )}
      </div>
      {children}
      {hint && (
        <div
          style={{
            fontSize: 10,
            color: 'var(--mf-fg-mute)',
            marginTop: 4,
          }}
        >
          {hint}
        </div>
      )}
    </label>
  );
}
