'use client';

import { useEffect, useRef, useState } from 'react';
import { AgreementGate } from '@/components/trainer/AgreementGate';
import { SpecialtyChip } from '@/components/ui/mf';
import ImageCropperModal from '@/components/ui/mf/ImageCropperModal';

interface QuickFact {
  label: string;
  value: string;
}

interface Pillar {
  title: string;
  description: string;
  icon: string;
}

interface Service {
  title: string;
  description: string;
  price: string;
  per: string;
  cta: string;
  featured: boolean;
}

interface TrainerProfile {
  photoUrl: string | null;
  coverImageUrl: string | null;
  location: string | null;
  instagramHandle: string | null;
  tiktokHandle: string | null;
  youtubeHandle: string | null;
  contactPhone: string | null;
  headline: string | null;
  bio: string | null;
  specialties: string[];
  experience: number;
  clientsTrained: number | null;
  certifications: string[];
  priceTier: string | null;
  hourlyRate: number | null;
  acceptsInPerson: boolean;
  acceptsOnline: boolean;
  trainerIsPublic: boolean;
  replyFromEmail: string | null;
  replyFromName: string | null;
  quickFacts: QuickFact[];
  pillars: Pillar[];
  gallery: string[];
  services: Service[];
}

// Human-readable labels for the Lucide icons the public profile renders on
// each Approach Pillar card. Trainers pick by what the icon *means*, not by
// its raw Lucide name — 'Target' was confusing as a dropdown value.
const PILLAR_ICONS: Array<{ value: string; label: string }> = [
  { value: 'TrendingUp', label: 'Progress chart' },
  { value: 'Dumbbell', label: 'Strength / weights' },
  { value: 'Flame', label: 'Intensity / fat loss' },
  { value: 'Heart', label: 'Health' },
  { value: 'Apple', label: 'Nutrition' },
  { value: 'Moon', label: 'Recovery / sleep' },
  { value: 'MessageSquare', label: 'Communication' },
  { value: 'Award', label: 'Achievement' },
  { value: 'Target', label: 'Goals' },
];

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
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  // Crop flow: picking a file opens the modal, confirming the crop fires the
  // upload. We keep both in one reducer-ish piece of state so only one modal
  // is ever open at a time.
  const [cropper, setCropper] = useState<
    | { kind: 'photo'; file: File }
    | { kind: 'cover'; file: File }
    | { kind: 'gallery'; file: File }
    | null
  >(null);
  const [specialtyInput, setSpecialtyInput] = useState('');
  const [specialtyHints, setSpecialtyHints] = useState<string[]>([]);
  const [certInput, setCertInput] = useState('');

  useEffect(() => {
    (async () => {
      // Load saved profile so the editor reflects what's already in the DB
      // instead of showing a blank form every visit. Falls back to an empty
      // editor on any failure — the first PATCH still seeds fields normally.
      try {
        const res = await fetch('/api/trainers/me/profile', {
          cache: 'no-store',
        });
        if (res.ok) {
          const data = await res.json();
          setProfile({
            photoUrl: data.photoUrl ?? null,
            coverImageUrl: data.coverImageUrl ?? null,
            location: data.location ?? null,
            instagramHandle: data.instagramHandle ?? null,
            tiktokHandle: data.tiktokHandle ?? null,
            youtubeHandle: data.youtubeHandle ?? null,
            contactPhone: data.contactPhone ?? null,
            headline: data.headline ?? null,
            bio: data.bio ?? null,
            specialties: (data.specialties ?? []) as string[],
            experience: typeof data.experience === 'number' ? data.experience : 0,
            clientsTrained: data.clientsTrained ?? null,
            certifications: (data.certifications ?? []) as string[],
            priceTier: data.priceTier ?? null,
            hourlyRate: data.hourlyRate ?? null,
            acceptsInPerson: !!data.acceptsInPerson,
            acceptsOnline: !!data.acceptsOnline,
            trainerIsPublic: !!data.trainerIsPublic,
            replyFromEmail: data.replyFromEmail ?? null,
            replyFromName: data.replyFromName ?? null,
            quickFacts: Array.isArray(data.quickFacts) ? (data.quickFacts as QuickFact[]) : [],
            pillars: Array.isArray(data.pillars) ? (data.pillars as Pillar[]) : [],
            gallery: Array.isArray(data.gallery) ? (data.gallery as string[]) : [],
            services: Array.isArray(data.services) ? (data.services as Service[]) : [],
          });
          setLoading(false);
          return;
        }
      } catch {
        // fall through to empty state
      }
      setProfile({
        photoUrl: null,
        coverImageUrl: null,
        location: null,
        instagramHandle: null,
        tiktokHandle: null,
        youtubeHandle: null,
        contactPhone: null,
        headline: null,
        bio: null,
        specialties: [],
        experience: 0,
        clientsTrained: null,
        certifications: [],
        priceTier: null,
        hourlyRate: null,
        acceptsInPerson: false,
        acceptsOnline: false,
        trainerIsPublic: false,
        replyFromEmail: null,
        replyFromName: null,
        quickFacts: [],
        pillars: [],
        gallery: [],
        services: [],
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

  // List editors for JSON-backed fields. Each mutator clones then edits so
  // React sees a new reference.
  const addQuickFact = () => {
    if (profile.quickFacts.length >= 12) return;
    update('quickFacts', [...profile.quickFacts, { label: '', value: '' }]);
  };
  const updateQuickFact = (i: number, field: 'label' | 'value', v: string) => {
    update(
      'quickFacts',
      profile.quickFacts.map((f, idx) => (idx === i ? { ...f, [field]: v } : f)),
    );
  };
  const removeQuickFact = (i: number) =>
    update('quickFacts', profile.quickFacts.filter((_, idx) => idx !== i));

  const addPillar = () => {
    if (profile.pillars.length >= 6) return;
    update('pillars', [
      ...profile.pillars,
      { title: '', description: '', icon: 'Target' },
    ]);
  };
  const updatePillar = (i: number, field: keyof Pillar, v: string) => {
    update(
      'pillars',
      profile.pillars.map((p, idx) => (idx === i ? { ...p, [field]: v } : p)),
    );
  };
  const removePillar = (i: number) =>
    update('pillars', profile.pillars.filter((_, idx) => idx !== i));

  const addService = () => {
    if (profile.services.length >= 8) return;
    update('services', [
      ...profile.services,
      { title: '', description: '', price: '', per: '', cta: 'Apply', featured: false },
    ]);
  };
  const updateService = (
    i: number,
    field: keyof Service,
    v: string | boolean,
  ) => {
    update(
      'services',
      profile.services.map((s, idx) => (idx === i ? { ...s, [field]: v } : s)),
    );
  };
  const removeService = (i: number) =>
    update('services', profile.services.filter((_, idx) => idx !== i));

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

  const uploadCover = async (file: File) => {
    setError(null);
    setCoverUploading(true);
    try {
      const form = new FormData();
      form.append('cover', file);
      const res = await fetch('/api/trainers/me/cover', {
        method: 'POST',
        body: form,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Cover upload failed');
        return;
      }
      const data = await res.json();
      update('coverImageUrl', data.coverImageUrl);
      setMessage('Cover image updated.');
      setTimeout(() => setMessage(null), 2000);
    } finally {
      setCoverUploading(false);
    }
  };

  const removeCover = async () => {
    setError(null);
    const res = await fetch('/api/trainers/me/cover', { method: 'DELETE' });
    if (!res.ok) {
      setError('Failed to remove cover');
      return;
    }
    update('coverImageUrl', null);
  };

  const uploadGalleryImage = async (file: File) => {
    setError(null);
    setGalleryUploading(true);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await fetch('/api/trainers/me/gallery', {
        method: 'POST',
        body: form,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Gallery upload failed');
        return;
      }
      const data = await res.json();
      // Server returns the full updated gallery so we stay in sync.
      if (Array.isArray(data.gallery)) {
        update('gallery', data.gallery as string[]);
      }
      setMessage('Image added.');
      setTimeout(() => setMessage(null), 2000);
    } finally {
      setGalleryUploading(false);
    }
  };

  const deleteGalleryEntry = async (url: string) => {
    setError(null);
    // Remove locally first for responsive UI; if the server rejects we
    // fall back to the authoritative array it returns.
    update('gallery', profile.gallery.filter((g) => g !== url));
    const res = await fetch('/api/trainers/me/gallery', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.gallery)) {
        update('gallery', data.gallery as string[]);
      }
    } else {
      // Refetch full profile to recover authoritative state.
      const fresh = await fetch('/api/trainers/me/profile', { cache: 'no-store' });
      if (fresh.ok) {
        const data = await fresh.json();
        if (Array.isArray(data.gallery)) update('gallery', data.gallery as string[]);
      }
      setError('Failed to remove image');
    }
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
          headline: profile.headline ?? null,
          location: profile.location ?? undefined,
          instagramHandle: profile.instagramHandle ?? undefined,
          tiktokHandle: profile.tiktokHandle ?? null,
          youtubeHandle: profile.youtubeHandle ?? null,
          contactPhone: profile.contactPhone ?? null,
          specialties: profile.specialties,
          experience: profile.experience,
          clientsTrained: profile.clientsTrained ?? null,
          certifications: profile.certifications,
          priceTier: profile.priceTier ?? undefined,
          hourlyRate: profile.hourlyRate ?? undefined,
          acceptsInPerson: profile.acceptsInPerson,
          acceptsOnline: profile.acceptsOnline,
          replyFromEmail: profile.replyFromEmail ?? null,
          replyFromName: profile.replyFromName ?? null,
          // Strip any empty rows before sending — the API's Zod schema
          // requires min(1) lengths on strings inside JSON arrays.
          quickFacts: profile.quickFacts.filter(
            (f) => f.label.trim() && f.value.trim(),
          ),
          pillars: profile.pillars.filter(
            (p) => p.title.trim() && p.description.trim(),
          ),
          gallery: profile.gallery.filter((g) => g.trim().length > 0),
          services: profile.services.filter(
            (s) => s.title.trim() && s.description.trim() && s.price.trim() && s.cta.trim(),
          ),
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
      {/* Primary action row — pinned at the top so the "Profile saved"
          banner is visible right after tapping Save. Old placement at the
          bottom meant trainers saved and never saw the confirmation because
          the banner lived above ~1500px of form. */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          flexWrap: 'wrap',
          position: 'sticky',
          top: 0,
          zIndex: 2,
          padding: '10px 0',
          background: 'var(--mf-bg)',
          borderBottom: '1px solid var(--mf-hairline)',
        }}
      >
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="mf-btn mf-btn-primary"
          style={{ height: 40, padding: '0 20px' }}
        >
          {saving ? 'Saving…' : 'Save profile'}
        </button>
        <button
          type="button"
          onClick={togglePublish}
          disabled={!canPublish && !profile.trainerIsPublic}
          className="mf-btn"
          style={{ height: 40, padding: '0 16px' }}
          title={
            !canPublish && !profile.trainerIsPublic
              ? 'Fill photo + bio + specialties + location first'
              : undefined
          }
        >
          {profile.trainerIsPublic
            ? '● Public — click to hide'
            : '○ Private — click to publish'}
        </button>
        <a
          href="/trainer/settings"
          className="mf-btn"
          style={{
            height: 40,
            padding: '0 14px',
            marginLeft: 'auto',
            fontSize: 12,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          ← Back to Settings
        </a>
      </div>

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

      <div
        className="xl:grid-cols-[minmax(0,720px)_320px]"
        style={{ display: 'grid', gap: 24, alignItems: 'start' }}
      >
        <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
          <Section id="section-photo" title="PUBLIC PHOTO">
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
                if (f) setCropper({ kind: 'photo', file: f });
                e.target.value = '';
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

      <Section id="section-cover" title="COVER IMAGE (optional)">
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div
            style={{
              width: 220,
              height: 120,
              borderRadius: 6,
              background: 'var(--mf-surface-2)',
              border: '1px solid var(--mf-hairline)',
              backgroundImage: profile.coverImageUrl
                ? `url(${profile.coverImageUrl})`
                : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              flexShrink: 0,
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setCropper({ kind: 'cover', file: f });
                e.target.value = '';
              }}
            />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="mf-btn"
                onClick={() => coverInputRef.current?.click()}
                disabled={coverUploading}
              >
                {coverUploading
                  ? 'Uploading…'
                  : profile.coverImageUrl
                    ? 'Replace cover'
                    : 'Upload cover'}
              </button>
              {profile.coverImageUrl ? (
                <button
                  type="button"
                  className="mf-btn"
                  onClick={removeCover}
                  disabled={coverUploading}
                >
                  Remove
                </button>
              ) : null}
            </div>
            <div className="mf-fg-dim" style={{ fontSize: 11 }}>
              JPEG, PNG, or WebP · Max 8 MB · wide landscape (3:1 or wider) looks best.
              Leave blank to use the editorial gradient placeholder.
            </div>
          </div>
        </div>
      </Section>

      <Section id="section-headline" title="HEADLINE (one sentence shown under your name)">
        <input
          className="mf-input"
          placeholder="Strength coach helping busy professionals get lean."
          value={profile.headline ?? ''}
          onChange={(e) => update('headline', e.target.value)}
          maxLength={200}
        />
      </Section>

      <Section id="section-location" title="LOCATION">
        <input
          className="mf-input"
          placeholder="Fresno, CA · The Iron Office"
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

      <Section title="TIKTOK">
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
            value={profile.tiktokHandle ?? ''}
            onChange={(e) =>
              update(
                'tiktokHandle',
                e.target.value.replace(/^@/, '').replace(/[^A-Za-z0-9._-]/g, ''),
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

      <Section title="YOUTUBE">
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
            placeholder="channelname"
            value={profile.youtubeHandle ?? ''}
            onChange={(e) =>
              update(
                'youtubeHandle',
                e.target.value.replace(/^@/, '').replace(/[^A-Za-z0-9._-]/g, ''),
              )
            }
            maxLength={60}
            style={{
              border: 'none',
              background: 'transparent',
              padding: '10px 0',
              flex: 1,
            }}
          />
        </div>
      </Section>

      <Section title="CONTACT PHONE (shown on your apply page)">
        <input
          type="tel"
          className="mf-input"
          placeholder="(559) 365-2946"
          value={profile.contactPhone ?? ''}
          onChange={(e) => update('contactPhone', e.target.value)}
          maxLength={32}
        />
        <div className="mf-fg-dim" style={{ fontSize: 11, marginTop: 6 }}>
          Leave blank to hide the FASTEST REPLY card. Applicants see this
          number as a one-tap SMS link on your /apply page.
        </div>
      </Section>

      <Section title="REPLY-TO EMAIL (optional)">
        <input
          type="email"
          className="mf-input"
          placeholder="coach@yourdomain.com"
          value={profile.replyFromEmail ?? ''}
          onChange={(e) => update('replyFromEmail', e.target.value)}
          maxLength={200}
        />
        <div className="mf-fg-dim" style={{ fontSize: 11, marginTop: 6 }}>
          When a new applicant fills your /apply form, your notification
          email has Reply-To set to this address so hitting Reply sends to
          you directly. Leave blank to use your account email.
        </div>
      </Section>

      <Section title="REPLY-FROM NAME (optional)">
        <input
          type="text"
          className="mf-input"
          placeholder="Coach John · Example Fitness"
          value={profile.replyFromName ?? ''}
          onChange={(e) => update('replyFromName', e.target.value)}
          maxLength={120}
        />
      </Section>

      <Section id="section-bio" title="BIO (max 500 chars)">
        <textarea
          className="mf-input"
          rows={4}
          value={profile.bio ?? ''}
          onChange={(e) => update('bio', e.target.value)}
          maxLength={500}
        />
      </Section>

      <Section id="section-specialties" title="SPECIALTIES (up to 5)">
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

      <Section title="CLIENTS TRAINED (lifetime, optional)">
        <input
          type="number"
          className="mf-input"
          min={0}
          max={100000}
          placeholder="e.g. 212"
          value={profile.clientsTrained ?? ''}
          onChange={(e) =>
            update(
              'clientsTrained',
              e.target.value === '' ? null : Math.max(0, Math.min(100000, Number(e.target.value) || 0)),
            )
          }
        />
        <div className="mf-fg-dim" style={{ fontSize: 11, marginTop: 6 }}>
          Marketing copy number shown on your profile stat strip. Leave blank to hide that tile.
        </div>
      </Section>

      <Section id="section-quick-facts" title="QUICK FACTS · sidebar bullet points">
        <div className="mf-fg-dim" style={{ fontSize: 11, marginBottom: 10 }}>
          Short facts that show in the sidebar of your profile — one small
          heading plus a detail per row. Example: <b>EXPERIENCE</b> · 10+ years.
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          {profile.quickFacts.map((f, i) => (
            <div
              key={i}
              style={{ display: 'grid', gridTemplateColumns: '140px 1fr auto', gap: 6 }}
            >
              <input
                className="mf-input"
                placeholder="Heading (e.g. EXPERIENCE)"
                value={f.label}
                onChange={(e) => updateQuickFact(i, 'label', e.target.value.toUpperCase())}
                maxLength={40}
              />
              <input
                className="mf-input"
                placeholder="Detail (e.g. 10+ years)"
                value={f.value}
                onChange={(e) => updateQuickFact(i, 'value', e.target.value)}
                maxLength={200}
              />
              <button
                type="button"
                className="mf-btn"
                onClick={() => removeQuickFact(i)}
                style={{ height: 40, width: 40, padding: 0 }}
                aria-label="Remove fact"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="mf-btn"
          onClick={addQuickFact}
          disabled={profile.quickFacts.length >= 12}
          style={{ marginTop: 8 }}
        >
          + Add fact
        </button>
      </Section>

      <Section id="section-pillars" title="APPROACH PILLARS · up to 6 cards on your profile">
        <div className="mf-fg-dim" style={{ fontSize: 11, marginBottom: 10 }}>
          The core things you focus on with clients. Each card has a title,
          a small icon, and a short description.
        </div>
        <div style={{ display: 'grid', gap: 10 }}>
          {profile.pillars.map((p, i) => (
            <div
              key={i}
              className="mf-card"
              style={{ padding: 12, display: 'grid', gap: 6 }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px auto', gap: 6 }}>
                <input
                  className="mf-input"
                  placeholder="Title (e.g. Progressive Overload)"
                  value={p.title}
                  onChange={(e) => updatePillar(i, 'title', e.target.value)}
                  maxLength={60}
                />
                <select
                  className="mf-input"
                  value={p.icon}
                  onChange={(e) => updatePillar(i, 'icon', e.target.value)}
                  aria-label="Icon shown on this card"
                  title="Icon shown on this card"
                >
                  {PILLAR_ICONS.map((ic) => (
                    <option key={ic.value} value={ic.value}>
                      Icon · {ic.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="mf-btn"
                  onClick={() => removePillar(i)}
                  style={{ height: 40, width: 40, padding: 0 }}
                  aria-label="Remove pillar"
                >
                  ×
                </button>
              </div>
              <textarea
                className="mf-input"
                rows={2}
                placeholder="Short description (what this means in practice)"
                value={p.description}
                onChange={(e) => updatePillar(i, 'description', e.target.value)}
                maxLength={280}
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          className="mf-btn"
          onClick={addPillar}
          disabled={profile.pillars.length >= 6}
          style={{ marginTop: 8 }}
        >
          + Add pillar
        </button>
      </Section>

      <Section id="section-gallery" title={`GALLERY (${profile.gallery.length}/30)`}>
        <div className="mf-fg-dim" style={{ fontSize: 11, marginBottom: 12 }}>
          Upload photos of your training sessions, facility, competitions,
          or athletes. Each image saves to your gallery instantly.
        </div>

        <input
          ref={galleryInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setCropper({ kind: 'gallery', file: f });
            e.target.value = '';
          }}
        />

        {profile.gallery.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: 8,
              marginBottom: 12,
            }}
          >
            {profile.gallery.map((g, i) => {
              const isUrl = /^https?:\/\//i.test(g) || g.startsWith('/');
              return (
                <div
                  key={`${g}-${i}`}
                  style={{
                    position: 'relative',
                    aspectRatio: '1 / 1',
                    borderRadius: 6,
                    overflow: 'hidden',
                    background: 'var(--mf-surface-3)',
                    backgroundImage: isUrl ? `url(${g})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    border: '1px solid var(--mf-hairline)',
                  }}
                >
                  {!isUrl ? (
                    <div
                      className="mf-font-mono mf-fg-mute"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'flex-end',
                        padding: 8,
                        fontSize: 10,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {g}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => deleteGalleryEntry(g)}
                    aria-label="Remove image"
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: 'rgba(10,10,11,0.75)',
                      color: 'var(--mf-fg)',
                      border: '1px solid var(--mf-hairline-strong)',
                      cursor: 'pointer',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 16,
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        ) : null}

        <button
          type="button"
          className="mf-btn"
          onClick={() => galleryInputRef.current?.click()}
          disabled={galleryUploading || profile.gallery.length >= 30}
        >
          {galleryUploading
            ? 'Uploading…'
            : profile.gallery.length >= 30
              ? 'Gallery full'
              : '+ Upload image'}
        </button>
      </Section>

      <Section id="section-services" title="SERVICES & PRICING · up to 8 cards">
        <div className="mf-fg-dim" style={{ fontSize: 11, marginBottom: 10 }}>
          Each card is one thing clients can buy from you — for example
          &ldquo;1:1 Online Coaching · $249 per month · Apply.&rdquo;
        </div>
        <div style={{ display: 'grid', gap: 10 }}>
          {profile.services.map((s, i) => (
            <div
              key={i}
              className="mf-card"
              style={{ padding: 12, display: 'grid', gap: 6 }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 6 }}>
                <input
                  className="mf-input"
                  placeholder="Service name (e.g. 1:1 Online Coaching)"
                  value={s.title}
                  onChange={(e) => updateService(i, 'title', e.target.value)}
                  maxLength={60}
                />
                <button
                  type="button"
                  className="mf-btn"
                  onClick={() => removeService(i)}
                  style={{ height: 40, width: 40, padding: 0 }}
                  aria-label="Remove service"
                >
                  ×
                </button>
              </div>
              <textarea
                className="mf-input"
                rows={2}
                placeholder="Short description of what's included"
                value={s.description}
                onChange={(e) => updateService(i, 'description', e.target.value)}
                maxLength={280}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                <input
                  className="mf-input"
                  placeholder="Price (e.g. $249)"
                  value={s.price}
                  onChange={(e) => updateService(i, 'price', e.target.value)}
                  maxLength={24}
                />
                <input
                  className="mf-input"
                  placeholder="How often (e.g. per month)"
                  title="How often they pay this — per month, per session, one-time, etc. Leave blank for flat pricing."
                  value={s.per}
                  onChange={(e) => updateService(i, 'per', e.target.value)}
                  maxLength={24}
                />
                <input
                  className="mf-input"
                  placeholder="Button text (e.g. Apply)"
                  title="The text on the button clients tap to start this service"
                  value={s.cta}
                  onChange={(e) => updateService(i, 'cta', e.target.value)}
                  maxLength={24}
                />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={s.featured}
                  onChange={(e) => updateService(i, 'featured', e.target.checked)}
                />
                Highlight this one as &ldquo;Most popular&rdquo; (adds an accent border)
              </label>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="mf-btn"
          onClick={addService}
          disabled={profile.services.length >= 8}
          style={{ marginTop: 8 }}
        >
          + Add service
        </button>
      </Section>

      <Section id="section-certifications" title="CERTIFICATIONS">
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
        </div>

        <aside
          className="hidden xl:block"
          style={{ position: 'sticky', top: 80, alignSelf: 'start' }}
        >
          <div style={{ display: 'grid', gap: 16 }}>
            <ProfilePreviewCard profile={profile} />
            <CompletionChecklistCard profile={profile} />
          </div>
        </aside>
      </div>

      <ImageCropperModal
        file={cropper?.file ?? null}
        aspect={
          cropper?.kind === 'cover' ? 3 : cropper?.kind === 'gallery' ? 1 : 4 / 5
        }
        shape={cropper?.kind === 'photo' ? 'round' : 'rect'}
        title={
          cropper?.kind === 'cover'
            ? 'Crop cover image'
            : cropper?.kind === 'gallery'
              ? 'Crop gallery image'
              : 'Crop profile photo'
        }
        outputMaxDim={cropper?.kind === 'cover' ? 2000 : 1200}
        onClose={() => setCropper(null)}
        onConfirm={(cropped) => {
          const kind = cropper?.kind;
          setCropper(null);
          if (kind === 'photo') uploadPhoto(cropped);
          else if (kind === 'cover') uploadCover(cropped);
          else if (kind === 'gallery') uploadGalleryImage(cropped);
        }}
      />

      {/* Save + publish live in the sticky header at the top of this view
          so the "Profile saved" banner is always in view after tapping. */}
    </div>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      className="mf-card"
      // scrollMarginTop keeps the section's title visible below the sticky
      // save row when the checklist smooth-scrolls us to this anchor.
      style={{ padding: 16, scrollMarginTop: 96 }}
    >
      <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Right-rail cards
// ──────────────────────────────────────────────────────────────────────────

interface ChecklistItem {
  key: string;
  label: string;
  done: boolean;
  /** id of the <Section> to smooth-scroll to when the row is clicked. */
  sectionId: string;
}

function CompletionChecklistCard({ profile }: { profile: TrainerProfile }) {
  const required: ChecklistItem[] = [
    { key: 'photo', label: 'Public photo', done: !!profile.photoUrl, sectionId: 'section-photo' },
    { key: 'bio', label: 'Bio', done: !!profile.bio && profile.bio.trim().length > 0, sectionId: 'section-bio' },
    { key: 'specialties', label: 'Specialties', done: profile.specialties.length > 0, sectionId: 'section-specialties' },
    { key: 'location', label: 'Location', done: !!profile.location && profile.location.trim().length > 0, sectionId: 'section-location' },
  ];

  const recommended: ChecklistItem[] = [
    { key: 'cover', label: 'Cover image', done: !!profile.coverImageUrl, sectionId: 'section-cover' },
    { key: 'headline', label: 'Headline', done: !!profile.headline && profile.headline.trim().length > 0, sectionId: 'section-headline' },
    { key: 'quickFacts', label: 'At least one quick fact', done: profile.quickFacts.length > 0, sectionId: 'section-quick-facts' },
    { key: 'pillars', label: 'At least one approach pillar', done: profile.pillars.length > 0, sectionId: 'section-pillars' },
    { key: 'services', label: 'At least one service', done: profile.services.length > 0, sectionId: 'section-services' },
    { key: 'certifications', label: 'At least one certification', done: profile.certifications.length > 0, sectionId: 'section-certifications' },
    { key: 'gallery', label: 'At least one gallery image', done: profile.gallery.length > 0, sectionId: 'section-gallery' },
  ];

  const requiredDone = required.filter((r) => r.done).length;

  function jumpTo(sectionId: string) {
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="mf-card" style={{ padding: 14 }}>
      <div
        className="mf-eyebrow"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <span>Checklist</span>
        <span className="mf-fg-dim mf-font-mono" style={{ fontSize: 10 }}>
          {requiredDone} / {required.length} required
        </span>
      </div>

      <div
        className="mf-fg-dim mf-font-mono"
        style={{ fontSize: 9, letterSpacing: '0.08em', marginBottom: 6 }}
      >
        REQUIRED TO PUBLISH
      </div>
      <div style={{ display: 'grid', gap: 2, marginBottom: 12 }}>
        {required.map((item) => (
          <ChecklistRow key={item.key} item={item} onJump={jumpTo} />
        ))}
      </div>

      <div
        className="mf-fg-dim mf-font-mono"
        style={{ fontSize: 9, letterSpacing: '0.08em', marginBottom: 6 }}
      >
        RECOMMENDED
      </div>
      <div style={{ display: 'grid', gap: 2 }}>
        {recommended.map((item) => (
          <ChecklistRow key={item.key} item={item} onJump={jumpTo} />
        ))}
      </div>
    </div>
  );
}

function ChecklistRow({
  item,
  onJump,
}: {
  item: ChecklistItem;
  onJump: (sectionId: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onJump(item.sectionId)}
      className="focus-ring"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '6px 8px',
        background: 'transparent',
        border: 'none',
        borderRadius: 4,
        cursor: 'pointer',
        textAlign: 'left',
        fontSize: 12,
        color: item.done ? 'var(--mf-fg)' : 'var(--mf-fg-dim)',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 14,
          display: 'inline-flex',
          justifyContent: 'center',
          color: item.done ? '#86efac' : 'var(--mf-fg-mute)',
          fontSize: 12,
        }}
      >
        {item.done ? '✓' : '–'}
      </span>
      <span style={{ flex: 1 }}>{item.label}</span>
    </button>
  );
}

function ProfilePreviewCard({ profile }: { profile: TrainerProfile }) {
  const headline = profile.headline?.trim() || null;
  const location = profile.location?.trim() || null;
  const specialties = profile.specialties.slice(0, 3);
  const quickFacts = profile.quickFacts.filter((f) => f.label.trim() && f.value.trim()).slice(0, 3);
  const pillarTitles = profile.pillars.map((p) => p.title.trim()).filter(Boolean).slice(0, 3);
  const services = profile.services.slice(0, 2);

  const placeholderStyle: React.CSSProperties = {
    fontStyle: 'italic',
    color: 'var(--mf-fg-mute)',
  };

  return (
    // maxHeight + overflow act as a belt-and-braces cap — data is already
    // sliced (3 specialties / 3 quick facts / 3 pillars / 2 services) so
    // the card tops out in normal use, but an unusually long headline or
    // quick-fact value could still overshoot; hide rather than let the
    // rail grow past the viewport.
    <div className="mf-card" style={{ padding: 14, maxHeight: 520, overflow: 'hidden' }}>
      <div className="mf-eyebrow" style={{ marginBottom: 10 }}>
        Live preview
      </div>

      {/* Header row — photo + headline + location */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
        <div
          style={{
            width: 60,
            height: 75,
            flexShrink: 0,
            borderRadius: 4,
            background: 'var(--mf-surface-2)',
            border: '1px solid var(--mf-hairline)',
            backgroundImage: profile.photoUrl ? `url(${profile.photoUrl})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
          aria-label={profile.photoUrl ? 'Profile photo' : 'No profile photo yet'}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className="mf-font-display"
            style={{
              fontSize: 13,
              lineHeight: 1.25,
              ...(headline ? null : placeholderStyle),
            }}
          >
            {headline ?? 'Add a headline'}
          </div>
          <div
            className="mf-fg-dim"
            style={{ fontSize: 11, marginTop: 4, ...(location ? null : placeholderStyle) }}
          >
            {location ?? 'Add a location'}
          </div>
        </div>
      </div>

      {/* Specialty chips */}
      <div style={{ marginBottom: 10 }}>
        {specialties.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {specialties.map((s) => (
              <SpecialtyChip key={s}>{s}</SpecialtyChip>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 11, ...placeholderStyle }}>Add a specialty</div>
        )}
      </div>

      {/* Quick facts */}
      <PreviewBlock label="Quick facts">
        {quickFacts.length > 0 ? (
          <div style={{ display: 'grid', gap: 3 }}>
            {quickFacts.map((f, i) => (
              <div key={i} className="mf-font-mono" style={{ fontSize: 10, lineHeight: 1.4 }}>
                <span className="mf-fg-dim">{f.label}</span>
                <span className="mf-fg-mute"> · </span>
                <span>{f.value}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 11, ...placeholderStyle }}>Add a quick fact</div>
        )}
      </PreviewBlock>

      {/* Pillars */}
      <PreviewBlock label="Pillars">
        {pillarTitles.length > 0 ? (
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, lineHeight: 1.5 }}>
            {pillarTitles.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        ) : (
          <div style={{ fontSize: 11, ...placeholderStyle }}>Add an approach pillar</div>
        )}
      </PreviewBlock>

      {/* Services */}
      <PreviewBlock label="Services" last>
        {services.length > 0 ? (
          <div style={{ display: 'grid', gap: 4 }}>
            {services.map((s, i) => (
              <div key={i} style={{ fontSize: 11, lineHeight: 1.4 }}>
                <span>{s.title.trim() || 'Untitled'}</span>
                {s.price.trim() ? (
                  <span className="mf-fg-dim">
                    {' — '}
                    {s.price}
                    {s.per.trim() ? ` ${s.per}` : ''}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 11, ...placeholderStyle }}>Add a service</div>
        )}
      </PreviewBlock>
    </div>
  );
}

function PreviewBlock({
  label,
  children,
  last,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      style={{
        paddingTop: 8,
        paddingBottom: last ? 0 : 8,
        borderTop: '1px solid var(--mf-hairline)',
      }}
    >
      <div
        className="mf-fg-dim mf-font-mono"
        style={{ fontSize: 9, letterSpacing: '0.08em', marginBottom: 4 }}
      >
        {label.toUpperCase()}
      </div>
      {children}
    </div>
  );
}
