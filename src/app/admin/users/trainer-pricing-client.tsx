'use client';

import { useEffect, useRef, useState } from 'react';

type Tier = 'FREE' | 'STARTER' | 'PRO' | 'CUSTOM';

interface Props {
  userId: string;
  initialTier: Tier | null;
  initialPrice: number | null;
  initialStatus: string | null;
}

const TIER_DEFAULT_PRICE: Record<Tier, number | null> = {
  FREE: 0,
  STARTER: 29,
  PRO: 99,
  CUSTOM: null,
};

export default function TrainerPricingClient({
  userId,
  initialTier,
  initialPrice,
  initialStatus,
}: Props) {
  const [tier, setTier] = useState<Tier | null>(initialTier);
  const [price, setPrice] = useState<number | null>(initialPrice);
  const [status, setStatus] = useState<string | null>(initialStatus);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editing) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setEditing(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setEditing(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [editing]);

  const save = async (next: {
    tier?: Tier | null;
    monthlyPrice?: number | null;
  }) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/trainers/${userId}/pricing`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Save failed');
        return;
      }
      const data = await res.json();
      setTier((data.subscriptionTier ?? null) as Tier | null);
      setPrice(data.monthlyPrice ?? null);
      setStatus(data.subscriptionStatus ?? null);
    } finally {
      setSaving(false);
    }
  };

  const displayPrice =
    price != null
      ? `$${price}`
      : tier && TIER_DEFAULT_PRICE[tier] != null
        ? `$${TIER_DEFAULT_PRICE[tier]}`
        : '—';

  const chipColor =
    tier === 'FREE'
      ? 'var(--mf-fg-dim)'
      : status === 'active' || status === 'trialing'
        ? '#86efac'
        : status === 'past_due' || status === 'canceled'
          ? '#fca5a5'
          : 'var(--mf-fg-dim)';

  const chipBg =
    tier === 'FREE'
      ? 'rgba(134, 239, 172, 0.06)'
      : status === 'past_due' || status === 'canceled'
        ? 'rgba(252, 165, 165, 0.08)'
        : 'transparent';

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="mf-font-mono"
        style={{
          height: 24,
          padding: '0 8px',
          fontSize: 10,
          letterSpacing: '0.1em',
          borderRadius: 4,
          border: '1px solid var(--mf-hairline)',
          background: chipBg,
          color: chipColor,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
        title="Click to edit tier + price"
      >
        {tier ?? 'UNSET'} · {displayPrice}
      </button>
    );
  }

  return (
    <div
      ref={ref}
      className="mf-card"
      style={{
        padding: 8,
        display: 'flex',
        gap: 6,
        alignItems: 'center',
        minWidth: 260,
      }}
    >
      <select
        value={tier ?? ''}
        onChange={(e) => {
          const next = (e.target.value || null) as Tier | null;
          setTier(next);
          save({ tier: next });
        }}
        disabled={saving}
        className="mf-input"
        style={{ height: 28, fontSize: 11, padding: '0 8px' }}
      >
        <option value="">UNSET</option>
        <option value="FREE">FREE</option>
        <option value="STARTER">STARTER</option>
        <option value="PRO">PRO</option>
        <option value="CUSTOM">CUSTOM</option>
      </select>
      <input
        type="number"
        min={0}
        max={10000}
        value={price ?? ''}
        placeholder="$"
        onChange={(e) =>
          setPrice(e.target.value === '' ? null : Number(e.target.value))
        }
        onBlur={() => save({ monthlyPrice: price })}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
            setEditing(false);
          }
        }}
        disabled={saving}
        className="mf-input"
        style={{ height: 28, width: 70, fontSize: 11, padding: '0 8px' }}
      />
      {error ? (
        <span
          role="alert"
          className="mf-font-mono"
          style={{ fontSize: 9, color: '#fca5a5' }}
        >
          {error}
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="mf-btn mf-btn-ghost"
          style={{ height: 28, padding: '0 8px', fontSize: 11 }}
        >
          done
        </button>
      )}
    </div>
  );
}
