'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApplyForm } from '@/components/apply/ApplyForm';

interface SearchResult {
  id: string;
  name: string;
  slug: string;
  photoUrl: string | null;
  initials: string;
  acceptingClients: boolean;
  contactPhone: string | null;
}

export default function ApplyGenericClient() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [selection, setSelection] = useState<{
    id: string | null;
    name: string | null;
  }>({ id: null, name: null });
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(
        `/api/trainers/search?q=${encodeURIComponent(query.trim())}`,
      );
      if (res.ok) {
        const data = await res.json();
        setResults(data.results ?? []);
      } else {
        setResults([]);
      }
      setSearched(true);
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  const submitCode = async () => {
    setCodeError(null);
    const c = code.trim().toUpperCase();
    if (c.length !== 6) {
      setCodeError('Code is 6 characters.');
      return;
    }
    const res = await fetch('/api/trainers/resolve-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: c }),
    });
    if (res.ok) {
      const data = await res.json();
      router.push(`/apply/${data.slug}`);
    } else {
      setCodeError("We don't recognize that code. Check with your trainer.");
    }
  };

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <div className="mf-card" style={{ padding: 20 }}>
        <div className="mf-eyebrow" style={{ marginBottom: 12 }}>
          WHO DO YOU WANT TO TRAIN WITH?
        </div>

        <input
          className="mf-input"
          placeholder="Search trainers by name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {searched && results.length === 0 && selection.id === null && (
          <div
            className="mf-fg-dim"
            style={{
              marginTop: 8,
              padding: '10px 12px',
              border: '1px dashed var(--mf-hairline, #1F1F22)',
              borderRadius: 4,
              fontSize: 12,
            }}
          >
            No trainers match &ldquo;{query.trim()}&rdquo;. If your coach gave
            you a referral code, use it below — or pick &ldquo;No
            preference&rdquo; and we&apos;ll match you.
          </div>
        )}

        {results.length > 0 && (
          <div
            style={{
              marginTop: 8,
              border: '1px solid var(--mf-hairline, #1F1F22)',
              borderRadius: 4,
              overflow: 'hidden',
            }}
          >
            {results.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setSelection({ id: r.id, name: r.name });
                  setSelectedPhone(r.contactPhone);
                  setResults([]);
                  setQuery(r.name);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--mf-hairline, #1F1F22)',
                  color: 'var(--mf-fg, #F4F4F5)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 999,
                    background: 'var(--mf-surface-2, #0E0E10)',
                    display: 'grid',
                    placeItems: 'center',
                    fontFamily: 'var(--font-mf-mono), monospace',
                    fontSize: 10,
                  }}
                >
                  {r.initials}
                </div>
                <div style={{ flex: 1 }}>{r.name}</div>
                {r.acceptingClients && (
                  <span
                    className="mf-fg-dim"
                    style={{ fontSize: 10 }}
                  >
                    ● accepting
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        <Divider />

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="mf-input"
            placeholder="Trainer code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            style={{ fontFamily: 'var(--font-mf-mono), monospace', flex: 1 }}
          />
          <button
            type="button"
            onClick={submitCode}
            className="mf-btn"
            style={{ height: 40 }}
          >
            Apply →
          </button>
        </div>
        {codeError && (
          <div
            role="alert"
            style={{ fontSize: 11, marginTop: 6, color: '#fca5a5' }}
          >
            {codeError}
          </div>
        )}

        <Divider />

        <button
          type="button"
          onClick={() => {
            setSelection({ id: null, name: null });
            setSelectedPhone(null);
          }}
          className="mf-btn"
          style={{ width: '100%', height: 40 }}
        >
          No preference — match me
        </button>
      </div>

      <ApplyForm selection={selection} trainerPhone={selectedPhone} />
    </div>
  );
}

function Divider() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        margin: '16px 0',
      }}
    >
      <div
        style={{ flex: 1, height: 1, background: 'var(--mf-hairline, #1F1F22)' }}
      />
      <span
        className="mf-fg-mute"
        style={{ fontSize: 10 }}
      >
        OR
      </span>
      <div
        style={{ flex: 1, height: 1, background: 'var(--mf-hairline, #1F1F22)' }}
      />
    </div>
  );
}
