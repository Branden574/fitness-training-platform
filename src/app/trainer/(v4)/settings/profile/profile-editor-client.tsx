'use client';

import { useEffect, useRef, useState } from 'react';
import { Shield } from 'lucide-react';
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
  trainerSlug: string | null;
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

// Section keys are also used by the checklist as click targets, so they're
// stable identifiers — DO NOT rename without updating CompletionChecklist.
type SectionKey =
  | 'basics'
  | 'social'
  | 'about'
  | 'facts'
  | 'pillars'
  | 'gallery'
  | 'services'
  | 'certs';

interface NavItem {
  key: SectionKey;
  label: string;
  summary: string;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'basics', label: 'Basics', summary: 'Photo · Cover · Headline · Location' },
  { key: 'social', label: 'Social & Reply', summary: 'IG · TikTok · YouTube · Phone · Reply-to' },
  { key: 'about', label: 'About', summary: 'Bio · Specialties · Experience' },
  { key: 'facts', label: 'Quick Facts', summary: 'Sidebar bullets' },
  { key: 'pillars', label: 'Approach Pillars', summary: 'Up to 6 cards' },
  { key: 'gallery', label: 'Gallery', summary: 'Up to 30 images' },
  { key: 'services', label: 'Services & Pricing', summary: 'Cards · tier · rate · modes' },
  { key: 'certs', label: 'Credentials', summary: 'Certifications' },
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
  const [active, setActive] = useState<SectionKey>('basics');
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
            trainerSlug: data.trainerSlug ?? null,
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
        trainerSlug: null,
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
    !!profile.photoUrl &&
    !!profile.bio &&
    profile.specialties.length > 0 &&
    !!profile.location;

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

  // Completion items drive both the left rail's progress + the right rail's
  // checklist. Each item knows which section it belongs to so clicking a
  // checklist row jumps to the right pane.
  const required: ChecklistItem[] = [
    { key: 'photo', label: 'Public photo', done: !!profile.photoUrl, section: 'basics', required: true },
    { key: 'bio', label: 'Bio', done: !!profile.bio && profile.bio.trim().length > 0, section: 'about', required: true },
    { key: 'specialties', label: 'Specialties', done: profile.specialties.length > 0, section: 'about', required: true },
    { key: 'location', label: 'Location', done: !!profile.location && profile.location.trim().length > 0, section: 'basics', required: true },
  ];
  const recommended: ChecklistItem[] = [
    { key: 'cover', label: 'Cover image', done: !!profile.coverImageUrl, section: 'basics', required: false },
    { key: 'headline', label: 'Headline', done: !!profile.headline && profile.headline.trim().length > 0, section: 'basics', required: false },
    { key: 'quickFacts', label: 'At least one quick fact', done: profile.quickFacts.length > 0, section: 'facts', required: false },
    { key: 'pillars', label: 'At least one approach pillar', done: profile.pillars.length > 0, section: 'pillars', required: false },
    { key: 'services', label: 'At least one service', done: profile.services.length > 0, section: 'services', required: false },
    { key: 'certifications', label: 'At least one certification', done: profile.certifications.length > 0, section: 'certs', required: false },
    { key: 'gallery', label: 'At least one gallery image', done: profile.gallery.length > 0, section: 'gallery', required: false },
  ];
  const allItems = [...required, ...recommended];
  const reqDone = required.filter((r) => r.done).length;
  const reqTotal = required.length;
  const totalDone = allItems.filter((i) => i.done).length;
  const totalPct = Math.round((totalDone / allItems.length) * 100);

  // Shared props bundle so every section component reads from one place.
  const ctx: SectionCtx = {
    profile,
    update,
    photoInputRef,
    coverInputRef,
    galleryInputRef,
    coverUploading,
    galleryUploading,
    setCropper,
    removeCover,
    deleteGalleryEntry,
    specialtyInput,
    setSpecialtyInput,
    specialtyHints,
    addSpecialty,
    removeSpecialty,
    certInput,
    setCertInput,
    addCert,
    removeCert,
    addQuickFact,
    updateQuickFact,
    removeQuickFact,
    addPillar,
    updatePillar,
    removePillar,
    addService,
    updateService,
    removeService,
  };

  return (
    <div className="mf-profile-editor">
      {/* Top bar — pinned to the top of the page so Save / Publish / Back are
          always reachable regardless of which section is active. The banner
          stack sits beneath it so "Profile saved" is visible after tapping. */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          justifyContent: 'flex-end',
          flexWrap: 'wrap',
          position: 'sticky',
          top: 0,
          zIndex: 5,
          padding: '10px 0',
          background: 'var(--mf-bg)',
          borderBottom: '1px solid var(--mf-hairline)',
          marginBottom: 16,
        }}
      >
        {/* Back to Settings was here in the previous design but the breadcrumb
            (TRAINER / SETTINGS / PROFILE) and the SubNav strip above the
            editor both already handle that affordance — keep this row focused
            on Save + Publish so the action surface is tight. The button group
            now right-aligns via justify-content on the parent. */}
        <button
          type="button"
          onClick={togglePublish}
          disabled={!canPublish && !profile.trainerIsPublic}
          className="mf-btn"
          style={{
            height: 40,
            padding: '0 16px',
            borderColor: profile.trainerIsPublic
              ? 'var(--mf-green, #2BD985)'
              : 'var(--mf-hairline-strong)',
            color: profile.trainerIsPublic
              ? 'var(--mf-green, #2BD985)'
              : 'var(--mf-fg)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
          title={
            !canPublish && !profile.trainerIsPublic
              ? 'Fill photo + bio + specialties + location first'
              : undefined
          }
        >
          <span
            aria-hidden="true"
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: profile.trainerIsPublic
                ? 'var(--mf-green, #2BD985)'
                : 'var(--mf-fg-mute)',
              display: 'inline-block',
            }}
          />
          {profile.trainerIsPublic
            ? 'Public — click to hide'
            : 'Private — click to publish'}
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="mf-btn mf-btn-primary"
          style={{ height: 40, padding: '0 20px' }}
        >
          {saving ? 'Saving…' : 'Save profile'}
        </button>
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
            marginBottom: 16,
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
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {/* Mobile section picker — under sm we drop to a single column with a
          select instead of the left rail. */}
      <div className="mf-profile-mobile-nav" style={{ marginBottom: 12 }}>
        <select
          className="mf-input"
          value={active}
          onChange={(e) => setActive(e.target.value as SectionKey)}
          aria-label="Jump to section"
        >
          {NAV_ITEMS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* 3-pane shell */}
      <div className="mf-profile-shell">
        {/* LEFT: section nav (≥md). Below md, hidden in favor of the select. */}
        <aside className="mf-profile-nav" aria-label="Profile sections">
          <div style={{ padding: '4px 4px 12px' }}>
            <div className="mf-eyebrow" style={{ marginBottom: 6 }}>
              SECTIONS
            </div>
            <div
              className="mf-fg-dim mf-font-mono"
              style={{ fontSize: 10, letterSpacing: '0.08em', marginBottom: 8 }}
            >
              {reqDone}/{reqTotal} REQUIRED · {profile.trainerIsPublic ? 'LIVE' : 'DRAFT'}
            </div>
            <div
              style={{
                width: '100%',
                height: 4,
                borderRadius: 999,
                background: 'var(--mf-surface-3)',
                overflow: 'hidden',
                marginBottom: 4,
              }}
              aria-label={`Profile completion ${totalPct}%`}
            >
              <div
                style={{
                  height: '100%',
                  width: `${totalPct}%`,
                  background: 'var(--mf-accent)',
                  transition: 'width 200ms ease',
                }}
              />
            </div>
            <div
              className="mf-fg-dim mf-font-mono"
              style={{ fontSize: 9, letterSpacing: '0.08em' }}
            >
              {totalDone}/{allItems.length} TOTAL
            </div>
          </div>

          <nav
            className="mf-profile-nav-list"
            style={{ padding: '0 4px 8px' }}
          >
            {NAV_ITEMS.map((s) => {
              const sel = active === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setActive(s.key)}
                  className="focus-ring mf-profile-nav-btn"
                  data-active={sel || undefined}
                  style={{
                    position: 'relative',
                    textAlign: 'left',
                    padding: '8px 10px',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    background: sel ? 'var(--mf-surface-3)' : 'transparent',
                    color: sel ? 'var(--mf-fg)' : 'var(--mf-fg-dim)',
                  }}
                >
                  {sel && (
                    <span
                      aria-hidden="true"
                      className="mf-profile-nav-tick"
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 6,
                        bottom: 6,
                        width: 4,
                        background: 'var(--mf-accent)',
                        borderRadius: 2,
                      }}
                    />
                  )}
                  <div style={{ fontSize: 13, lineHeight: 1.25 }}>{s.label}</div>
                  <div
                    className="mf-fg-mute mf-font-mono mf-profile-nav-summary"
                    style={{
                      fontSize: 9,
                      letterSpacing: '0.06em',
                      marginTop: 2,
                      lineHeight: 1.3,
                    }}
                  >
                    {s.summary}
                  </div>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* CENTER: only the active section renders. State lives at the parent
            so unmounting the inactive panes does not destroy any inputs. */}
        <div className="mf-profile-center">
          {active === 'basics' && <BasicsSection ctx={ctx} />}
          {active === 'social' && <SocialSection ctx={ctx} />}
          {active === 'about' && <AboutSection ctx={ctx} />}
          {active === 'facts' && <FactsSection ctx={ctx} />}
          {active === 'pillars' && <PillarsSection ctx={ctx} />}
          {active === 'gallery' && <GallerySection ctx={ctx} />}
          {active === 'services' && <ServicesSection ctx={ctx} />}
          {active === 'certs' && <CertsSection ctx={ctx} />}
        </div>

        {/* RIGHT: live preview + checklist + share + activity */}
        <aside className="mf-profile-rail">
          <div style={{ display: 'grid', gap: 16 }}>
            <ProfilePreviewCard profile={profile} />
            <CompletionChecklistCard
              required={required}
              recommended={recommended}
              reqDone={reqDone}
              reqTotal={reqTotal}
              onJump={(s) => setActive(s)}
            />
            <ShareCard profile={profile} />
            <ActivityCard />
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

      {/* Inline media-query rules — match the same pattern used by the
          settings dashboard. Keeps the responsive logic colocated with the
          markup that needs it. */}
      <style>{`
        .mf-profile-editor { display: block; }
        .mf-profile-shell {
          display: grid;
          gap: 16px;
          grid-template-columns: 1fr;
          align-items: start;
        }
        .mf-profile-nav { display: none; }
        .mf-profile-rail { display: block; }
        .mf-profile-mobile-nav { display: block; }
        .mf-profile-center { min-width: 0; }

        /* 12-col grid used inside section cards. Below md it falls back to
           single column so every Field row stacks on phones. */
        .mf-pf-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        .mf-pf-span-3, .mf-pf-span-4, .mf-pf-span-5,
        .mf-pf-span-6, .mf-pf-span-7, .mf-pf-span-8,
        .mf-pf-span-12 { grid-column: span 1; }

        @media (min-width: 640px) {
          .mf-pf-grid { grid-template-columns: repeat(12, minmax(0, 1fr)); }
          .mf-pf-span-3 { grid-column: span 3; }
          .mf-pf-span-4 { grid-column: span 4; }
          .mf-pf-span-5 { grid-column: span 5; }
          .mf-pf-span-6 { grid-column: span 6; }
          .mf-pf-span-7 { grid-column: span 7; }
          .mf-pf-span-8 { grid-column: span 8; }
          .mf-pf-span-12 { grid-column: span 12; }
        }

        /* Default nav-list layout (vertical column). Below md the rail itself
           is hidden in favor of the mobile select. */
        .mf-profile-nav-list {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .mf-profile-nav-btn { width: 100%; }

        /* md (768-1023): show the rail as a horizontal section tab strip
           above the center pane. Hide per-tab summaries, collapse the
           progress meter into a compact strip. */
        @media (min-width: 768px) {
          .mf-profile-mobile-nav { display: none; }
          .mf-profile-nav {
            display: block;
            border: 1px solid var(--mf-hairline);
            border-radius: 4px;
            background: var(--mf-surface-1);
            padding: 8px 8px 4px;
          }
          .mf-profile-nav-list {
            flex-direction: row;
            flex-wrap: wrap;
            gap: 4px;
          }
          .mf-profile-nav-btn { width: auto; padding: 6px 12px !important; }
          .mf-profile-nav-summary { display: none; }
          .mf-profile-nav-tick { display: none; }
          .mf-profile-nav-btn[data-active] {
            background: var(--mf-accent) !important;
            color: var(--mf-accent-ink, #0A0A0B) !important;
          }
        }

        /* lg: full left rail; right rail still wraps below */
        @media (min-width: 1024px) {
          .mf-profile-shell {
            grid-template-columns: 200px minmax(0, 1fr);
          }
          .mf-profile-nav {
            position: sticky;
            top: 76px;
            max-height: calc(100vh - 100px);
            overflow-y: auto;
            align-self: start;
            padding: 12px 8px;
          }
          .mf-profile-nav-list {
            flex-direction: column;
            gap: 2px;
          }
          .mf-profile-nav-btn { width: 100%; padding: 8px 10px !important; }
          .mf-profile-nav-summary { display: block; }
          .mf-profile-nav-tick { display: block; }
          /* Restore the surface-3 selection bg on lg+, override the md
             accent-bg rule so vertical nav looks like the original. */
          .mf-profile-nav-btn[data-active] {
            background: var(--mf-surface-3) !important;
            color: var(--mf-fg) !important;
          }
        }

        /* xl: full 3-pane layout */
        @media (min-width: 1280px) {
          .mf-profile-shell {
            grid-template-columns: 200px minmax(0, 1fr) 340px;
          }
          .mf-profile-rail {
            position: sticky;
            top: 76px;
            max-height: calc(100vh - 100px);
            overflow-y: auto;
            align-self: start;
          }
        }
      `}</style>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Section primitives
