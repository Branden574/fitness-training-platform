'use client';

import { useEffect, useState } from 'react';
import { AgreementGate } from '@/components/trainer/AgreementGate';

interface Testimonial {
  id: string;
  quote: string;
  attribution: string;
  order: number;
}

export default function TestimonialsClient() {
  return (
    <AgreementGate>
      <TestimonialsList />
    </AgreementGate>
  );
}

function TestimonialsList() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState('');
  const [attribution, setAttribution] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuote, setEditQuote] = useState('');
  const [editAttribution, setEditAttribution] = useState('');

  useEffect(() => {
    refresh();
  }, []);

  const refresh = async () => {
    setLoading(true);
    const res = await fetch('/api/trainers/me/testimonials', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      setItems(data.items ?? []);
    }
    setLoading(false);
  };

  const add = async () => {
    setError(null);
    if (quote.trim().length < 5 || !attribution.trim()) {
      setError('Quote must be at least 5 characters and attribution is required.');
      return;
    }
    setSubmitting(true);
    const res = await fetch('/api/trainers/me/testimonials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quote: quote.trim(), attribution: attribution.trim() }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Add failed');
      return;
    }
    setQuote('');
    setAttribution('');
    refresh();
  };

  const startEdit = (item: Testimonial) => {
    setEditingId(item.id);
    setEditQuote(item.quote);
    setEditAttribution(item.attribution);
  };

  const saveEdit = async (id: string) => {
    const res = await fetch(`/api/trainers/me/testimonials/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quote: editQuote.trim(), attribution: editAttribution.trim() }),
    });
    if (res.ok) {
      setEditingId(null);
      refresh();
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this testimonial?')) return;
    const res = await fetch(`/api/trainers/me/testimonials/${id}`, { method: 'DELETE' });
    if (res.ok) refresh();
  };

  const move = async (id: string, direction: 'up' | 'down') => {
    const idx = items.findIndex((i) => i.id === id);
    if (idx < 0) return;
    const other = direction === 'up' ? idx - 1 : idx + 1;
    if (other < 0 || other >= items.length) return;
    const a = items[idx];
    const b = items[other];
    await Promise.all([
      fetch(`/api/trainers/me/testimonials/${a.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: b.order }),
      }),
      fetch(`/api/trainers/me/testimonials/${b.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: a.order }),
      }),
    ]);
    refresh();
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="mf-card" style={{ padding: 16 }}>
        <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
          ADD TESTIMONIAL
        </div>
        <textarea
          className="mf-input"
          rows={3}
          placeholder="Quote (5–500 chars)"
          value={quote}
          onChange={(e) => setQuote(e.target.value)}
          maxLength={500}
        />
        <input
          className="mf-input"
          placeholder="Attribution (e.g. Sarah K.)"
          style={{ marginTop: 8 }}
          value={attribution}
          onChange={(e) => setAttribution(e.target.value)}
          maxLength={120}
        />
        {error && (
          <div role="alert" style={{ color: '#fca5a5', fontSize: 12, marginTop: 8 }}>
            {error}
          </div>
        )}
        <button
          type="button"
          onClick={add}
          disabled={submitting}
          className="mf-btn mf-btn-primary"
          style={{ marginTop: 12, height: 40 }}
        >
          {submitting ? 'Adding…' : 'Add testimonial'}
        </button>
      </div>

      <div className="mf-eyebrow">YOUR TESTIMONIALS · {items.length}</div>
      {loading ? (
        <div className="mf-fg-dim">Loading…</div>
      ) : items.length === 0 ? (
        <div className="mf-card mf-fg-dim" style={{ padding: 20, textAlign: 'center' }}>
          No testimonials yet.
        </div>
      ) : (
        items.map((item, i) => (
          <div key={item.id} className="mf-card" style={{ padding: 16 }}>
            {editingId === item.id ? (
              <>
                <textarea
                  className="mf-input"
                  rows={3}
                  value={editQuote}
                  onChange={(e) => setEditQuote(e.target.value)}
                  maxLength={500}
                />
                <input
                  className="mf-input"
                  style={{ marginTop: 8 }}
                  value={editAttribution}
                  onChange={(e) => setEditAttribution(e.target.value)}
                  maxLength={120}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => saveEdit(item.id)}
                    className="mf-btn mf-btn-primary"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="mf-btn"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 14, lineHeight: 1.5 }}>&ldquo;{item.quote}&rdquo;</div>
                <div
                  className="mf-fg-dim"
                  style={{ fontSize: 12, marginTop: 6 }}
                >
                  — {item.attribution}
                </div>
                <div
                  style={{ display: 'flex', gap: 6, marginTop: 10, alignItems: 'center' }}
                >
                  <button
                    type="button"
                    onClick={() => move(item.id, 'up')}
                    disabled={i === 0}
                    className="mf-btn"
                    style={{ padding: '0 10px', height: 32 }}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(item.id, 'down')}
                    disabled={i === items.length - 1}
                    className="mf-btn"
                    style={{ padding: '0 10px', height: 32 }}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(item)}
                    className="mf-btn"
                    style={{ padding: '0 10px', height: 32 }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    className="mf-btn"
                    style={{ padding: '0 10px', height: 32, color: '#fca5a5' }}
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        ))
      )}
    </div>
  );
}
