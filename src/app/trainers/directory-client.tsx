'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, MapPin, Search, X } from 'lucide-react';
import Btn from '@/components/ui/mf/Btn';
import SpecialtyChip from '@/components/ui/mf/SpecialtyChip';
import Toggle from '@/components/ui/mf/Toggle';
import TrainerCard, { toneForIndex, type TrainerCardData } from './trainer-card';
import TrainerCardSkeleton from './trainer-card-skeleton';

interface Props {
  initialTrainers: TrainerCardData[];
  popularSpecialties: string[];
}

const SORT_OPTIONS = [
  { value: 'recent', label: 'Best match' },
  { value: 'experienced', label: 'Most experienced' },
  { value: 'az', label: 'A–Z' },
];

const DEFAULT_CHIP_LIMIT = 7;

export default function DirectoryClient({
  initialTrainers,
  popularSpecialties,
}: Props) {
  const [trainers, setTrainers] = useState<TrainerCardData[]>(initialTrainers);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [location, setLocation] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [sort, setSort] = useState('recent');
  const [showAllChips, setShowAllChips] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const sortBtnRef = useRef<HTMLDivElement | null>(null);

  const visibleChips = useMemo(
    () => (showAllChips ? popularSpecialties : popularSpecialties.slice(0, DEFAULT_CHIP_LIMIT)),
    [popularSpecialties, showAllChips],
  );
  const hiddenChipCount = Math.max(0, popularSpecialties.length - DEFAULT_CHIP_LIMIT);

  const activeFilterCount = specialties.length + (accepting ? 1 : 0) + (location.trim() ? 1 : 0);

  useEffect(() => {
    function onClickAway(e: MouseEvent) {
      if (!sortBtnRef.current) return;
      if (!sortBtnRef.current.contains(e.target as Node)) setSortOpen(false);
    }
    if (sortOpen) {
      document.addEventListener('mousedown', onClickAway);
      return () => document.removeEventListener('mousedown', onClickAway);
    }
  }, [sortOpen]);

  useEffect(() => {
    const handle = setTimeout(async () => {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (specialties.length > 0) params.set('specialty', specialties[0]!.toLowerCase());
      if (location.trim()) params.set('loc', location.trim());
      if (accepting) params.set('accepting', '1');
      if (sort !== 'recent') params.set('sort', sort);
      const query = params.toString();
      setLoading(true);
      try {
        const res = await fetch(`/api/trainers${query ? '?' + query : ''}`);
        if (res.ok) {
          const data = await res.json();
          let next = (data.trainers ?? []) as TrainerCardData[];
          if (specialties.length > 1) {
            const wanted = new Set(specialties.map((s) => s.toLowerCase()));
            next = next.filter((t) =>
              (t.trainer?.specialties ?? []).some((s) => wanted.has(s.toLowerCase())),
            );
          }
          setTrainers(next);
        }
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [q, specialties, location, accepting, sort]);

  const toggleSpecialty = (s: string) => {
    setSpecialties((prev) =>
      prev.includes(s) ? prev.filter((p) => p !== s) : [...prev, s],
    );
  };

  const clearAll = () => {
    setQ('');
    setSpecialties([]);
    setLocation('');
    setAccepting(false);
  };

  return (
    <div>
      {/* Sticky filter bar */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          borderBottom: '1px solid var(--mf-hairline)',
          background: 'rgba(10,10,11,0.95)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            padding: '18px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                position: 'relative',
                flex: '1 1 240px',
                maxWidth: 380,
                minWidth: 200,
              }}
            >
              <Search
                size={14}
                className="mf-fg-mute"
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                }}
              />
              <input
                className="mf-input"
                placeholder="Search by name, gym, or style…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                style={{ paddingLeft: 36, height: 42 }}
                aria-label="Search trainers"
              />
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flex: '1 1 300px',
                minWidth: 0,
              }}
            >
              <span
                className="mf-font-mono mf-fg-mute"
                style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}
              >
                FILTER
              </span>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  flexWrap: 'wrap',
                }}
              >
                {visibleChips.map((s) => (
                  <SpecialtyChip
                    key={s}
                    selected={specialties.includes(s)}
                    onClick={() => toggleSpecialty(s)}
                  >
                    {s}
                  </SpecialtyChip>
                ))}
                {!showAllChips && hiddenChipCount > 0 ? (
                  <SpecialtyChip onClick={() => setShowAllChips(true)}>
                    +{hiddenChipCount} more
                  </SpecialtyChip>
                ) : null}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  height: 38,
                  padding: '0 12px',
                  background: 'var(--mf-surface-2)',
                  border: '1px solid var(--mf-hairline-strong)',
                  borderRadius: 6,
                  fontSize: 12,
                  color: 'var(--mf-fg-dim)',
                }}
              >
                <MapPin size={12} />
                <input
                  className="mf-font-mono"
                  placeholder="Location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 0,
                    outline: 0,
                    color: 'var(--mf-fg)',
                    fontSize: 12,
                    width: 110,
                  }}
                  aria-label="Filter by location"
                />
              </label>
              <Toggle
                checked={accepting}
                onChange={setAccepting}
                label="Accepting only"
              />
            </div>
          </div>

          {activeFilterCount > 0 ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                paddingTop: 10,
                borderTop: '1px solid var(--mf-hairline)',
                flexWrap: 'wrap',
              }}
            >
              <span
                className="mf-font-mono mf-fg-mute"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                ACTIVE · {activeFilterCount}
              </span>
              {specialties.map((s) => (
                <SpecialtyChip key={s} selected onClick={() => toggleSpecialty(s)}>
                  {s} ×
                </SpecialtyChip>
              ))}
              {location.trim() ? (
                <SpecialtyChip selected onClick={() => setLocation('')}>
                  {location.trim()} ×
                </SpecialtyChip>
              ) : null}
              {accepting ? (
                <SpecialtyChip selected onClick={() => setAccepting(false)}>
                  Accepting ×
                </SpecialtyChip>
              ) : null}
              <button
                type="button"
                onClick={clearAll}
                className="mf-font-mono mf-fg-mute"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  background: 'transparent',
                  border: 0,
                  cursor: 'pointer',
                }}
              >
                Clear all
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 24px 80px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24,
            gap: 16,
          }}
        >
          <div>
            <span
              className="mf-font-display"
              style={{ fontSize: 24, textTransform: 'uppercase', letterSpacing: '-0.01em' }}
            >
              {loading ? '…' : trainers.length}{' '}
              <span className="mf-fg-mute" style={{ fontSize: 18 }}>
                COACHES
              </span>
            </span>
          </div>
          <div
            ref={sortBtnRef}
            style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <span
              className="mf-font-mono mf-fg-mute"
              style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}
            >
              Sort
            </span>
            <button
              type="button"
              onClick={() => setSortOpen((o) => !o)}
              className="mf-btn mf-font-mono"
              style={{ height: 32, fontSize: 11 }}
              aria-haspopup="listbox"
              aria-expanded={sortOpen}
            >
              {SORT_OPTIONS.find((o) => o.value === sort)?.label}
              <ChevronDown size={12} />
            </button>
            {sortOpen ? (
              <ul
                role="listbox"
                style={{
                  position: 'absolute',
                  top: 40,
                  right: 0,
                  zIndex: 20,
                  background: 'var(--mf-surface-2)',
                  border: '1px solid var(--mf-hairline-strong)',
                  borderRadius: 6,
                  padding: 4,
                  minWidth: 180,
                  boxShadow: '0 12px 30px -8px rgba(0,0,0,0.45)',
                  margin: 0,
                  listStyle: 'none',
                }}
              >
                {SORT_OPTIONS.map((o) => (
                  <li key={o.value}>
                    <button
                      type="button"
                      onClick={() => {
                        setSort(o.value);
                        setSortOpen(false);
                      }}
                      role="option"
                      aria-selected={sort === o.value}
                      className="mf-font-mono"
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        background: 'transparent',
                        border: 0,
                        color: sort === o.value ? 'var(--mf-accent)' : 'var(--mf-fg)',
                        fontSize: 12,
                        padding: '8px 10px',
                        borderRadius: 4,
                        cursor: 'pointer',
                      }}
                    >
                      {o.label}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        {loading && trainers.length === 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 20,
            }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <TrainerCardSkeleton key={i} />
            ))}
          </div>
        ) : trainers.length === 0 ? (
          <EmptyState onReset={clearAll} />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 20,
            }}
          >
            {trainers.map((t, idx) => (
              <TrainerCard key={t.id} trainer={t} tone={toneForIndex(idx)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div style={{ padding: '80px 0 60px' }}>
      <div
        className="mf-card"
        style={{
          padding: '60px 40px',
          textAlign: 'center',
          maxWidth: 520,
          margin: '0 auto',
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            margin: '0 auto 24px',
            background: 'var(--mf-surface-3)',
            display: 'grid',
            placeItems: 'center',
            border: '1px dashed var(--mf-hairline-strong)',
          }}
        >
          <X size={28} className="mf-fg-mute" />
        </div>
        <div
          className="mf-font-display"
          style={{ fontSize: 28, textTransform: 'uppercase', letterSpacing: '-0.01em' }}
        >
          No coaches match that.
        </div>
        <div
          className="mf-fg-dim"
          style={{
            fontSize: 14,
            lineHeight: 1.5,
            maxWidth: 360,
            margin: '12px auto 0',
          }}
        >
          Loosen the search or clear the filters and start fresh.
        </div>
        <div
          style={{
            marginTop: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Btn variant="primary" onClick={onReset}>
            Reset filters
          </Btn>
        </div>
      </div>
    </div>
  );
}