// ──────────────────────────────────────────────────────────────────────────

interface SectionCtx {
  profile: TrainerProfile;
  update: <K extends keyof TrainerProfile>(key: K, value: TrainerProfile[K]) => void;
  photoInputRef: React.RefObject<HTMLInputElement | null>;
  coverInputRef: React.RefObject<HTMLInputElement | null>;
  galleryInputRef: React.RefObject<HTMLInputElement | null>;
  coverUploading: boolean;
  galleryUploading: boolean;
  setCropper: (
    c:
      | { kind: 'photo'; file: File }
      | { kind: 'cover'; file: File }
      | { kind: 'gallery'; file: File }
      | null,
  ) => void;
  removeCover: () => Promise<void>;
  deleteGalleryEntry: (url: string) => Promise<void>;
  specialtyInput: string;
  setSpecialtyInput: (v: string) => void;
  specialtyHints: string[];
  addSpecialty: (raw: string) => void;
  removeSpecialty: (tag: string) => void;
  certInput: string;
  setCertInput: (v: string) => void;
  addCert: () => void;
  removeCert: (i: number) => void;
  addQuickFact: () => void;
  updateQuickFact: (i: number, field: 'label' | 'value', v: string) => void;
  removeQuickFact: (i: number) => void;
  addPillar: () => void;
  updatePillar: (i: number, field: keyof Pillar, v: string) => void;
  removePillar: (i: number) => void;
  addService: () => void;
  updateService: (i: number, field: keyof Service, v: string | boolean) => void;
  removeService: (i: number) => void;
}

