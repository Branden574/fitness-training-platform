'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface TrainerSelection {
  id: string | null;
  name: string | null;
}

export interface ApplyFormProps {
  selection: TrainerSelection;
  trainerPhone?: string;
  waitlist?: boolean;
}

type Goal = 'get-stronger' | 'lose-weight-recomp' | 'other';

export function ApplyForm({
  selection,
  trainerPhone = '(559) 365-2946',
  waitlist = false,
}: ApplyFormProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [goal, setGoal] = useState<Goal | null>(null);
  const [goalOther, setGoalOther] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !email.trim()) {
      setError('Name and email are required.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          trainerId: selection.id ?? undefined,
          goal: goal ?? undefined,
          goalOther: goal === 'other' ? goalOther.trim() : undefined,
          message: message.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || data.error || 'Submission failed. Try again.');
        return;
      }
      router.push('/apply/success');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const phoneHref = `sms:${trainerPhone.replace(/[^\d+]/g, '')}`;

  return (
    <form onSubmit={onSubmit} style={{ display: 'grid', gap: 16 }}>
      {/* Direct channel card */}
      <div
        style={{
          padding: 16,
          background: 'var(--mf-surface-2, #0E0E10)',
          border: '1px solid var(--mf-hairline, #1F1F22)',
          borderRadius: 6,
        }}
      >
        <div
          className="mf-eyebrow"
          style={{ marginBottom: 8 }}
        >
          FASTEST REPLY
        </div>
        <a
          href={phoneHref}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            height: 40,
            padding: '0 16px',
            background: 'var(--mf-accent, #FF4D1C)',
            color: '#0A0A0B',
            fontFamily: 'var(--font-mf-mono), monospace',
            fontSize: 11,
            letterSpacing: '.18em',
            fontWeight: 700,
            borderRadius: 4,
            textDecoration: 'none',
          }}
        >
          Text · {trainerPhone}
        </a>
        <div
          className="mf-fg-dim"
          style={{ fontSize: 11, marginTop: 8 }}
        >
          Or write it out below.
        </div>
      </div>

      {/* Selection chip */}
      <div
        className="mf-eyebrow"
        style={{ marginBottom: -6 }}
      >
        {selection.id
          ? `APPLYING TO · ${selection.name?.toUpperCase()}`
          : 'APPLYING · NO PREFERENCE'}
      </div>

      <Field label="NAME" required>
        <input
          className="mf-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          maxLength={120}
        />
      </Field>

      <Field label="EMAIL" required>
        <input
          type="email"
          className="mf-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </Field>

      <Field label="PHONE" hint="Faster reply if you include it">
        <input
          type="tel"
          className="mf-input"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </Field>

      <Field label="WHAT ARE YOU TRYING TO DO?">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(['get-stronger', 'lose-weight-recomp', 'other'] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGoal(g)}
              style={{
                height: 36,
                padding: '0 14px',
                background:
                  goal === g ? 'var(--mf-accent, #FF4D1C)' : 'transparent',
                color: goal === g ? '#0A0A0B' : 'var(--mf-fg, #F4F4F5)',
                border: '1px solid var(--mf-hairline, #1F1F22)',
                borderRadius: 4,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {g === 'get-stronger' && 'Get stronger'}
              {g === 'lose-weight-recomp' && 'Lose weight / recomp'}
              {g === 'other' && 'Other →'}
            </button>
          ))}
        </div>
        {goal === 'other' && (
          <input
            className="mf-input"
            style={{ marginTop: 8 }}
            placeholder="Describe your goal"
            value={goalOther}
            onChange={(e) => setGoalOther(e.target.value)}
            maxLength={200}
          />
        )}
      </Field>

      <Field label="MESSAGE (OPTIONAL)">
        <textarea
          className="mf-input"
          rows={4}
          maxLength={500}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </Field>

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

      <button
        type="submit"
        disabled={submitting}
        className="mf-btn mf-btn-primary"
        style={{ height: 44 }}
      >
        {submitting
          ? 'Submitting…'
          : waitlist
            ? 'Join waitlist'
            : 'Submit application →'}
      </button>
    </form>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: 'block' }}>
      <div
        style={{
          fontFamily: 'var(--font-mf-mono), monospace',
          fontSize: 10,
          letterSpacing: '.15em',
          color: 'var(--mf-fg-dim, #86868B)',
          marginBottom: 6,
        }}
      >
        {label}
        {required && (
          <span style={{ color: 'var(--mf-accent, #FF4D1C)', marginLeft: 4 }}>
            *
          </span>
        )}
      </div>
      {children}
      {hint && (
        <div
          style={{
            fontSize: 10,
            color: 'var(--mf-fg-mute, #6b6b70)',
            marginTop: 4,
          }}
        >
          {hint}
        </div>
      )}
    </label>
  );
}
