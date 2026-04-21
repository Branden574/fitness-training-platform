'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ImageDown } from 'lucide-react';
import { Btn } from '@/components/ui/mf';

interface Props {
  missingCount: number;
  totalCount: number;
}

interface Result {
  updated: number;
  skipped: number;
  failed: number;
}

export default function FillGifsClient({ missingCount, totalCount }: Props) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      // Refresh so newly-filled images show in the grid without a manual reload.
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setRunning(false);
    }
  };

  // Always-visible banner per Branden 2026-04-21. Copy changes based on state:
  // "missing" when there are unfilled rows, "all filled" when everything has an
  // image, "Run again" after a completed run. Lets trainers re-match even when
  // nothing is missing (in case free-exercise-db added matches for a previously
  // failed row, or an edited name lines up with a new match).
  const headline = result
    ? `Filled ${result.updated} · ${result.skipped} skipped · ${result.failed} failed`
    : missingCount > 0
      ? `${missingCount} of ${totalCount} exercise${totalCount === 1 ? '' : 's'} missing images`
      : `All ${totalCount} exercises have images`;

  const description = result
    ? 'Hard-refresh if any cards still look empty.'
    : missingCount > 0
      ? 'Matches local exercises against free-exercise-db by name and fills in images. Runs in ~5s.'
      : 'Run again to re-match every exercise against free-exercise-db — useful if you just renamed one.';

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
        <div style={{ fontSize: 13, fontWeight: 500 }}>{headline}</div>
        <div className="mf-fg-dim" style={{ fontSize: 11, marginTop: 2 }}>
          {description}
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
        variant={missingCount > 0 && !result ? 'primary' : 'default'}
      >
        {running ? 'Filling…' : result ? 'Run again' : 'Fill images'}
      </Btn>
    </div>
  );
}
