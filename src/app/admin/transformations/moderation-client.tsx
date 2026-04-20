'use client';

import { useEffect, useState } from 'react';

interface PendingItem {
  id: string;
  beforePhotoUrl: string;
  afterPhotoUrl: string;
  caption: string | null;
  durationWeeks: number | null;
  createdAt: string;
  trainer: {
    user: { id: string; name: string | null; email: string; trainerSlug: string | null };
  };
}

export default function ModerationClient() {
  const [items, setItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    refresh();
  }, []);

  const refresh = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/transformations', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      setItems(data.items ?? []);
    }
    setLoading(false);
  };

  const act = async (id: string, action: 'approve' | 'reject', reason?: string) => {
    const res = await fetch('/api/admin/transformations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action, rejectionReason: reason }),
    });
    if (res.ok) {
      setRejectingId(null);
      setRejectReason('');
      refresh();
    }
  };

  if (loading) return <div className="mf-fg-dim">Loading…</div>;
  if (items.length === 0) {
    return (
      <div className="mf-card mf-fg-dim" style={{ padding: 24, textAlign: 'center' }}>
        No pending transformations.
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {items.map((item) => (
        <div key={item.id} className="mf-card" style={{ padding: 16 }}>
          <div
            className="mf-eyebrow"
            style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}
          >
            <span>
              {item.trainer.user.name ?? item.trainer.user.email}
              {item.trainer.user.trainerSlug ? ` · ${item.trainer.user.trainerSlug}` : ''}
            </span>
            <span className="mf-fg-mute">
              {new Date(item.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.beforePhotoUrl}
              alt="Before"
              style={{ width: '100%', aspectRatio: '4 / 5', objectFit: 'cover', borderRadius: 4 }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.afterPhotoUrl}
              alt="After"
              style={{ width: '100%', aspectRatio: '4 / 5', objectFit: 'cover', borderRadius: 4 }}
            />
          </div>
          {item.caption && (
            <div style={{ fontSize: 13, marginTop: 8 }}>{item.caption}</div>
          )}
          {item.durationWeeks && (
            <div className="mf-fg-dim" style={{ fontSize: 11, marginTop: 4 }}>
              {item.durationWeeks} weeks
            </div>
          )}

          {rejectingId === item.id ? (
            <div style={{ marginTop: 12 }}>
              <textarea
                className="mf-input"
                rows={2}
                placeholder="Reason (shown to trainer)"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                maxLength={500}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => act(item.id, 'reject', rejectReason || undefined)}
                  className="mf-btn"
                  style={{ color: '#fca5a5' }}
                >
                  Confirm reject
                </button>
                <button
                  type="button"
                  onClick={() => setRejectingId(null)}
                  className="mf-btn"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button
                type="button"
                onClick={() => act(item.id, 'approve')}
                className="mf-btn mf-btn-primary"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => setRejectingId(item.id)}
                className="mf-btn"
                style={{ color: '#fca5a5' }}
              >
                Reject
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
