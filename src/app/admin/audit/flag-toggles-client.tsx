'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Chip, Toggle } from '@/components/ui/mf';

interface Flag {
  key: string;
  enabled: boolean;
  description: string | null;
  updatedBy: string | null;
}

export default function FlagTogglesClient({ initial }: { initial: Flag[] }) {
  const router = useRouter();
  const [flags, setFlags] = useState<Flag[]>(initial);
  const [pending, setPending] = useState<string | null>(null);

  async function toggle(key: string, next: boolean) {
    setPending(key);
    // Optimistic update
    setFlags((prev) => prev.map((f) => (f.key === key ? { ...f, enabled: next } : f)));
    try {
      const res = await fetch('/api/feature-flags', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, enabled: next }),
      });
      if (!res.ok) throw new Error('toggle failed');
      router.refresh();
    } catch {
      // Revert
      setFlags((prev) => prev.map((f) => (f.key === key ? { ...f, enabled: !next } : f)));
    } finally {
      setPending(null);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {flags.map((f) => (
        <div key={f.key} className="flex items-center gap-3" style={{ padding: '8px 8px' }}>
          <Toggle checked={f.enabled} onChange={(next) => toggle(f.key, next)} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="mf-font-mono" style={{ fontSize: 12 }}>
              {f.key}
            </div>
            {f.description && (
              <div className="mf-fg-dim" style={{ fontSize: 11 }}>
                {f.description}
              </div>
            )}
          </div>
          <Chip kind={f.enabled ? 'ok' : 'default'}>{f.enabled ? 'ON' : 'OFF'}</Chip>
          {pending === f.key && (
            <span
              className="mf-font-mono mf-fg-mute"
              style={{ fontSize: 9, letterSpacing: '0.1em' }}
            >
              SAVING…
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
