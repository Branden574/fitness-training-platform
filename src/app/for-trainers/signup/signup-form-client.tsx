'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignupFormClient() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 10) {
      setError('Password must be at least 10 characters.');
      return;
    }
    if (!agree) {
      setError('Please agree to the platform terms before continuing.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/trainers/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          agreesToTerms: true,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Signup failed. Try again.');
        return;
      }
      // Auto-sign-in so they land in /trainer already authenticated. If the
      // sign-in leg fails (rare: env drift, session cookie rejected), fall
      // back to sending them through the regular signin page — no credentials
      // lost, just an extra click.
      const signinRes = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });
      if (signinRes?.ok) {
        router.push('/trainer');
        router.refresh();
      } else {
        router.push('/auth/signin');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} style={{ display: 'grid', gap: 16 }}>
      <Field label="FULL NAME" required>
        <input
          className="mf-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          minLength={2}
          maxLength={120}
          required
          autoComplete="name"
        />
      </Field>
      <Field label="EMAIL" required>
        <input
          type="email"
          className="mf-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </Field>
      <Field label="PASSWORD" required hint="At least 10 characters.">
        <input
          type="password"
          className="mf-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={10}
          required
          autoComplete="new-password"
        />
      </Field>
      <label
        style={{
          display: 'flex',
          gap: 8,
          fontSize: 12,
          alignItems: 'flex-start',
        }}
      >
        <input
          type="checkbox"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
          style={{ marginTop: 3 }}
        />
        <span className="mf-fg-dim">
          I agree to the Martinez/Fitness{' '}
          <Link
            href="/legal/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="mf-link"
          >
            trainer terms
          </Link>{' '}
          +{' '}
          <Link
            href="/legal/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="mf-link"
          >
            privacy policy
          </Link>
          , and understand I&apos;m responsible for the accuracy of
          client-facing claims on my profile.
        </span>
      </label>
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
        {submitting ? 'Creating account…' : 'Start 14-day trial →'}
      </button>
      <div
        className="mf-fg-dim"
        style={{ fontSize: 12, textAlign: 'center', marginTop: 4 }}
      >
        Already have an account?{' '}
        <Link href="/auth/signin" style={{ color: 'var(--mf-accent)' }}>
          Sign in
        </Link>
      </div>
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
  children: ReactNode;
}) {
  return (
    <label style={{ display: 'block' }}>
      <div
        style={{
          fontFamily: 'var(--font-mf-mono), monospace',
          fontSize: 10,
          letterSpacing: '.15em',
          color: 'var(--mf-fg-dim)',
          marginBottom: 6,
        }}
      >
        {label}
        {required && (
          <span style={{ color: 'var(--mf-accent)', marginLeft: 4 }}>*</span>
        )}
      </div>
      {children}
      {hint && (
        <div
          style={{
            fontSize: 10,
            color: 'var(--mf-fg-mute)',
            marginTop: 4,
          }}
        >
          {hint}
        </div>
      )}
    </label>
  );
}
