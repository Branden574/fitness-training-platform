'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ArchiveZoneClientProps {
  clientId: string;
  clientName: string;
  archivedAt: string | null; // ISO string when archived; null otherwise
}

export default function ArchiveZoneClient({
  clientId,
  clientName,
  archivedAt,
}: ArchiveZoneClientProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typedName, setTypedName] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matches = typedName.trim().toLowerCase() === clientName.trim().toLowerCase();

  if (archivedAt) {
    // Already archived — render a status line instead of the button. Restore
    // / Delete-now actions live on the Roster's Archived tab in v1.
    const purgeAt = new Date(new Date(archivedAt).getTime() + 30 * 86400000);
    return (
      <div
        className="mf-card"
        style={{
          padding: 16,
          marginTop: 24,
          borderColor: 'var(--mf-red, #b91c1c)',
        }}
      >
        <div className="mf-eyebrow" style={{ marginBottom: 6 }}>
          ARCHIVED
        </div>
        <div className="mf-fg-dim" style={{ fontSize: 13, lineHeight: 1.5 }}>
          This client is scheduled for permanent deletion on{' '}
          {purgeAt.toLocaleDateString()}. Restore or delete-now from your
          Roster &rarr; Archived tab.
        </div>
      </div>
    );
  }

  async function submit() {
    if (!matches) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/trainers/clients/${clientId}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Archive failed.');
        setSubmitting(false);
        return;
      }
      router.push('/trainer/clients?archived=1');
      router.refresh();
    } catch {
      setError('Network error. Try again.');
      setSubmitting(false);
    }
  }

  return (
    <div style={{ marginTop: 24 }}>
      <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
        DANGER ZONE
      </div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mf-btn"
        style={{
          height: 40,
          padding: '0 16px',
          color: 'var(--mf-red, #ef4444)',
          borderColor: 'var(--mf-red, #ef4444)',
          background: 'transparent',
        }}
      >
        Archive client &rarr;
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 50,
          }}
          onClick={() => !submitting && setOpen(false)}
        >
          <div
            className="mf-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              padding: 24,
              maxWidth: 480,
              width: '90vw',
              background: 'var(--mf-surface-1, #161618)',
            }}
          >
            <div
              className="mf-font-display"
              style={{ fontSize: 22, marginBottom: 12, letterSpacing: '-0.01em' }}
            >
              Archive {clientName}?
            </div>
            <div
              className="mf-fg-dim"
              style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}
            >
              This will:
              <ul style={{ marginTop: 8, marginLeft: 20, listStyle: 'disc' }}>
                <li>Hide them from your roster immediately</li>
                <li>Block their login</li>
                <li>Permanently delete their account and all data in 30 days</li>
                <li>Reversible during the 30-day window from your Archived tab</li>
              </ul>
              <div style={{ marginTop: 12 }}>
                Coach notes about this client and the entire message thread
                will be deleted at purge time. Screenshot anything you need
                to keep first.
              </div>
            </div>

            <label className="block" style={{ marginBottom: 16 }}>
              <div className="mf-eyebrow" style={{ marginBottom: 6 }}>
                REASON (OPTIONAL)
              </div>
              <input
                type="text"
                className="mf-input"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                placeholder="e.g. Client moved to in-person training"
              />
            </label>

            <label className="block" style={{ marginBottom: 16 }}>
              <div className="mf-eyebrow" style={{ marginBottom: 6 }}>
                TYPE <span className="mf-fg">{clientName.toUpperCase()}</span> TO CONFIRM
              </div>
              <input
                type="text"
                className="mf-input"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                autoFocus
              />
            </label>

            {error && (
              <div
                role="alert"
                style={{
                  padding: '8px 12px',
                  background: '#2a1212',
                  border: '1px solid #6b1f1f',
                  color: '#fca5a5',
                  borderRadius: 4,
                  fontSize: 12,
                  marginBottom: 12,
                }}
              >
                {error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={submitting}
                className="mf-btn"
                style={{ height: 36, padding: '0 14px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={!matches || submitting}
                className="mf-btn"
                style={{
                  height: 36,
                  padding: '0 14px',
                  background: 'var(--mf-red, #ef4444)',
                  color: '#0A0A0B',
                  borderColor: 'var(--mf-red, #ef4444)',
                  fontWeight: 600,
                }}
              >
                {submitting ? 'Archiving…' : 'Archive'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
