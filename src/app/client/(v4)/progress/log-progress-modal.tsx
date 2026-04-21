'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Camera } from 'lucide-react';
import { Btn } from '@/components/ui/mf';
import { useCelebrate } from '@/components/animations';
import type { CelebrationKind } from '@/components/animations/celebrations';
import { pickProgressPhoto } from '@/lib/nativeCameraClient';

type FormState = {
  date: string;
  weight: string;
  bodyFat: string;
  sleep: string;
  mood: string;
  energy: string;
  notes: string;
};

const EMPTY: FormState = {
  date: new Date().toISOString().slice(0, 10),
  weight: '',
  bodyFat: '',
  sleep: '',
  mood: '',
  energy: '',
  notes: '',
};

export default function LogProgressModal({
  triggerVariant = 'primary',
  triggerLabel = 'Log entry',
}: {
  triggerVariant?: 'primary' | 'default' | 'ghost';
  triggerLabel?: string;
}) {
  const router = useRouter();
  const celebrate = useCelebrate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<{ file: File; previewUrl: string }[]>([]);

  function revokePreviews(list: { file: File; previewUrl: string }[]) {
    for (const p of list) URL.revokeObjectURL(p.previewUrl);
  }

  async function addPhotos() {
    const files = await pickProgressPhoto();
    if (files.length === 0) return;
    const next = files.map((f) => ({ file: f, previewUrl: URL.createObjectURL(f) }));
    setPhotos((prev) => [...prev, ...next]);
  }

  function removePhoto(idx: number) {
    setPhotos((prev) => {
      const gone = prev[idx];
      if (gone) URL.revokeObjectURL(gone.previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  }

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload: Record<string, unknown> = { date: form.date };
    const num = (s: string) => (s.trim() === '' ? undefined : Number(s));
    if (num(form.weight) !== undefined) payload.weight = num(form.weight);
    if (num(form.bodyFat) !== undefined) payload.bodyFat = num(form.bodyFat);
    if (num(form.sleep) !== undefined) payload.sleep = num(form.sleep);
    if (num(form.mood) !== undefined) payload.mood = num(form.mood);
    if (num(form.energy) !== undefined) payload.energy = num(form.energy);
    if (form.notes.trim() !== '') payload.notes = form.notes.trim();

    try {
      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        id?: string;
        message?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(data.message ?? data.error ?? 'Failed to save entry');
        setSubmitting(false);
        return;
      }

      // Entry created — upload any staged photos. Failure here is non-fatal
      // (entry is already saved); we surface a soft warning but still close.
      if (photos.length > 0 && data.id) {
        try {
          const fd = new FormData();
          fd.append('date', form.date);
          fd.append('entryId', data.id);
          for (const p of photos) fd.append('photos', p.file);
          const up = await fetch('/api/progress/photos', { method: 'POST', body: fd });
          if (!up.ok) {
            const err = (await up.json().catch(() => ({}))) as { error?: string };
            console.warn('[progress] photo upload failed:', err.error);
          }
        } catch (e) {
          console.warn('[progress] photo upload errored:', e);
        }
      }

      revokePreviews(photos);
      setPhotos([]);
      setOpen(false);
      setForm(EMPTY);
      setSubmitting(false);

      // Fire a celebration based on which metric the client logged. Priority:
      // weight > bodyfat > sleep(≥7h) > mood(≥8). Only one per save so the
      // overlay doesn't stack or feel spammy. A follow-up could compare to
      // the previous entry and celebrate deltas (new low weight, +1% lean,
      // first 8h sleep in a week) — for now acknowledging the log itself.
      const picked: CelebrationKind | null = (() => {
        const w = num(form.weight);
        const bf = num(form.bodyFat);
        const sl = num(form.sleep);
        const md = num(form.mood);
        if (w !== undefined) return 'weight';
        if (bf !== undefined) return 'bodyfat';
        if (sl !== undefined && sl >= 7) return 'sleep';
        if (md !== undefined && md >= 8) return 'mood';
        return null;
      })();

      if (picked === 'weight') {
        celebrate('weight', {
          bigNumber: `${form.weight} LB`,
          bigLabel: 'LOGGED',
        });
      } else if (picked === 'bodyfat') {
        celebrate('bodyfat', {
          bigNumber: `${form.bodyFat}%`,
          bigLabel: 'BODY FAT',
        });
      } else if (picked === 'sleep') {
        celebrate('sleep', {
          bigNumber: `${form.sleep}H`,
          bigLabel: 'SLEEP',
        });
      } else if (picked === 'mood') {
        celebrate('mood', {
          bigNumber: `${form.mood}/10`,
          bigLabel: 'MOOD',
        });
      }

      router.refresh();
    } catch {
      setError('Network error. Try again.');
      setSubmitting(false);
    }
  }

  return (
    <>
      <Btn variant={triggerVariant} icon={Plus} onClick={() => setOpen(true)}>
        {triggerLabel}
      </Btn>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => !submitting && setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={submit}
            className="mf-card-elev"
            style={{
              width: '100%',
              maxWidth: 480,
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="mf-eyebrow">LOG</div>
                <div
                  className="mf-font-display"
                  style={{ fontSize: 22, letterSpacing: '-0.01em', lineHeight: 1, marginTop: 2 }}
                >
                  Progress entry
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={submitting}
                className="mf-btn mf-btn-ghost"
                style={{ height: 32, width: 32, padding: 0 }}
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>

            <Field label="Date">
              <input
                type="date"
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
                required
                className="mf-input"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Body weight (lb)">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={form.weight}
                  onChange={(e) => set('weight', e.target.value)}
                  placeholder="e.g. 180.5"
                  className="mf-input"
                />
              </Field>
              <Field label="Body fat (%)">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={form.bodyFat}
                  onChange={(e) => set('bodyFat', e.target.value)}
                  placeholder="e.g. 14.5"
                  className="mf-input"
                />
              </Field>
              <Field label="Sleep (hr)">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="24"
                  value={form.sleep}
                  onChange={(e) => set('sleep', e.target.value)}
                  placeholder="e.g. 7.5"
                  className="mf-input"
                />
              </Field>
              <Field label="Mood (1–10)">
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={form.mood}
                  onChange={(e) => set('mood', e.target.value)}
                  placeholder="e.g. 8"
                  className="mf-input"
                />
              </Field>
              <Field label="Energy (1–10)">
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={form.energy}
                  onChange={(e) => set('energy', e.target.value)}
                  placeholder="e.g. 7"
                  className="mf-input"
                />
              </Field>
            </div>

            <Field label="Notes">
              <textarea
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="Anything to flag for your coach?"
                rows={3}
                className="mf-input"
                style={{ resize: 'vertical', fontFamily: 'inherit' }}
              />
            </Field>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div
                className="mf-font-mono mf-fg-mute"
                style={{
                  fontSize: 9,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                Progress photos
              </div>
              {photos.length > 0 && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                    gap: 6,
                  }}
                >
                  {photos.map((p, i) => (
                    <div
                      key={p.previewUrl}
                      style={{
                        position: 'relative',
                        paddingTop: '100%',
                        borderRadius: 6,
                        overflow: 'hidden',
                        border: '1px solid var(--mf-hairline)',
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.previewUrl}
                        alt={`Photo ${i + 1}`}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        disabled={submitting}
                        aria-label="Remove photo"
                        style={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          border: 'none',
                          background: 'rgba(0,0,0,0.65)',
                          color: '#fff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <Btn
                icon={Camera}
                onClick={addPhotos}
                disabled={submitting}
                type="button"
              >
                {photos.length === 0 ? 'Add photo' : 'Add another'}
              </Btn>
            </div>

            {error && (
              <div
                className="mf-font-mono"
                style={{ fontSize: 10, color: 'var(--mf-red)' }}
              >
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Btn onClick={() => setOpen(false)} disabled={submitting}>
                Cancel
              </Btn>
              <Btn type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Saving…' : 'Save entry'}
              </Btn>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span className="mf-font-mono mf-fg-mute" style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {label}
      </span>
      {children}
    </label>
  );
}
