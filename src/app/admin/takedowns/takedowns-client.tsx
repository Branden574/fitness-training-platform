'use client';

import { useEffect, useState } from 'react';

interface Takedown {
  id: string;
  contentType: string;
  contentId: string;
  reporterEmail: string;
  reporterName: string | null;
  reason: string;
  status: string;
  createdAt: string;
}

export default function TakedownsClient() {
  const [items, setItems] = useState<Takedown[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    refresh();
  }, []);

  const refresh = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/takedowns', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      setItems(data.items ?? []);
    }
    setLoading(false);
  };

  const resolve = async (id: string, resolution: 'remove' | 'keep', n?: string) => {
    const res = await fetch('/api/admin/takedowns', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, resolution, note: n }),
    });
    if (res.ok) {
      setResolvingId(null);
      setNote('');
      refresh();
    }
  };

  if (loading) return <div className="mf-fg-dim">Loading…</div>;
  if (items.length === 0) {
    return (
      <div className="mf-card mf-fg-dim" style={{ padding: 24, textAlign: 'center' }}>
        No open takedown requests.
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
              {item.contentType.toUpperCase()} · {item.contentId.slice(0, 12)}…
            </span>
            <span className="mf-fg-mute">
              {new Date(item.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div className="mf-fg-dim" style={{ fontSize: 12, marginBottom: 10 }}>
            Reporter: {item.reporterName ?? '(no name)'} &lt;{item.reporterEmail}&gt;
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
            {item.reason}
          </div>

          {resolvingId === item.id ? (
            <div style={{ marginTop: 12 }}>
              <textarea
                className="mf-input"
                rows={2}
                placeholder="Resolution note (internal)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={1000}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => resolve(item.id, 'remove', note || undefined)}
                  className="mf-btn"
                  style={{ color: '#fca5a5' }}
                >
                  Confirm remove content
                </button>
                <button
                  type="button"
                  onClick={() => resolve(item.id, 'keep', note || undefined)}
                  className="mf-btn"
                >
                  Keep as-is
                </button>
                <button
                  type="button"
                  onClick={() => setResolvingId(null)}
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
                onClick={() => setResolvingId(item.id)}
                className="mf-btn mf-btn-primary"
              >
                Resolve
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
