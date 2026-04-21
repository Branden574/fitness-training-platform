'use client';

import { useState } from 'react';

type Tier = 'FREE' | 'STARTER' | 'PRO' | 'CUSTOM';

interface Props {
  initial: {
    tier: Tier | null;
    status: string | null;
    monthlyPrice: number | null;
    hasCustomer: boolean;
    hasSubscription: boolean;
    connectOnboarded: boolean;
    connectChargesEnabled: boolean;
    connectPayoutsEnabled: boolean;
  };
}

const TIER_CARDS: Array<{
  tier: 'STARTER' | 'PRO';
  label: string;
  price: number;
  blurb: string;
}> = [
  {
    tier: 'STARTER',
    label: 'Starter',
    price: 29,
    blurb: 'Up to 20 active clients · public directory · apply link + QR',
  },
  {
    tier: 'PRO',
    label: 'Pro',
    price: 99,
    blurb: 'Unlimited clients · priority directory placement · coach analytics',
  },
];

export default function BillingClient({ initial }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upgrade = async (tier: 'STARTER' | 'PRO') => {
    setError(null);
    setBusy(tier);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Checkout unavailable');
        return;
      }
      if (data.url) window.location.href = data.url;
    } finally {
      setBusy(null);
    }
  };

  const openPortal = async () => {
    setError(null);
    setBusy('portal');
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Portal unavailable');
        return;
      }
      if (data.url) window.location.href = data.url;
    } finally {
      setBusy(null);
    }
  };

  const openConnect = async () => {
    setError(null);
    setBusy('connect');
    try {
      const res = await fetch('/api/connect/onboarding-link', {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Connect onboarding unavailable');
        return;
      }
      if (data.url) window.location.href = data.url;
    } finally {
      setBusy(null);
    }
  };

  const isFree = initial.tier === 'FREE' || initial.status === 'free';
  const statusColor =
    initial.status === 'active' || initial.status === 'trialing'
      ? '#86efac'
      : initial.status === 'past_due' || initial.status === 'canceled'
        ? '#fca5a5'
        : 'var(--mf-fg-dim)';

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {error && (
        <div
          role="alert"
          style={{
            padding: '10px 12px',
            background: '#2a1212',
            border: '1px solid #6b1f1f',
            color: '#fca5a5',
            borderRadius: 4,
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}

      {/* Subscription */}
      <section className="mf-card" style={{ padding: 20 }}>
        <div className="mf-eyebrow">PLATFORM SUBSCRIPTION</div>
        <div
          className="mf-font-display"
          style={{ fontSize: 24, marginTop: 8, letterSpacing: '-0.01em' }}
        >
          {isFree
            ? 'Foundation — free'
            : initial.tier
              ? `${initial.tier[0]}${initial.tier.slice(1).toLowerCase()} plan`
              : 'No plan yet'}
        </div>
        <div
          className="mf-font-mono"
          style={{
            fontSize: 11,
            marginTop: 6,
            color: statusColor,
            letterSpacing: '0.1em',
          }}
        >
          STATUS · {(initial.status ?? 'UNSET').toUpperCase()}
          {initial.monthlyPrice != null
            ? ` · $${initial.monthlyPrice}/MO`
            : ''}
        </div>

        {isFree ? (
          <div className="mf-fg-dim" style={{ fontSize: 13, marginTop: 16 }}>
            You&apos;re on a foundation account — no platform fee. Thanks for
            being an early supporter. Admin can flip you to a paid plan from
            the admin panel when you&apos;re ready.
          </div>
        ) : (
          <>
            <div
              className="mf-fg-dim"
              style={{ fontSize: 13, marginTop: 8 }}
            >
              {initial.hasSubscription
                ? 'Manage billing method, invoices, or cancel via the portal.'
                : "Pick a plan to get listed in the public trainer directory, or stay on the trial until it expires."}
            </div>
            <div
              style={{
                display: 'grid',
                gap: 10,
                marginTop: 16,
                gridTemplateColumns: initial.hasSubscription
                  ? '1fr'
                  : 'repeat(2, 1fr)',
              }}
            >
              {initial.hasSubscription ? (
                <button
                  type="button"
                  onClick={openPortal}
                  disabled={busy === 'portal'}
                  className="mf-btn"
                  style={{ height: 44 }}
                >
                  {busy === 'portal'
                    ? 'Opening portal…'
                    : 'Manage billing + invoices'}
                </button>
              ) : (
                TIER_CARDS.map((t) => (
                  <button
                    key={t.tier}
                    type="button"
                    onClick={() => upgrade(t.tier)}
                    disabled={busy === t.tier}
                    className="mf-card"
                    style={{
                      padding: 14,
                      textAlign: 'left',
                      background: 'var(--mf-surface-2)',
                      cursor: 'pointer',
                      display: 'grid',
                      gap: 4,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div
                        className="mf-font-display"
                        style={{ fontSize: 16 }}
                      >
                        {t.label}
                      </div>
                      <div
                        className="mf-font-mono mf-tnum"
                        style={{ fontSize: 13 }}
                      >
                        ${t.price}/mo
                      </div>
                    </div>
                    <div
                      className="mf-fg-dim"
                      style={{ fontSize: 11 }}
                    >
                      {t.blurb}
                    </div>
                    <div
                      className="mf-font-mono"
                      style={{
                        fontSize: 10,
                        color: 'var(--mf-accent)',
                        letterSpacing: '0.1em',
                        marginTop: 4,
                      }}
                    >
                      {busy === t.tier ? 'OPENING…' : 'UPGRADE →'}
                    </div>
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </section>

      {/* Stripe Connect */}
      <section className="mf-card" style={{ padding: 20 }}>
        <div className="mf-eyebrow">CLIENT PAYMENTS · STRIPE CONNECT</div>
        <div
          className="mf-fg-dim"
          style={{ fontSize: 13, marginTop: 8, lineHeight: 1.5 }}
        >
          Connect your Stripe account so clients can pay for coaching through
          the platform. Payouts go to your own bank. Martinez/Fitness takes a
          small application fee on each charge.
        </div>
        <div
          className="mf-font-mono"
          style={{
            fontSize: 11,
            marginTop: 12,
            letterSpacing: '0.1em',
            color: initial.connectOnboarded
              ? initial.connectChargesEnabled && initial.connectPayoutsEnabled
                ? '#86efac'
                : 'var(--mf-amber, #F5B544)'
              : 'var(--mf-fg-dim)',
          }}
        >
          {initial.connectOnboarded
            ? initial.connectChargesEnabled && initial.connectPayoutsEnabled
              ? '● CONNECTED · LIVE'
              : '◐ CONNECTED · STRIPE VERIFYING'
            : '○ NOT CONNECTED'}
        </div>
        <button
          type="button"
          onClick={openConnect}
          disabled={busy === 'connect'}
          className="mf-btn"
          style={{ height: 40, marginTop: 12 }}
        >
          {busy === 'connect'
            ? 'Opening Stripe…'
            : initial.connectOnboarded
              ? 'Manage Stripe account'
              : 'Connect Stripe account'}
        </button>
      </section>

      {/* Support note */}
      <div
        className="mf-fg-mute"
        style={{ fontSize: 11, textAlign: 'center', padding: '8px 0' }}
      >
        Billing questions? Reach out to admin — subscription changes from
        admin override your tier without touching Stripe.
      </div>
    </div>
  );
}
