'use client';

import { useEffect, useRef, useState } from 'react';
import { AgreementGate } from '@/components/trainer/AgreementGate';

interface TrainerProfile {
  photoUrl: string | null;
  location: string | null;
  instagramHandle: string | null;
  bio: string | null;
  specialties: string[];
  experience: number;
  certifications: string[];
  priceTier: string | null;
  hourlyRate: number | null;
  acceptsInPerson: boolean;
  acceptsOnline: boolean;
  trainerIsPublic: boolean;
}

const TIERS: Array<{ value: string; label: string }> = [
  { value: 'tier-1', label: '$' },
  { value: 'tier-2', label: '$$' },
  { value: 'tier-3', label: '$$$' },
  { value: 'contact', label: 'Contact' },
];

export default function ProfileEditorClient() {
  return (
    <AgreementGate>
      <ProfileForm />
    </AgreementGate>
  );
}

function ProfileForm() {
  const [profile, setProfile] = useState<TrainerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [specialtyInput, setSpecialtyInput] = useState('');
  const [specialtyHints, setSpecialtyHints] = useState<string[]>([]);
  const [certInput, setCertInput] = useState('');

  useEffect(() => {
    (async () => {
      // Load initial profile by hitting ensure-identity (auto-creates Trainer row
      // if needed) and /api/trainers/me/testimonials (just to bootstrap Trainer).
      // Simplest: POST ensure-identity then GET something. Since there's no GET
      // for full profile yet, we fetch the Trainer row via a lightweight endpoint.
      // For now: render zero-state and save-back creates the row via PATCH.
      try {
        const res = await fetch('/api/trainers/me/agreement', { cache: 'no-store' });
        if (!res.ok) return;
      } finally {
        // The profile page reads data lazily — PATCH seeds fields as trainer fills them.
      }
      setProfile({
        photoUrl: null,
        location: null,
        instagramHandle: null,
        bio: null,
        specialties: [],
        experience: 0,
        certifications: [],
        priceTier: null,
        hourlyRate: null,
        acceptsInPerson: false,
        acceptsOnline: false,
        trainerIsPublic: false,
      });
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (specialtyInput.trim().length < 1) {
      setSpecialtyHints([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(
        `/api/specialties/suggest?q=${encodeURIComponent(specialtyInput.trim())}`,
      );
      if (!res.ok) return;
      const data = await res.json();
      setSpecialtyHints(
        (data.suggestions as Array<{ tag: string }>).map((s) => s.tag),
      );
    }, 200);
    return () => clearTimeout(t);
  }, [specialtyInput]);

  if (loading || !profile) return <div className="mf-fg-dim">Loading…</div>;

  const update = <K extends keyof TrainerProfile>(
    key: K,
    value: TrainerProfile[K],
  ) => setProfile((p) => (p ? { ...p, [key]: value } : p));

  const addSpecialty = (raw: string) => {
    const tag = raw.toLowerCase().trim().replace(/\s+/g, ' ');
    if (!tag) return;
    if (profile.specialties.includes(tag)) return;
    if (profile.specialties.length >= 5) return;
    update('specialties', [...profile.specialties, tag]);
    setSpecialtyInput('');
    setSpecialtyHints([]);
  };

  const removeSpecialty = (tag: string) =>
    update(
      'specialties',
      profile.specialties.filter((t) => t !== tag),
    );

  const addCert = () => {
    const v = certInput.trim();
    if (!v) return;
    if (profile.certifications.length >= 20) return;
    update('certifications', [...profile.certifications, v]);
    setCertInput('');
  };

  const removeCert = (i: number) =>
    update(
      'certifications',
      profile.certifications.filter((_, idx) => idx !== i),
    );

  const uploadPhoto = async (file: File) => {
    const form = new FormData();
    form.append('photo', file);
    const res = await fetch('/api/trainers/me/photo', {
      method: 'POST',
      body: form,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Photo upload failed');
      return;
    }
    const data = await res.json();
    update('photoUrl', data.photoUrl);
    setMessage('Photo updated.');
    setTimeout(() => setMessage(null), 2000);
  };

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch('/api/trainers/me/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bio: profile.bio ?? undefined,
          location: profile.location ?? undefined,
          instagramHandle: profile.instagramHandle ?? undefined,
          specialties: profile.specialties,
          experience: profile.experience,
          certifications: profile.certifications,
          priceTier: profile.priceTier ?? undefined,
          hourlyRate: profile.hourlyRate ?? undefined,
          acceptsInPerson: profile.acceptsInPerson,
          acceptsOnline: profile.acceptsOnline,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Save failed');
        return;
      }
      setMessage('Profile saved.');
      setTimeout(() => setMessage(null), 2000);
    } finally {
      setSaving(false);
    }
  };

  const canPublish =
    profile.photoUrl && profile.bio && profile.specialties.length > 0 && profile.location;

  const togglePublish = async () => {
    const res = await fetch('/api/trainers/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublic: !profile.trainerIsPublic }),
    });
    if (res.ok) {
      update('trainerIsPublic', !profile.trainerIsPublic);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {message && (
        <div
          style={{
            padding: '10px 12px',
            background: 'rgba(43, 217, 133, 0.1)',
            border: '1px solid rgba(43, 217, 133, 0.35)',
            color: '#86efac',
            borderRadius: 4,
            fontSize: 12,
          }}
        >
          {message}
        </div>
      )}
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

      <Section title="PUBLIC PHOTO">
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div
            style={{
              width: 96,
              height: 120,
              borderRadius: 4,
              background: 'var(--mf-surface-2, #0E0E10)',
              border: '1px solid var(--mf-hairline, #1F1F22)',
              backgroundImage: profile.photoUrl ? `url(${profile.photoUrl})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadPhoto(f);
              }}
            />
            <button
              type="button"
              className="mf-btn"
              onClick={() => photoInputRef.current?.click()}
            >
              {profile.photoUrl ? 'Replace photo' : 'Upload photo'}
            </button>
            <div
              className="mf-fg-dim"
              style={{ fontSize: 11, marginTop: 6 }}
            >
              JPEG, PNG, or WebP · Max 5 MB · 4:5 portrait looks best
            </div>
          </div>
        </div>
      </Section>

      <Section title="LOCATION">
        <input
          className="mf-input"
          placeholder="Fresno, CA"
          value={profile.location ?? ''}
          onChange={(e) => update('location', e.target.value)}
          maxLength={120}
        />
      </Section>

      <Section title="INSTAGRAM">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--mf-surface-2)',
            border: '1px solid var(--mf-hairline)',
            borderRadius: 4,
            padding: '0 10px',
          }}
        >
          <span className="mf-fg-dim" style={{ fontSize: 13 }}>@</span>
          <input
            className="mf-input"
            placeholder="yourhandle"
            value={profile.instagramHandle ?? ''}
            onChange={(e) =>
              update(
                'instagramHandle',
                e.target.value.replace(/^@/, '').replace(/[^A-Za-z0-9._]/g, ''),
              )
            }
            maxLength={40}
            style={{
              border: 'none',
              background: 'transparent',
              padding: '10px 0',
              flex: 1,
            }}
          />
        </div>
      </Section>

      <Section title="BIO (max 500 chars)">
        <textarea
          className="mf-input"
          rows={4}
          value={profile.bio ?? ''}
          onChange={(e) => update('bio', e.target.value)}
          maxLength={500}
        />
      </Section>

      <Section title="SPECIALTIES (up to 5)">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {profile.specialties.map((s) => (
            <span
              key={s}
              style={{
                padding: '4px 10px',
                background: 'var(--mf-accent, #FF4D1C)',
                color: '#0A0A0B',
                fontSize: 11,
                borderRadius: 999,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {s}
              <button
                type="button"
                onClick={() => removeSpecialty(s)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#0A0A0B',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <input
          className="mf-input"
          placeholder={
            profile.specialties.length >= 5
              ? 'Max 5 specialties'
              : 'Add a specialty…'
          }
          value={specialtyInput}
          onChange={(e) => setSpecialtyInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addSpecialty(specialtyInput);
            }
          }}
          disabled={profile.specialties.length >= 5}
        />
        {specialtyHints.length > 0 && (
          <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {specialtyHints
              .filter((h) => !profile.specialties.includes(h))
              .slice(0, 8)
              .map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => addSpecialty(h)}
                  style={{
                    padding: '4px 10px',
                    background: 'transparent',
                    border: '1px solid var(--mf-hairline)',
                    borderRadius: 999,
                    color: 'var(--mf-fg)',
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  {h}
                </button>
              ))}
          </div>
        )}
      </Section>

      <Section title="EXPERIENCE (YEARS)">
        <input
          type="number"
          className="mf-input"
          min={0}
          max={80}
          value={profile.experience}
          onChange={(e) =>
            update('experience', Math.max(0, Math.min(80, Number(e.target.value) || 0)))
          }
        />
      </Section>

      <Section title="CERTIFICATIONS">
        <div style={{ display: 'grid', gap: 6, marginBottom: 8 }}>
          {profile.certifications.map((c, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                background: 'var(--mf-surface-2)',
                border: '1px solid var(--mf-hairline)',
                borderRadius: 4,
                fontSize: 13,
              }}
            >
              <span style={{ flex: 1 }}>{c}</span>
              <button
                type="button"
                onClick={() => removeCert(i)}
                className="mf-fg-dim"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 16,
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            className="mf-input"
            placeholder="NSCA-CPT"
            value={certInput}
            onChange={(e) => setCertInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCert();
              }
            }}
            maxLength={120}
          />
          <button type="button" className="mf-btn" onClick={addCert}>
            Add
          </button>
        </div>
      </Section>

      <Section title="PRICE TIER">
        <div style={{ display: 'flex', gap: 6 }}>
          {TIERS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => update('priceTier', t.value)}
              style={{
                height: 40,
                padding: '0 16px',
                background:
                  profile.priceTier === t.value
                    ? 'var(--mf-accent)'
                    : 'transparent',
                color: profile.priceTier === t.value ? '#0A0A0B' : 'var(--mf-fg)',
                border: '1px solid var(--mf-hairline)',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="HOURLY RATE (USD)">
        <input
          type="number"
          className="mf-input"
          min={0}
          max={10000}
          placeholder="Leave blank for 'Contact for pricing'"
          value={profile.hourlyRate ?? ''}
          onChange={(e) =>
            update('hourlyRate', e.target.value === '' ? null : Number(e.target.value))
          }
        />
      </Section>

      <Section title="SERVICE MODES">
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <input
              type="checkbox"
              checked={profile.acceptsInPerson}
              onChange={(e) => update('acceptsInPerson', e.target.checked)}
            />
            In-person training
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <input
              type="checkbox"
              checked={profile.acceptsOnline}
              onChange={(e) => update('acceptsOnline', e.target.checked)}
            />
            Online / remote
          </label>
        </div>
      </Section>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="mf-btn mf-btn-primary"
          style={{ height: 44, padding: '0 24px' }}
        >
          {saving ? 'Saving…' : 'Save profile'}
        </button>
        <button
          type="button"
          onClick={togglePublish}
          disabled={!canPublish && !profile.trainerIsPublic}
          className="mf-btn"
          style={{ height: 44, padding: '0 20px' }}
          title={!canPublish && !profile.trainerIsPublic ? 'Fill photo + bio + specialties + location first' : undefined}
        >
          {profile.trainerIsPublic
            ? '● Public — click to hide'
            : '○ Private — click to publish'}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mf-card" style={{ padding: 16 }}>
      <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
        {title}
      </div>
      {children}
    </div>
  );
}
