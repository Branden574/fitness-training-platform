'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Clock, X } from 'lucide-react';

export interface PendingRequest {
  id: string;
  title: string;
  startTime: string | Date;
  endTime: string | Date;
  duration: number;
  location: string | null;
  notes: string | null;
  client: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

export interface PendingRequestsPanelProps {
  requests: PendingRequest[];
}

function formatWhen(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function PendingRequestsPanel({ requests }: PendingRequestsPanelProps) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAction(id: string, status: 'APPROVED' | 'REJECTED') {
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch('/api/appointments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId: id, status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to update request');
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (requests.length === 0) return null;

  return (
    <section
      className="mf-card"
      style={{
        padding: 16,
        marginBottom: 16,
        borderColor: 'rgba(245,181,68,0.3)',
        background: 'linear-gradient(180deg, rgba(245,181,68,0.04), transparent 60%)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Clock size={14} style={{ color: 'var(--mf-amber)' }} />
        <div
          className="mf-font-mono"
          style={{
            fontSize: 11,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--mf-amber)',
          }}
        >
          Pending requests · {requests.length}
        </div>
      </div>

      {error ? (
        <div
          className="mf-chip mf-chip-bad"
          role="alert"
          style={{
            height: 'auto',
            display: 'block',
            padding: '10px 12px',
            marginBottom: 10,
            fontSize: 12,
          }}
        >
          {error}
        </div>
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {requests.map((r) => (
          <div
            key={r.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 12px',
              background: 'var(--mf-surface-2)',
              border: '1px solid var(--mf-hairline)',
              borderRadius: 6,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: 1, minWidth: 180 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--mf-fg)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {r.client.name ?? r.client.email} · {r.title}
              </div>
              <div
                className="mf-font-mono mf-fg-mute"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginTop: 2,
                }}
              >
                {formatWhen(r.startTime)} · {r.duration} MIN
                {r.location ? ` · ${r.location}` : ''}
              </div>
              {r.notes ? (
                <div
                  className="mf-fg-dim"
                  style={{ fontSize: 12, marginTop: 4, lineHeight: 1.4 }}
                >
                  {r.notes}
                </div>
              ) : null}
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => handleAction(r.id, 'REJECTED')}
                disabled={busyId === r.id}
                className="mf-btn"
                aria-label={`Decline request from ${r.client.name ?? r.client.email}`}
                style={{ height: 34, padding: '0 12px', fontSize: 12 }}
              >
                <X size={14} />
                Decline
              </button>
              <button
                type="button"
                onClick={() => handleAction(r.id, 'APPROVED')}
                disabled={busyId === r.id}
                className="mf-btn mf-btn-primary"
                aria-label={`Approve request from ${r.client.name ?? r.client.email}`}
                style={{ height: 34, padding: '0 12px', fontSize: 12 }}
              >
                <Check size={14} />
                {busyId === r.id ? 'Saving…' : 'Approve'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
