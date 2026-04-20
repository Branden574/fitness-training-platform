'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  userId: string;
  initialPublic: boolean;
}

export default function TrainerPublishClient({ userId, initialPublic }: Props) {
  const router = useRouter();
  const [isPublic, setIsPublic] = useState(initialPublic);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/trainers/${userId}/publish-toggle`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Failed');
        return;
      }
      const data = await res.json();
      setIsPublic(!!data.trainerIsPublic);
      startTransition(() => router.refresh());
    } finally {
      setLoading(false);
    }
  };

  const busy = loading || isPending;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      title={
        error ??
        (isPublic
          ? 'Trainer is listed in the directory + searchable on /apply. Click to unpublish.'
          : 'Trainer is hidden from public search. Click to publish + auto-generate slug if missing.')
      }
      className="mf-font-mono"
      style={{
        height: 24,
        padding: '0 8px',
        fontSize: 10,
        letterSpacing: '0.1em',
        borderRadius: 4,
        border: '1px solid var(--mf-hairline)',
        background: isPublic ? 'rgba(43, 217, 133, 0.12)' : 'transparent',
        color: isPublic ? '#86efac' : 'var(--mf-fg-dim)',
        cursor: busy ? 'wait' : 'pointer',
        opacity: busy ? 0.6 : 1,
      }}
    >
      {busy ? '…' : isPublic ? '● PUBLIC' : '○ PRIVATE'}
    </button>
  );
}
