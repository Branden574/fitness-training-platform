'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ArchivedRowActions({
  clientId,
  clientName,
}: {
  clientId: string;
  clientName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<'restore' | 'delete' | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function restore() {
    setBusy('restore');
    setError(null);
    try {
      const res = await fetch(`/api/trainers/clients/${clientId}/restore`, {
        method: 'POST',
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError((d as { error?: string }).error ?? 'Restore failed.');
        setBusy(null);
        return;
      }
      router.refresh();
      setBusy(null);
    } catch {
      setError('Network error.');
      setBusy(null);
    }
  }

  async function deleteNow() {
    if (typed.trim().toLowerCase() !== clientName.trim().toLowerCase()) return;
    setBusy('delete');
    setError(null);
    try {
      const res = await fetch(`/api/trainers/clients/${clientId}/delete-now`, {
        method: 'POST',
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError((d as { error?: string }).error ?? 'Delete failed.');
        setBusy(null);
        return;
      }
      setConfirming(false);
      router.refresh();
      setBusy(null);
    } catch {
      setError('Network error.');
      setBusy(null);
    }
  }

  return (
    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
      <button
        type="button"
        onClick={restore}
        disabled={busy !== null}
        className="mf-btn"
        style={{ height: 32, padding: '0 12px', fontSize: 12 }}
      >
        {busy === 'restore' ? 'Restoring…' : 'Restore'}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={busy !== null}
        className="mf-btn"
        style={{
          height: 32,
          padding: '0 12px',
          fontSize: 12,
          color: 'var(--mf-red, #ef4444)',
          borderColor: 'var(--mf-red, #ef4444)',
        }}
      >
        Delete now
      </button>

      {confirming && (
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
          onClick={() => busy === null && setConfirming(false)}
        >
          <div
            className="mf-card"
            onClick={(e) => e.stopPropagation()}
            style={{ padding: 24, maxWidth: 440, width: '90vw' }}
          >
            <div className="mf-font-display" style={{ fontSize: 18, marginBottom: 12 }}>
              Permanently delete {clientName}?
            </div>
            <div className="mf-fg-dim" style={{ fontSize: 12, marginBottom: 12 }}>
              This cannot be undone. Type{' '}
              <span className="mf-fg" style={{ fontWeight: 600 }}>
                {clientName.toUpperCase()}
              </span>{' '}
              to confirm.
            </div>
            <input
              type="text"
              className="mf-input"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoFocus
              style={{ marginBottom: 12 }}
            />
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
                onClick={() => setConfirming(false)}
                disabled={busy !== null}
                className="mf-btn"
                style={{ height: 32, padding: '0 12px', fontSize: 12 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteNow}
                disabled={
                  typed.trim().toLowerCase() !== clientName.trim().toLowerCase() ||
                  busy !== null
                }
                className="mf-btn"
                style={{
                  height: 32,
                  padding: '0 12px',
                  fontSize: 12,
                  background: 'var(--mf-red, #ef4444)',
                  color: '#0A0A0B',
                  borderColor: 'var(--mf-red, #ef4444)',
                }}
              >
                {busy === 'delete' ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
