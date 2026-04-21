'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Plus, Search as SearchIcon } from 'lucide-react';
import { Btn, Chip } from '@/components/ui/mf';

interface LibraryResult {
  externalId: string;
  name: string;
  gifUrl: string;
  bodyPart: string;
  target: string;
  equipment: string;
  secondaryMuscles: string[];
  instructions: string[];
}

type ImportState = 'idle' | 'importing' | 'done' | 'error';

export default function LibrarySearchClient() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LibraryResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importStates, setImportStates] = useState<Record<string, ImportState>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      void runSearch(q);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function runSearch(q: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/exercises/library/search?q=${encodeURIComponent(q)}&limit=12`,
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        setError(data.message ?? `Search failed (${res.status})`);
        setResults([]);
        return;
      }
      const data = (await res.json()) as { results?: LibraryResult[] };
      setResults((data.results ?? []).slice(0, 12));
    } catch {
      setError('Network error while searching the library.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleImport(r: LibraryResult) {
    const key = r.externalId || r.name;
    setImportStates((s) => ({ ...s, [key]: 'importing' }));
    try {
      const res = await fetch('/api/exercises/library/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          externalId: r.externalId,
          name: r.name,
          gifUrl: r.gifUrl,
          bodyPart: r.bodyPart,
          target: r.target,
          equipment: r.equipment,
          secondaryMuscles: r.secondaryMuscles,
          instructions: r.instructions,
        }),
      });
      if (!res.ok) throw new Error(`Import failed (${res.status})`);
      setImportStates((s) => ({ ...s, [key]: 'done' }));
      // Refresh the server component so the new row shows up in the local
      // grid immediately — without this the import succeeds but the grid
      // still shows the old count until a manual page reload.
      router.refresh();
      // Remove from results after a short delay
      setTimeout(() => {
        setResults((prev) => prev.filter((it) => (it.externalId || it.name) !== key));
      }, 900);
    } catch {
      setImportStates((s) => ({ ...s, [key]: 'error' }));
    }
  }

  return (
    <section style={{ marginBottom: 24 }}>
      <div
        className="flex items-center justify-between"
        style={{ marginBottom: 12 }}
      >
        <div>
          <div className="mf-eyebrow">LIBRARY</div>
          <div
            className="mf-font-mono mf-fg-mute"
            style={{ fontSize: 11, marginTop: 2 }}
          >
            Search free-exercise-db · import images and muscle data
          </div>
        </div>
      </div>

      <div
        className="flex items-center gap-2"
        style={{ marginBottom: 12 }}
      >
        <div
          className="mf-card flex items-center gap-2"
          style={{
            flex: 1,
            maxWidth: 480,
            padding: '0 12px',
            height: 40,
          }}
        >
          <SearchIcon size={14} className="mf-fg-mute" />
          <input
            className="mf-input"
            style={{
              flex: 1,
              height: 36,
              border: 'none',
              background: 'transparent',
              padding: 0,
              fontSize: 13,
              outline: 'none',
            }}
            placeholder="Search exercises (e.g. squat, press, row)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {loading && (
            <span
              className="mf-font-mono mf-fg-mute"
              style={{ fontSize: 10 }}
            >
              LOADING…
            </span>
          )}
        </div>
      </div>

      {error && (
        <div
          className="mf-chip mf-chip-bad"
          style={{ display: 'block', padding: '8px 12px', marginBottom: 12 }}
        >
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {results.map((r) => {
            const key = r.externalId || r.name;
            const state = importStates[key] ?? 'idle';
            return (
              <div key={key} className="mf-card" style={{ overflow: 'hidden' }}>
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '1 / 1',
                    background: 'var(--mf-surface-3)',
                    display: 'grid',
                    placeItems: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {r.gifUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.gifUrl}
                      alt={r.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <span
                      className="mf-font-mono mf-fg-mute"
                      style={{ fontSize: 10 }}
                    >
                      NO GIF
                    </span>
                  )}
                </div>
                <div style={{ padding: 12 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      textTransform: 'capitalize',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginBottom: 4,
                    }}
                  >
                    {r.name}
                  </div>
                  <div
                    className="mf-font-mono mf-fg-mute"
                    style={{
                      fontSize: 10,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {(r.target || r.bodyPart || 'UNSPECIFIED').toUpperCase()}
                  </div>
                  {r.equipment && (
                    <div
                      className="mf-font-mono mf-fg-mute"
                      style={{
                        fontSize: 10,
                        marginTop: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {r.equipment.toUpperCase()}
                    </div>
                  )}
                  <div style={{ marginTop: 10 }}>
                    {state === 'done' ? (
                      <Chip kind="ok">
                        <Check size={10} style={{ marginRight: 4 }} />
                        IMPORTED
                      </Chip>
                    ) : state === 'error' ? (
                      <Chip kind="bad">FAILED · RETRY</Chip>
                    ) : (
                      <Btn
                        icon={Plus}
                        onClick={() => handleImport(r)}
                        disabled={state === 'importing'}
                      >
                        {state === 'importing' ? 'Importing…' : 'Import'}
                      </Btn>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && !error && query.trim() && results.length === 0 && (
        <div
          className="mf-card mf-fg-mute mf-font-mono"
          style={{
            padding: 24,
            textAlign: 'center',
            fontSize: 11,
            letterSpacing: '0.1em',
          }}
        >
          NO LIBRARY MATCHES FOR &quot;{query.toUpperCase()}&quot;
        </div>
      )}
    </section>
  );
}
