'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Check, Copy, Loader2, Mail } from 'lucide-react';
import { Btn } from '@/components/ui/mf';

export default function NewInvitationClient() {
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
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? 'Could not create invitation');
        setSubmitting(false);
        return;
      }
      // POST returns { invitation: { code, ... } } OR the duplicate branch returns { code }
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

  if (!open) {
    return (
      <Btn variant="primary" icon={Plus} onClick={() => setOpen(true)}>
        New invitation
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
        <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
          <div>
            <div className="mf-eyebrow">NEW INVITATION</div>
            <div
              className="mf-font-display"
              style={{ fontSize: 20, letterSpacing: '-0.01em' }}
            >
              Issue invite code
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={() => {
              setOpen(false);
              setSent(null);
              setError(null);
            }}
            className="mf-fg-mute"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}
          >
            <X size={16} />
          </button>
        </div>

        {!sent ? (
          <>
            <label className="block" style={{ marginBottom: 12 }}>
              <div className="mf-eyebrow" style={{ marginBottom: 6 }}>EMAIL</div>
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
              <div className="mf-eyebrow" style={{ marginBottom: 6 }}>PHONE · OPTIONAL</div>
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
                className="mf-chip mf-chip-bad"
                style={{ display: 'block', padding: '8px 12px', height: 'auto', marginBottom: 12 }}
              >
                {error}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Btn onClick={() => setOpen(false)}>Cancel</Btn>
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
                background: 'linear-gradient(180deg, rgba(255,77,28,0.08), transparent 60%)',
                borderColor: 'var(--mf-accent)',
              }}
            >
              <div
                className="flex items-center gap-2"
                style={{ marginBottom: 8, color: 'var(--mf-green)' }}
              >
                <Check size={14} />
                <span className="mf-font-mono" style={{ fontSize: 10, letterSpacing: '0.1em' }}>
                  INVITATION ISSUED
                </span>
              </div>
              <div
                className="mf-font-display mf-tnum mf-accent"
                style={{ fontSize: 40, lineHeight: 1, letterSpacing: '0.05em' }}
              >
                {sent.code}
              </div>
              <div className="mf-fg-dim" style={{ fontSize: 12, marginTop: 8 }}>
                Sent to <strong>{sent.email}</strong>. Share the code or the invite link.
              </div>
            </div>
            <div className="flex justify-between gap-2">
              <Btn
                icon={Copy}
                onClick={() => navigator.clipboard?.writeText(sent.code)}
              >
                Copy code
              </Btn>
              <Btn
                variant="primary"
                onClick={() => {
                  setSent(null);
                }}
              >
                Issue another
              </Btn>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
