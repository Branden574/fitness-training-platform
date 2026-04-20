'use client';

import { useEffect, useState } from 'react';
import TrainerCard, { type TrainerCardData } from './trainer-card';

interface Props {
  initialTrainers: TrainerCardData[];
}

const TIER_OPTIONS = [
  { value: '', label: 'Any price' },
  { value: 'tier-1', label: '$' },
  { value: 'tier-2', label: '$$' },
  { value: 'tier-3', label: '$$$' },
  { value: 'contact', label: 'Contact' },
];

const YEARS_OPTIONS = [
  { value: 0, label: 'Any experience' },
  { value: 1, label: '1+ yrs' },
  { value: 3, label: '3+ yrs' },
  { value: 5, label: '5+ yrs' },
  { value: 10, label: '10+ yrs' },
];

const SORT_OPTIONS = [
  { value: 'recent', label: 'Recently joined' },
  { value: 'experienced', label: 'Most experienced' },
  { value: 'az', label: 'A–Z' },
];

export default function DirectoryClient({ initialTrainers }: Props) {
  const [trainers, setTrainers] = useState<TrainerCardData[]>(initialTrainers);
  const [q, setQ] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [location, setLocation] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [tier, setTier] = useState('');
  const [minYears, setMinYears] = useState(0);
  const [sort, setSort] = useState('recent');
  const [specialtyOptions, setSpecialtyOptions] = useState<string[]>([]);

  // Populate specialty dropdown from threshold-filtered tags
  useEffect(() => {
    (async () => {
      const res = await fetch('/api/specialties/suggest?threshold=2');
      if (res.ok) {
        const data = await res.json();
        setSpecialtyOptions(
          (data.suggestions as Array<{ tag: string }>).map((s) => s.tag),
        );
      }
    })();
  }, []);

  // Fetch filtered results whenever filters change (debounced 200ms)
  useEffect(() => {
    const t = setTimeout(async () => {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (specialty) params.set('specialty', specialty);
      if (location.trim()) params.set('loc', location.trim());
      if (accepting) params.set('accepting', '1');
      if (tier) params.set('tier', tier);
      if (minYears > 0) params.set('minYears', String(minYears));
      if (sort !== 'recent') params.set('sort', sort);
      const query = params.toString();
      const res = await fetch(`/api/trainers${query ? '?' + query : ''}`);
      if (res.ok) {
        const data = await res.json();
        setTrainers(data.trainers ?? []);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q, specialty, location, accepting, tier, minYears, sort]);

  return (
    <div>
      <div
        className="mf-card"
        style={{
          padding: 16,
          marginBottom: 24,
          display: 'grid',
          gap: 12,
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="SEARCH">
            <input
              className="mf-input"
              placeholder="Name or keyword…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </Field>
          <Field label="LOCATION">
            <input
              className="mf-input"
              placeholder="City or state"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </Field>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 12,
          }}
        >
          <Field label="SPECIALTY">
            <select
              className="mf-input"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
            >
              <option value="">Any specialty</option>
              {specialtyOptions.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </Field>
          <Field label="PRICE">
            <select
              className="mf-input"
              value={tier}
              onChange={(e) => setTier(e.target.value)}
            >
              {TIER_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="EXPERIENCE">
            <select
              className="mf-input"
              value={minYears}
              onChange={(e) => setMinYears(Number(e.target.value))}
            >
              {YEARS_OPTIONS.map((y) => (
                <option key={y.value} value={y.value}>
                  {y.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="SORT BY">
            <select
              className="mf-input"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            marginTop: 4,
          }}
        >
          <input
            type="checkbox"
            checked={accepting}
            onChange={(e) => setAccepting(e.target.checked)}
          />
          Only trainers accepting new clients
        </label>
      </div>

      {trainers.length === 0 ? (
        <div
          className="mf-card mf-fg-dim"
          style={{ padding: 40, textAlign: 'center' }}
        >
          No trainers match these filters.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {trainers.map((t) => (
            <TrainerCard key={t.id} trainer={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <div
        className="mf-font-mono mf-fg-dim"
        style={{ fontSize: 10, letterSpacing: '.15em', marginBottom: 4 }}
      >
        {label}
      </div>
      {children}
    </label>
  );
}
