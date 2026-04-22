'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Play } from 'lucide-react';
import { Btn } from '@/components/ui/mf';

// Start-today's-programmed-session button. POSTs the programDayId to the
// `/start-program-day` endpoint which materializes a Workout + Session
// from the ProgramDay's exercises and returns a sessionId to route into.

export default function StartProgramDayButton({
  programDayId,
  label = 'Start today\'s session',
  fullWidth = false,
  variant = 'primary',
}: {
  programDayId: string;
  label?: string;
  fullWidth?: boolean;
  variant?: 'primary' | 'default';
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/client/workout/start-program-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programDayId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        sessionId?: string;
        error?: string;
      };
      if (!res.ok || !data.sessionId) {
        setError(data.error ?? 'Could not start the session.');
        setBusy(false);
        return;
      }
      router.push(`/client/workout/${data.sessionId}`);
      router.refresh();
    } catch {
      setError('Network error. Try again.');
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: fullWidth ? '100%' : undefined }}>
      <Btn
        variant={variant}
        icon={Play}
        onClick={start}
        disabled={busy}
        className={fullWidth ? 'w-full' : undefined}
      >
        {busy ? 'Starting…' : label}
      </Btn>
      {error && (
        <div
          className="mf-font-mono"
          style={{ fontSize: 10, color: 'var(--mf-red)' }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