function Card({
  title,
  sub,
  right,
  children,
}: {
  title: string;
  sub?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mf-card" style={{ padding: 18, marginBottom: 16 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            className="mf-font-display"
            style={{ fontSize: 15, lineHeight: 1.1, letterSpacing: '-0.01em' }}
          >
            {title}
          </div>
          {sub && (
            <div
              className="mf-fg-mute"
              style={{ fontSize: 11, marginTop: 4, lineHeight: 1.4 }}
            >
              {sub}
            </div>
          )}
        </div>
        {right ? <div style={{ flexShrink: 0 }}>{right}</div> : null}
      </div>
      {children}
    </div>
  );
}

function FieldLabel({
  children,
  hint,
}: {
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <>
      <div
        className="mf-fg-mute mf-font-mono"
        style={{
          fontSize: 9.5,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          marginBottom: 6,
        }}
      >
        {children}
      </div>
      {hint && (
        <div
          className="mf-fg-mute"
          style={{ fontSize: 10.5, marginTop: 6, lineHeight: 1.4 }}
        >
          {hint}
        </div>
      )}
    </>
  );
}

function Field({
  label,
  hint,
  span = 12,
  children,
}: {
  label: string;
  hint?: string;
  /** col span out of 12 at md:+; below md collapses to full width */
  span?: number;
  children: React.ReactNode;
}) {
  return (
    <label className={`mf-pf-field mf-pf-span-${span}`} style={{ display: 'block' }}>
      <div
        className="mf-fg-mute mf-font-mono"
        style={{
          fontSize: 9.5,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      {children}
      {hint && (
        <div
          className="mf-fg-mute"
          style={{ fontSize: 10.5, marginTop: 6, lineHeight: 1.4 }}
        >
          {hint}
        </div>
      )}
    </label>
  );
}

/** A 12-col grid that collapses to single-column under md. */
function Grid12({ children, gap = 12 }: { children: React.ReactNode; gap?: number }) {
  return (
    <div className="mf-pf-grid" style={{ gap }}>
      {children}
    </div>
  );
}

/**
 * Input with a fixed leading glyph rendered inside the input frame.
 * Used for `@` (social handles) and `$` (money fields).
 */
function PrefixInput({
  prefix,
  value,
  onChange,
  placeholder,
  maxLength,
  type,
  min,
  max,
  inputMode,
  title,
}: {
  prefix: string;
  value: string | number;
  onChange: (next: string) => void;
  placeholder?: string;
  maxLength?: number;
  type?: 'text' | 'number';
  min?: number;
  max?: number;
  inputMode?: 'text' | 'numeric' | 'decimal';
  title?: string;
}) {
  return (
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
      <span className="mf-fg-dim" style={{ fontSize: 13, flexShrink: 0 }}>
        {prefix}
      </span>
      <input
        className="mf-input"
        type={type ?? 'text'}
        inputMode={inputMode}
        min={min}
        max={max}
        title={title}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        style={{
          border: 'none',
          background: 'transparent',
          padding: '10px 0',
          flex: 1,
          minWidth: 0,
        }}
      />
    </div>
  );
}

/** `@`-prefixed input shared by IG, TikTok, YouTube. */
function HandleInput({
  value,
  onChange,
  placeholder,
  maxLength,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  maxLength: number;
}) {
  return (
    <PrefixInput
      prefix="@"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      maxLength={maxLength}
    />
  );
}

// ──────────────────────────────────────────────────────────────────────────
// 1. BASICS — photo + cover + headline + location
// ──────────────────────────────────────────────────────────────────────────

function BasicsSection({ ctx }: { ctx: SectionCtx }) {
  const { profile, update, photoInputRef, coverInputRef, coverUploading, setCropper, removeCover } = ctx;

  return (
    <>
      <Card
        title="Public photo & cover"
        sub="Your portrait + the wide hero on your /apply page. Both crop on upload."
      >
        <Grid12>
          {/* Portrait */}
          <div className="mf-pf-span-4">
            <FieldLabel>PORTRAIT · 4:5</FieldLabel>
            <div
              style={{
                width: '100%',
                aspectRatio: '4 / 5',
                borderRadius: 4,
                background: 'var(--mf-surface-2)',
                border: '1px solid var(--mf-hairline)',
                backgroundImage: profile.photoUrl ? `url(${profile.photoUrl})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
              aria-label={profile.photoUrl ? 'Profile photo' : 'No profile photo yet'}
            />
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
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button
                type="button"
                className="mf-btn"
                onClick={() => photoInputRef.current?.click()}
                style={{ flex: 1, height: 32, fontSize: 11 }}
              >
                {profile.photoUrl ? 'Replace' : 'Upload'}
              </button>
            </div>
            <div className="mf-fg-mute" style={{ fontSize: 10, marginTop: 6, lineHeight: 1.4 }}>
              JPEG / PNG / WebP · max 5 MB
            </div>
          </div>

          {/* Cover */}
          <div className="mf-pf-span-8">
            <FieldLabel>COVER · 3:1 LANDSCAPE</FieldLabel>
            <div
              style={{
                width: '100%',
                aspectRatio: '3 / 1',
                borderRadius: 6,
                background: 'var(--mf-surface-2)',
                border: '1px solid var(--mf-hairline)',
                backgroundImage: profile.coverImageUrl
                  ? `url(${profile.coverImageUrl})`
                  : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
              aria-label={profile.coverImageUrl ? 'Cover image' : 'No cover image yet'}
            />
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
            <div
              style={{
                display: 'flex',
                gap: 6,
                marginTop: 8,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                className="mf-btn"
                onClick={() => coverInputRef.current?.click()}
                disabled={coverUploading}
                style={{ height: 32, fontSize: 11, padding: '0 12px' }}
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
                  style={{ height: 32, fontSize: 11, padding: '0 12px' }}
                >
                  Remove
                </button>
              ) : null}
              <div
                className="mf-fg-mute"
                style={{ fontSize: 10, marginLeft: 'auto', lineHeight: 1.4 }}
              >
                Wide landscape works best · max 8 MB
              </div>
            </div>
          </div>
        </Grid12>
      </Card>

      <Card
        title="Headline & location"
        sub="The one sentence under your name + where you operate."
      >
        <Grid12>
          <Field
            label="Headline"
            hint="One sentence shown under your name on /apply."
            span={8}
          >
            <input
              className="mf-input"
              placeholder="Strength coach helping busy professionals get lean."
              value={profile.headline ?? ''}
              onChange={(e) => update('headline', e.target.value)}
              maxLength={200}
            />
          </Field>
          <Field label="Location" span={4}>
            <input
              className="mf-input"
              placeholder="Fresno, CA · The Iron Office"
              value={profile.location ?? ''}
              onChange={(e) => update('location', e.target.value)}
              maxLength={120}
            />
          </Field>
        </Grid12>
      </Card>
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// 2. SOCIAL & REPLY — IG · TikTok · YouTube · Phone · Reply-to · Reply-from
// ──────────────────────────────────────────────────────────────────────────

function SocialSection({ ctx }: { ctx: SectionCtx }) {
  const { profile, update } = ctx;
  return (
    <Card
      title="Social handles & contact"
      sub="Linked from your profile. Phone shows as a one-tap SMS card on /apply."
    >
      <Grid12>
        <Field label="Instagram" span={4}>
          <HandleInput
            value={profile.instagramHandle ?? ''}
            onChange={(v) =>
              update(
                'instagramHandle',
                v.replace(/^@/, '').replace(/[^A-Za-z0-9._]/g, ''),
              )
            }
            placeholder="yourhandle"
            maxLength={40}
          />
        </Field>
        <Field label="TikTok" span={4}>
          <HandleInput
            value={profile.tiktokHandle ?? ''}
            onChange={(v) =>
              update(
                'tiktokHandle',
                v.replace(/^@/, '').replace(/[^A-Za-z0-9._-]/g, ''),
              )
            }
            placeholder="yourhandle"
            maxLength={40}
          />
        </Field>
        <Field label="YouTube" span={4}>
          <HandleInput
            value={profile.youtubeHandle ?? ''}
            onChange={(v) =>
              update(
                'youtubeHandle',
                v.replace(/^@/, '').replace(/[^A-Za-z0-9._-]/g, ''),
              )
            }
            placeholder="channelname"
            maxLength={60}
          />
        </Field>
        <Field
          label="Contact phone"
          hint="Leave blank to hide the FASTEST REPLY card on your /apply page."
          span={6}
        >
          <input
            type="tel"
            className="mf-input"
            placeholder="(559) 365-2946"
            value={profile.contactPhone ?? ''}
            onChange={(e) => update('contactPhone', e.target.value)}
            maxLength={32}
          />
        </Field>
        <Field
          label="Reply-to email"
          hint="When applicants fill /apply, hitting Reply on the notification email lands here. Leave blank to use your account email."
          span={6}
        >
          <input
            type="email"
            className="mf-input"
            placeholder="coach@yourdomain.com"
            value={profile.replyFromEmail ?? ''}
            onChange={(e) => update('replyFromEmail', e.target.value)}
            maxLength={200}
          />
        </Field>
        <Field
          label="Reply-from name"
          hint="Sender name shown on automated replies."
          span={12}
        >
          <input
            type="text"
            className="mf-input"
            placeholder="Coach John · Example Fitness"
            value={profile.replyFromName ?? ''}
            onChange={(e) => update('replyFromName', e.target.value)}
            maxLength={120}
          />
        </Field>
      </Grid12>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// 3. ABOUT — bio + specialties + experience
// ──────────────────────────────────────────────────────────────────────────

function AboutSection({ ctx }: { ctx: SectionCtx }) {
  const {
    profile,
    update,
    specialtyInput,
    setSpecialtyInput,
    specialtyHints,
    addSpecialty,
    removeSpecialty,
  } = ctx;
  const bioLen = (profile.bio ?? '').length;

  return (
    <>
      <Card
        title="Bio"
        sub="Up to 500 characters. Plain text, no formatting."
        right={
          <div className="mf-fg-mute mf-font-mono" style={{ fontSize: 10 }}>
            {bioLen}/500
          </div>
        }
      >
        <textarea
          className="mf-input"
          rows={6}
          value={profile.bio ?? ''}
          onChange={(e) => update('bio', e.target.value)}
          maxLength={500}
        />
      </Card>

      <Card
        title="Specialties"
        sub="Up to 5 — these become filter tags in the public directory."
        right={
          <div className="mf-fg-mute mf-font-mono" style={{ fontSize: 10 }}>
            {profile.specialties.length}/5
          </div>
        }
      >
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
                aria-label={`Remove ${s}`}
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
      </Card>

      <Card title="Experience">
        <Grid12>
          <Field label="Years training" span={6}>
            <input
              type="number"
              className="mf-input"
              min={0}
              max={80}
              value={profile.experience}
              onChange={(e) =>
                update(
                  'experience',
                  Math.max(0, Math.min(80, Number(e.target.value) || 0)),
                )
              }
            />
          </Field>
          <Field
            label="Clients trained · lifetime"
            hint="Marketing copy number shown on your profile stat strip. Leave blank to hide that tile."
            span={6}
          >
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
                  e.target.value === ''
                    ? null
                    : Math.max(0, Math.min(100000, Number(e.target.value) || 0)),
                )
              }
            />
          </Field>
        </Grid12>
      </Card>
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// 4. QUICK FACTS — sidebar bullet rows
// ──────────────────────────────────────────────────────────────────────────

function FactsSection({ ctx }: { ctx: SectionCtx }) {
  const { profile, addQuickFact, updateQuickFact, removeQuickFact } = ctx;
  return (
    <Card
      title="Quick facts"
      sub="Sidebar bullets on your profile. One uppercase heading + one detail per row."
      right={
        <button
          type="button"
          className="mf-btn"
          onClick={addQuickFact}
          disabled={profile.quickFacts.length >= 12}
          style={{ height: 32, fontSize: 11, padding: '0 12px' }}
        >
          + Add fact
        </button>
      }
    >
      {profile.quickFacts.length === 0 ? (
        <div
          className="mf-fg-mute"
          style={{
            padding: 24,
            border: '1px dashed var(--mf-hairline)',
            borderRadius: 4,
            textAlign: 'center',
            fontSize: 12,
          }}
        >
          No quick facts yet — add one above to show as a sidebar bullet.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {profile.quickFacts.map((f, i) => (
            <div
              key={i}
              className="mf-pf-fact-row"
              style={{ display: 'grid', gap: 6 }}
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
                style={{ height: 36, width: 36, padding: 0 }}
                aria-label="Remove fact"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <style>{`
        .mf-pf-fact-row { grid-template-columns: 1fr; }
        @media (min-width: 640px) {
          .mf-pf-fact-row { grid-template-columns: 160px 1fr 36px; }
        }
      `}</style>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// 5. APPROACH PILLARS — 2-col grid of pillar cards
// ──────────────────────────────────────────────────────────────────────────

function PillarsSection({ ctx }: { ctx: SectionCtx }) {
  const { profile, addPillar, updatePillar, removePillar } = ctx;
  const canAdd = profile.pillars.length < 6;
  return (
    <Card
      title="Approach pillars"
      sub="Up to 6 cards. Each one gets a title, an icon, and a short description of what it means in practice."
      right={
        <button
          type="button"
          className="mf-btn"
          onClick={addPillar}
          disabled={!canAdd}
          style={{ height: 32, fontSize: 11, padding: '0 12px' }}
        >
          + Add pillar
        </button>
      }
    >
      <div className="mf-pf-pillars" style={{ display: 'grid', gap: 12 }}>
        {profile.pillars.map((p, i) => (
          <div
            key={i}
            style={{
              background: 'var(--mf-surface-2)',
              border: '1px solid var(--mf-hairline)',
              borderRadius: 6,
              padding: 12,
              display: 'grid',
              gap: 8,
            }}
          >
            <div
              className="mf-pf-pillar-head"
              style={{ display: 'grid', gap: 6 }}
            >
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
                style={{ height: 36, width: 36, padding: 0 }}
                aria-label="Remove pillar"
              >
                ×
              </button>
            </div>
            <textarea
              className="mf-input"
              rows={3}
              placeholder="Short description (what this means in practice)"
              value={p.description}
              onChange={(e) => updatePillar(i, 'description', e.target.value)}
              maxLength={280}
            />
          </div>
        ))}
        {canAdd && (
          <button
            type="button"
            onClick={addPillar}
            className="focus-ring"
            style={{
              border: '2px dashed var(--mf-hairline)',
              borderRadius: 6,
              padding: 24,
              background: 'transparent',
              color: 'var(--mf-fg-mute)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              minHeight: 140,
              fontSize: 12,
            }}
            aria-label="Add pillar"
          >
            <span style={{ fontSize: 22, lineHeight: 1 }}>+</span>
            Add pillar
          </button>
        )}
      </div>
      <style>{`
        .mf-pf-pillars { grid-template-columns: 1fr; }
        .mf-pf-pillar-head { grid-template-columns: 1fr 36px; }
        .mf-pf-pillar-head > select { grid-column: 1 / -1; }
        @media (min-width: 640px) {
          .mf-pf-pillar-head { grid-template-columns: 1fr 140px 36px; }
          .mf-pf-pillar-head > select { grid-column: auto; }
        }
        @media (min-width: 900px) {
          .mf-pf-pillars { grid-template-columns: 1fr 1fr; }
        }
      `}</style>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// 6. GALLERY — square thumbnails + dashed Upload tile
// ──────────────────────────────────────────────────────────────────────────

function GallerySection({ ctx }: { ctx: SectionCtx }) {
  const { profile, galleryInputRef, galleryUploading, setCropper, deleteGalleryEntry } = ctx;
  const canAdd = profile.gallery.length < 30;
  return (
    <Card
      title="Gallery"
      sub="Photos of training sessions, your facility, competitions, athletes. Each saves to your gallery instantly."
      right={
        <div className="mf-fg-mute mf-font-mono" style={{ fontSize: 10 }}>
          {profile.gallery.length}/30
        </div>
      }
    >
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
      <div
        className="mf-pf-gallery"
        style={{ display: 'grid', gap: 8, marginBottom: 10 }}
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
        {canAdd && (
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            disabled={galleryUploading}
            className="focus-ring"
            style={{
              aspectRatio: '1 / 1',
              border: '2px dashed var(--mf-hairline)',
              borderRadius: 6,
              background: 'transparent',
              color: 'var(--mf-fg-mute)',
              cursor: galleryUploading ? 'wait' : 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
            aria-label="Upload image"
          >
            <span style={{ fontSize: 22, lineHeight: 1 }}>+</span>
            <span
              className="mf-font-mono"
              style={{
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              {galleryUploading ? 'Uploading…' : 'Upload'}
            </span>
          </button>
        )}
      </div>
      <div className="mf-fg-mute" style={{ fontSize: 11, lineHeight: 1.4 }}>
        Click × to remove · auto-cropped 1:1
      </div>
      <style>{`
        .mf-pf-gallery { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        @media (min-width: 640px) {
          .mf-pf-gallery { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
        @media (min-width: 900px) {
          .mf-pf-gallery { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        }
      `}</style>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// 7. SERVICES — service rows + tier/rate/modes
// ──────────────────────────────────────────────────────────────────────────

function ServicesSection({ ctx }: { ctx: SectionCtx }) {
  const { profile, update, addService, updateService, removeService } = ctx;

  return (
    <>
      <Card
        title="Services & pricing"
        sub="Up to 8 cards — each is one thing clients can buy from you (e.g. 1:1 Online Coaching · $249 / month · Apply)."
        right={
          <button
            type="button"
            className="mf-btn"
            onClick={addService}
            disabled={profile.services.length >= 8}
            style={{ height: 32, fontSize: 11, padding: '0 12px' }}
          >
            + Add service
          </button>
        }
      >
        {profile.services.length === 0 ? (
          <div
            className="mf-fg-mute"
            style={{
              padding: 24,
              border: '1px dashed var(--mf-hairline)',
              borderRadius: 4,
              textAlign: 'center',
              fontSize: 12,
            }}
          >
            No services yet — add one to show on your profile.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {profile.services.map((s, i) => (
              <div
                key={i}
                style={{
                  background: 'var(--mf-surface-2)',
                  border: `1px solid ${s.featured ? 'var(--mf-accent)' : 'var(--mf-hairline)'}`,
                  borderRadius: 6,
                  padding: 12,
                  display: 'grid',
                  gap: 8,
                }}
              >
                <Grid12>
                  <div className="mf-pf-span-7">
                    <input
                      className="mf-input"
                      placeholder="Service name (e.g. 1:1 Online Coaching)"
                      value={s.title}
                      onChange={(e) => updateService(i, 'title', e.target.value)}
                      maxLength={60}
                    />
                  </div>
                  <div
                    className="mf-pf-span-5"
                    style={{
                      display: 'flex',
                      gap: 6,
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                    }}
                  >
                    {s.featured && (
                      <span
                        className="mf-font-mono"
                        style={{
                          padding: '3px 8px',
                          fontSize: 9,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          background: 'var(--mf-accent)',
                          color: '#0A0A0B',
                          borderRadius: 999,
                        }}
                      >
                        FEATURED
                      </span>
                    )}
                    <button
                      type="button"
                      className="mf-btn"
                      onClick={() => removeService(i)}
                      style={{ height: 36, width: 36, padding: 0 }}
                      aria-label="Remove service"
                    >
                      ×
                    </button>
                  </div>
                </Grid12>
                <textarea
                  className="mf-input"
                  rows={2}
                  placeholder="Short description of what's included"
                  value={s.description}
                  onChange={(e) => updateService(i, 'description', e.target.value)}
                  maxLength={280}
                />
                <Grid12>
                  <div className="mf-pf-span-3">
                    <PrefixInput
                      prefix="$"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      placeholder="249"
                      value={/^\d+$/.test(s.price) ? s.price : ''}
                      onChange={(next) =>
                        updateService(i, 'price', next.replace(/[^0-9]/g, '').slice(0, 24))
                      }
                      maxLength={24}
                    />
                  </div>
                  <div className="mf-pf-span-3">
                    <input
                      className="mf-input"
                      placeholder="How often (e.g. per month)"
                      title="How often they pay this — per month, per session, one-time, etc. Leave blank for flat pricing."
                      value={s.per}
                      onChange={(e) => updateService(i, 'per', e.target.value)}
                      maxLength={24}
                    />
                  </div>
                  <div className="mf-pf-span-3">
                    <input
                      className="mf-input"
                      placeholder="Button text (e.g. Apply)"
                      title="The text on the button clients tap to start this service"
                      value={s.cta}
                      onChange={(e) => updateService(i, 'cta', e.target.value)}
                      maxLength={24}
                    />
                  </div>
                  <label
                    className="mf-pf-span-3"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 12,
                      color: 'var(--mf-fg-dim)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={s.featured}
                      onChange={(e) => updateService(i, 'featured', e.target.checked)}
                    />
                    Most popular
                  </label>
                </Grid12>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Tier, rate & service modes">
        <Grid12>
          <Field label="Price tier" span={5}>
            <div
              style={{
                display: 'flex',
                padding: 4,
                borderRadius: 4,
                background: 'var(--mf-surface-2)',
                border: '1px solid var(--mf-hairline-strong)',
                gap: 4,
              }}
            >
              {TIERS.map((t) => {
                const sel = profile.priceTier === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => update('priceTier', t.value)}
                    className="mf-font-mono"
                    style={{
                      flex: 1,
                      padding: '6px 0',
                      borderRadius: 3,
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 12,
                      background: sel ? 'var(--mf-accent)' : 'transparent',
                      color: sel ? '#0A0A0B' : 'var(--mf-fg-dim)',
                      fontWeight: sel ? 600 : 400,
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="Hourly rate · USD" span={4}>
            <PrefixInput
              prefix="$"
              type="number"
              inputMode="numeric"
              min={0}
              max={10000}
              placeholder="Leave blank for 'Contact for pricing'"
              value={profile.hourlyRate ?? ''}
              onChange={(next) =>
                update('hourlyRate', next === '' ? null : Number(next))
              }
            />
          </Field>
          <Field label="Service modes" span={3}>
            <div style={{ display: 'grid', gap: 6 }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12,
                  color: 'var(--mf-fg-dim)',
                }}
              >
                <input
                  type="checkbox"
                  checked={profile.acceptsInPerson}
                  onChange={(e) => update('acceptsInPerson', e.target.checked)}
                />
                In-person
              </label>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12,
                  color: 'var(--mf-fg-dim)',
                }}
              >
                <input
                  type="checkbox"
                  checked={profile.acceptsOnline}
                  onChange={(e) => update('acceptsOnline', e.target.checked)}
                />
                Online / remote
              </label>
            </div>
          </Field>
        </Grid12>
      </Card>
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// 8. CREDENTIALS — certifications list
// ──────────────────────────────────────────────────────────────────────────

function CertsSection({ ctx }: { ctx: SectionCtx }) {
  const { profile, certInput, setCertInput, addCert, removeCert } = ctx;
  return (
    <Card
      title="Certifications"
      sub="Add credentials and licenses — these surface on the public profile."
    >
      <div style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
        {profile.certifications.map((c, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              background: 'var(--mf-surface-2)',
              border: '1px solid var(--mf-hairline)',
              borderRadius: 4,
              fontSize: 13,
            }}
          >
            <Shield
              aria-hidden="true"
              size={13}
              className="mf-fg-mute"
            />
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
              aria-label={`Remove ${c}`}
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
        <button
          type="button"
          className="mf-btn"
          onClick={addCert}
          disabled={profile.certifications.length >= 20}
          style={{ height: 40, padding: '0 16px' }}
        >
          Add
        </button>
      </div>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Right-rail cards
// ──────────────────────────────────────────────────────────────────────────

interface ChecklistItem {
  key: string;
  label: string;
  done: boolean;
  /** key of the section to switch to when the row is clicked. */
  section: SectionKey;
  required: boolean;
}

function CompletionChecklistCard({
  required,
  recommended,
  reqDone,
  reqTotal,
  onJump,
}: {
  required: ChecklistItem[];
  recommended: ChecklistItem[];
  reqDone: number;
  reqTotal: number;
  onJump: (section: SectionKey) => void;
}) {
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
          {reqDone} / {reqTotal} required
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
          <ChecklistRow key={item.key} item={item} onJump={onJump} />
        ))}
      </div>

      <div
        className="mf-fg-dim mf-font-mono"
        style={{
          fontSize: 9,
          letterSpacing: '0.08em',
          marginBottom: 6,
          paddingTop: 8,
          borderTop: '1px solid var(--mf-hairline)',
        }}
      >
        RECOMMENDED
      </div>
      <div style={{ display: 'grid', gap: 2 }}>
        {recommended.map((item) => (
          <ChecklistRow key={item.key} item={item} onJump={onJump} />
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
  onJump: (section: SectionKey) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onJump(item.section)}
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
          height: 14,
          display: 'inline-flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        {item.done ? (
          <span style={{ color: '#86efac', fontSize: 12, lineHeight: 1 }}>✓</span>
        ) : (
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              border: '1px solid var(--mf-hairline-strong)',
              display: 'inline-block',
            }}
          />
        )}
      </span>
      <span style={{ flex: 1 }}>{item.label}</span>
    </button>
  );
}

function ProfilePreviewCard({ profile }: { profile: TrainerProfile }) {
  const headline = profile.headline?.trim() || null;
  const location = profile.location?.trim() || null;
  const specialties = profile.specialties.slice(0, 3);
  const quickFacts = profile.quickFacts
    .filter((f) => f.label.trim() && f.value.trim())
    .slice(0, 3);
  const services = profile.services.slice(0, 3);

  const placeholderStyle: React.CSSProperties = {
    fontStyle: 'italic',
    color: 'var(--mf-fg-mute)',
  };

  const publicHref = profile.trainerSlug ? `/t/${profile.trainerSlug}` : null;

  return (
    <div className="mf-card" style={{ padding: 14, overflow: 'hidden' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <div className="mf-eyebrow">Live preview</div>
        {publicHref ? (
          <a
            href={publicHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mf-font-mono"
            style={{
              fontSize: 9,
              letterSpacing: '0.08em',
              color: 'var(--mf-accent)',
              textTransform: 'uppercase',
              textDecoration: 'none',
            }}
          >
            Open ↗
          </a>
        ) : null}
      </div>

      <div
        style={{
          borderRadius: 6,
          overflow: 'hidden',
          border: '1px solid var(--mf-hairline-strong)',
          background: 'var(--mf-bg)',
        }}
      >
        {/* Cover strip */}
        <div
          style={{
            height: 64,
            background: profile.coverImageUrl
              ? `center / cover no-repeat url(${profile.coverImageUrl})`
              : 'linear-gradient(135deg, var(--mf-surface-2), var(--mf-surface-3))',
          }}
          aria-hidden="true"
        />
        <div style={{ padding: '0 12px 12px' }}>
          {/* Avatar overlap */}
          <div
            style={{
              width: 56,
              height: 56,
              marginTop: -28,
              borderRadius: '50%',
              border: '2px solid var(--mf-bg)',
              background: 'var(--mf-surface-2)',
              backgroundImage: profile.photoUrl ? `url(${profile.photoUrl})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              marginBottom: 8,
            }}
            aria-label={profile.photoUrl ? 'Profile photo' : 'No profile photo yet'}
          />
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
            className="mf-fg-mute mf-font-mono"
            style={{
              fontSize: 9,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginTop: 4,
              ...(location ? null : placeholderStyle),
            }}
          >
            {location ?? 'Add a location'}
          </div>

          {/* Specialty chips */}
          <div style={{ marginTop: 8 }}>
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
              <div style={{ display: 'grid', gap: 2 }}>
                {quickFacts.map((f, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 8,
                      fontSize: 10.5,
                      lineHeight: 1.4,
                    }}
                  >
                    <span className="mf-fg-mute mf-font-mono">{f.label}</span>
                    <span className="mf-fg" style={{ textAlign: 'right' }}>
                      {f.value}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 11, ...placeholderStyle }}>Add a quick fact</div>
            )}
          </PreviewBlock>

          {/* Services */}
          <PreviewBlock label="Services" last>
            {services.length > 0 ? (
              <div style={{ display: 'grid', gap: 2 }}>
                {services.map((s, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 8,
                      fontSize: 10.5,
                      lineHeight: 1.4,
                    }}
                  >
                    <span
                      className="mf-fg-dim"
                      style={{
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {s.title.trim() || 'Untitled'}
                    </span>
                    {s.price.trim() ? (
                      <span className="mf-font-mono mf-tnum">{s.price}</span>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 11, ...placeholderStyle }}>Add a service</div>
            )}
          </PreviewBlock>
        </div>
      </div>
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
        marginTop: 10,
        paddingTop: 8,
        paddingBottom: last ? 0 : 0,
        borderTop: '1px solid var(--mf-hairline)',
      }}
    >
      <div
        className="mf-fg-mute mf-font-mono"
        style={{
          fontSize: 8,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function ShareCard({ profile }: { profile: TrainerProfile }) {
  const [copied, setCopied] = useState(false);

  const publicUrl = (() => {
    if (!profile.trainerSlug) return null;
    // Server render returns '' then hydrates correctly on first client pass.
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/t/${profile.trainerSlug}`;
  })();

  const canShare = profile.trainerIsPublic && publicUrl !== null;

  async function copy() {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can fail in non-secure contexts or older browsers.
      // We don't bother with a fallback — the URL is still visible as text
      // for the user to select manually.
    }
  }

  return (
    <div className="mf-card" style={{ padding: 14 }}>
      <div className="mf-eyebrow" style={{ marginBottom: 10 }}>
        Share your profile
      </div>

      {canShare ? (
        <>
          <input
            readOnly
            className="mf-input mf-font-mono"
            value={publicUrl ?? ''}
            style={{
              fontSize: 10,
              height: 32,
              padding: '0 10px',
              marginBottom: 8,
            }}
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <button
              type="button"
              className="mf-btn focus-ring"
              onClick={copy}
              style={{ height: 32, fontSize: 11 }}
            >
              {copied ? 'Copied ✓' : 'Copy link'}
            </button>
            <a
              href={publicUrl ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="mf-btn focus-ring"
              style={{
                height: 32,
                fontSize: 11,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              View live
            </a>
          </div>
        </>
      ) : (
        <div
          className="mf-fg-mute"
          style={{ fontSize: 11, fontStyle: 'italic', lineHeight: 1.4 }}
        >
          Publish your profile to start sharing. Private profiles are hidden
          from the public and the directory.
        </div>
      )}
    </div>
  );
}

function ActivityCard() {
  const [applicationsThisWeek, setApplicationsThisWeek] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/trainers/me/activity', { cache: 'no-store' });
        if (!res.ok) {
          if (!cancelled) setFailed(true);
          return;
        }
        const data = (await res.json()) as { applicationsThisWeek?: number };
        if (!cancelled && typeof data.applicationsThisWeek === 'number') {
          setApplicationsThisWeek(data.applicationsThisWeek);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const countDisplay =
    failed || applicationsThisWeek === null
      ? applicationsThisWeek === null && !failed
        ? '…'
        : '—'
      : String(applicationsThisWeek);

  return (
    <div className="mf-card" style={{ padding: 14 }}>
      <div className="mf-eyebrow" style={{ marginBottom: 10 }}>
        Recent activity
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          marginBottom: 10,
        }}
      >
        <div>
          <div
            className="mf-fg-mute mf-font-mono"
            style={{ fontSize: 9, letterSpacing: '0.08em', marginBottom: 2 }}
          >
            APPLICATIONS · 7D
          </div>
          <div
            className="mf-font-display mf-tnum"
            style={{ fontSize: 22, lineHeight: 1 }}
          >
            {countDisplay}
          </div>
        </div>
        <div>
          <div
            className="mf-fg-mute mf-font-mono"
            style={{ fontSize: 9, letterSpacing: '0.08em', marginBottom: 2 }}
          >
            PROFILE VIEWS
          </div>
          <div
            className="mf-font-display mf-tnum mf-fg-mute"
            style={{ fontSize: 22, lineHeight: 1 }}
          >
            —
          </div>
          <div
            className="mf-fg-mute mf-font-mono"
            style={{ fontSize: 9, letterSpacing: '0.08em', marginTop: 2 }}
          >
            COMING SOON
          </div>
        </div>
      </div>

      <a
        href="/trainer/messages"
        className="mf-btn focus-ring"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: 32,
          fontSize: 11,
          textDecoration: 'none',
        }}
      >
        View inbox
      </a>
    </div>
  );
}
