'use client';

import { useState } from 'react';

export default function NotifyMeForm({
  slug,
  trainerName,
}: {
  slug: string;
  trainerName: string;
}) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<
    'idle' | 'submitting' | 'done' | 'error' | 'reopened'
  >('idle');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setState('submitting');
    try {
      const res = await fetch(`/api/trainers/${slug}/notify-me`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (res.status === 409) {
        setState('reopened');
        return;
      }
      if (!res.ok) {
        setState('error');
        return;
      }
      setState('done');
    } catch {
      setState('error');
    }
  };

  if (state === 'done') {
    return (
      <div
        className="mf-card"
        style={{ padding: 24, textAlign: 'center', borderStyle: 'dashed' }}
      >
        <div className="mf-eyebrow" style={{ marginBottom: 8 }}>NOTIFY LIST</div>
        <div style={{ fontSize: 14 }}>
          Got it — we&apos;ll email you the moment {trainerName} reopens.
        </div>
      </div>
    );
  }

  if (state === 'reopened') {
    return (
      <div
        className="mf-card"
        style={{ padding: 24, textAlign: 'center', borderStyle: 'dashed' }}
      >
        <div className="mf-eyebrow" style={{ marginBottom: 8 }}>GOOD NEWS</div>
        <div style={{ fontSize: 14, marginBottom: 12 }}>
          {trainerName} just reopened. Refresh to apply.
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mf-btn"
          style={{ height: 40 }}
        >
          Refresh
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="mf-card"
      style={{ padding: 24, display: 'grid', gap: 12 }}
    >
      <div className="mf-eyebrow">NOT TAKING NEW CLIENTS RIGHT NOW</div>
      <div style={{ fontSize: 14, lineHeight: 1.5 }}>
        {trainerName} isn&apos;t taking new clients right now. Drop your email and we&apos;ll
        let you know the moment they reopen.
      </div>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="mf-input"
        style={{ height: 40 }}
      />
      <button
        type="submit"
        disabled={state === 'submitting'}
        className="mf-btn"
        style={{ height: 40 }}
      >
        {state === 'submitting' ? 'SENDING…' : 'Notify me'}
      </button>
      {state === 'error' && (
        <div role="alert" style={{ fontSize: 12, color: '#fca5a5' }}>
          Something went wrong. Try again in a moment.
        </div>
      )}
    </form>
  );
}
