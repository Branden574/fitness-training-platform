'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Check, Copy, Loader2, Mail } from 'lucide-react';
import { Btn } from '@/components/ui/mf';

// Trainer-scoped invite flow. Always issues a CLIENT-role invitation
// (API blocks non-CLIENT for TRAINER callers anyway) and stays in a modal
// on the roster page — no separate /trainer/invitations page needed.
//
// Replaces the old /register-with-code link that used to live on "Invite
// athlete" — that was the CLIENT redemption page and sending the trainer
// there was the wrong UX entirely.
interface Props {
  compact?: boolean;
}

export default function InviteAthleteClient({ compact = false }: Props = {}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ code: string; email: string } | null>(null);

  async function handleCreate() {
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          role: 'CLIENT',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? 'Could not create invitation');
        setSubmitting(false);
        return;
      }
      const code = data?.invitation?.code ?? data?.code;
      setSent({ code, email: email.trim() });
      setEmail('');
      setPhone('');
      setSubmitting(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create');
      setSubmitting(false);
    }
  }

  const close = () => {
    setOpen(false);
    setSent(null);
    setError(null);
  };

  if (!open) {
    // `compact` renders the mobile-roster square-icon trigger style; default
    // is the desktop text-button.
    if (compact) {
      return (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Invite athlete"
          className="grid place-items-center rounded"
          style={{
            width: 36,
            height: 36,
            background: 'var(--mf-accent)',
            color: 'var(--mf-accent-ink)',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <Plus size={14} />
        </button>
      );
    }
    return (
      <Btn icon={Plus} onClick={() => setOpen(true)}>
        Invite athlete
      </Btn>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        className="mf-card-elev"
        style={{ maxWidth: 480, width: '100%', padding: 24 }}
      >
        <div
          className="flex items-center justify-between"
          style={{ marginBottom: 16 }}
        >
          <div>
            <div className="mf-eyebrow">NEW CLIENT</div>
            <div
              className="mf-font-display"
              style={{ fontSize: 20, letterSpacing: '-0.01em' }}
            >
              Invite athlete
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="mf-fg-mute"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {!sent ? (
          <>
            <label className="block" style={{ marginBottom: 12 }}>
              <div className="mf-eyebrow" style={{ marginBottom: 6 }}>
                EMAIL
              </div>
              <input
                className="mf-input"
                type="email"
                autoFocus
                placeholder="athlete@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="block" style={{ marginBottom: 16 }}>
              <div className="mf-eyebrow" style={{ marginBottom: 6 }}>
                PHONE · OPTIONAL
              </div>
              <input
                className="mf-input"
                type="tel"
                placeholder="(555) 555-0123"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
            {error && (
              <div
                role="alert"
                style={{
                  padding: '8px 12px',
                  marginBottom: 12,
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
            <div className="flex justify-end gap-2">
              <Btn onClick={close}>Cancel</Btn>
              <Btn
                variant="primary"
                icon={submitting ? Loader2 : Mail}
                onClick={handleCreate}
                disabled={submitting}
              >
                {submitting ? 'Creating…' : 'Generate code'}
              </Btn>
            </div>
          </>
        ) : (
          <>
            <div
              className="mf-card"
              style={{
                padding: 16,
                marginBottom: 16,
                background:
                  'linear-gradient(180deg, rgba(255,77,28,0.08), transparent 60%)',
                borderColor: 'var(--mf-accent)',
              }}
            >
              <div
                className="flex items-center gap-2"
                style={{ marginBottom: 8, color: 'var(--mf-green)' }}
              >
                <Check size={14} />
                <span
                  className="mf-font-mono"
                  style={{ fontSize: 10, letterSpacing: '0.1em' }}
                >
                  CLIENT INVITATION ISSUED
                </span>
              </div>
              <div
                className="mf-font-display mf-tnum mf-accent"
                style={{ fontSize: 40, lineHeight: 1, letterSpacing: '0.05em' }}
              >
                {sent.code}
              </div>
              <div
                className="mf-fg-dim"
                style={{ fontSize: 12, marginTop: 8 }}
              >
                Share the code with <strong>{sent.email}</strong>. They sign up
                at <code>/auth/signup</code> and enter the code.
              </div>
            </div>
            <div className="flex justify-between gap-2">
              <Btn
                icon={Copy}
                onClick={() => navigator.clipboard?.writeText(sent.code)}
              >
                Copy code
              </Btn>
              <Btn variant="primary" onClick={() => setSent(null)}>
                Invite another
              </Btn>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
