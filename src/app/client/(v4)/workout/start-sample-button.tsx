'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Play } from 'lucide-react';
import { Btn } from '@/components/ui/mf';

export default function StartSampleButton({
  fullWidth = false,
}: {
  fullWidth?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/client/workout/start-sample', { method: 'POST' });
      const data = (await res.json().catch(() => ({}))) as {
        sessionId?: string;
        error?: string;
      };
      if (!res.ok || !data.sessionId) {
        setError(data.error ?? 'Could not start a session.');
        setLoading(false);
        return;
      }
      router.push(`/client/workout/${data.sessionId}`);
      router.refresh();
    } catch {
      setError('Network error. Try again.');
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: fullWidth ? '100%' : undefined }}>
      <Btn
        variant="primary"
        icon={Play}
        onClick={start}
        disabled={loading}
        className={fullWidth ? 'w-full' : undefined}
      >
        {loading ? 'Starting…' : 'Start a session'}
      </Btn>
      {error && (
        <div
          className="mf-font-mono"
          style={{ fontSize: 10, color: 'var(--mf-red)', textAlign: 'center' }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
