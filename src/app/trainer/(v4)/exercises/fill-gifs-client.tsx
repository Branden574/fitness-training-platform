'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ImageDown } from 'lucide-react';
import { Btn } from '@/components/ui/mf';

interface Props {
  missingCount: number;
}

interface Result {
  updated: number;
  skipped: number;
  failed: number;
}

export default function FillGifsClient({ missingCount }: Props) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (missingCount === 0 && !result) return null;

  const run = async () => {
    if (running) return;
    setRunning(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/backfill-exercise-gifs', {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          data.message ??
            `Failed (${res.status}). Check RAPIDAPI_KEY is set in Railway env.`,
        );
        return;
      }
      setResult({
        updated: data.updated ?? 0,
        skipped: data.skipped ?? 0,
        failed: data.failed ?? 0,
      });
      // Refresh server component so newly-filled GIFs show in the grid.
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div
      className="mf-card"
      style={{
        padding: 12,
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
      }}
    >
      <ImageDown size={16} className="mf-fg-dim" />
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>
          {result
            ? `Filled ${result.updated} GIFs · ${result.skipped} skipped · ${result.failed} failed`
            : `${missingCount} exercise${missingCount === 1 ? '' : 's'} missing GIFs`}
        </div>
        <div
          className="mf-fg-dim"
          style={{ fontSize: 11, marginTop: 2 }}
        >
          {result
            ? 'Refresh the page if cards still look empty.'
            : 'Matches your local exercises against ExerciseDB by name and fills in GIFs where we find a hit. Runs once in ~30-60s.'}
        </div>
        {error && (
          <div
            role="alert"
            className="mf-font-mono"
            style={{ fontSize: 11, color: '#fca5a5', marginTop: 4 }}
          >
            {error}
          </div>
        )}
      </div>
      <Btn
        onClick={run}
        disabled={running}
        variant={result ? 'default' : 'primary'}
      >
        {running ? 'Filling…' : result ? 'Run again' : 'Fill GIFs'}
      </Btn>
    </div>
  );
}
