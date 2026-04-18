'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import { Btn } from '@/components/ui/mf';

type CodeState =
  | { status: 'idle' }
  | { status: 'validating' }
  | { status: 'valid'; trainerName: string; inviterEmail?: string }
  | { status: 'invalid'; message: string };

export default function SignUpFormClient() {
  const router = useRouter();

  const [code, setCode] = useState('');
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [terms, setTerms] = useState(true);
  const [codeState, setCodeState] = useState<CodeState>({ status: 'idle' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateCode = useCallback(async (value: string, contactEmail: string) => {
    if (value.length < 6 || !contactEmail) {
      setCodeState({ status: 'idle' });
      return;
    }
    setCodeState({ status: 'validating' });
    try {
      const res = await fetch('/api/invitations/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: value.toUpperCase(), email: contactEmail }),
      });
      const data = await res.json();
      if (res.ok && data.invitation) {
        const trainerName =
          data.invitation.trainer?.name ??
          data.invitation.inviter?.name ??
          'your trainer';
        setCodeState({
          status: 'valid',
          trainerName,
          inviterEmail: data.invitation.trainer?.email ?? data.invitation.inviter?.email,
        });
      } else {
        setCodeState({
          status: 'invalid',
          message: data.message ?? 'Invalid invitation code',
        });
      }
    } catch {
      setCodeState({ status: 'invalid', message: 'Could not verify code right now' });
    }
  }, []);

  // Debounce-validate as the user fills in code + email
  useEffect(() => {
    const t = setTimeout(() => {
      if (code && email) {
        void validateCode(code, email);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [code, email, validateCode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (codeState.status !== 'valid') {
      setError('Please enter a valid invite code before continuing.');
      return;
    }
    if (!first.trim() || !last.trim()) {
      setError('Please enter your first and last name.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (!terms) {
      setError('Please accept the terms to continue.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${first.trim()} ${last.trim()}`,
          email,
          password,
          invitationCode: code.toUpperCase(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? 'Could not create your account.');
        setSubmitting(false);
        return;
      }
      const signInResult = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });
      if (signInResult?.ok) {
        router.push('/client/dashboard');
      } else {
        router.push('/auth/signin?message=Account created. Please sign in.');
      }
    } catch {
      setError('Network error. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error && (
        <div
          className="mf-chip mf-chip-bad"
          style={{
            height: 'auto',
            width: '100%',
            padding: '8px 12px',
            marginBottom: 16,
            display: 'block',
            fontSize: 12,
          }}
          role="alert"
        >
          {error}
        </div>
      )}

      <label className="block">
        <div className="mf-eyebrow" style={{ marginBottom: 8 }}>INVITE CODE</div>
        <input
          className="mf-input mf-font-mono"
          style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="XX-XXXX-XXXX"
          maxLength={24}
          required
        />
        {codeState.status === 'validating' && (
          <div
            className="flex items-center gap-2 mf-fg-dim mf-font-mono"
            style={{ marginTop: 8, fontSize: 11 }}
          >
            <Loader2 size={12} className="animate-spin" /> VERIFYING…
          </div>
        )}
        {codeState.status === 'valid' && (
          <div
            className="flex items-center gap-2 mf-font-mono"
            style={{ marginTop: 8, fontSize: 11, color: 'var(--mf-green)' }}
          >
            <Check size={12} /> VALID · {codeState.trainerName.toUpperCase()}
          </div>
        )}
        {codeState.status === 'invalid' && (
          <div
            className="flex items-center gap-2 mf-font-mono"
            style={{ marginTop: 8, fontSize: 11, color: 'var(--mf-red)' }}
          >
            × {codeState.message.toUpperCase()}
          </div>
        )}
      </label>

      <div className="grid grid-cols-2 gap-3" style={{ marginTop: 16 }}>
        <label className="block">
          <div className="mf-eyebrow" style={{ marginBottom: 8 }}>FIRST</div>
          <input
            className="mf-input"
            value={first}
            onChange={(e) => setFirst(e.target.value)}
            required
            autoComplete="given-name"
          />
        </label>
        <label className="block">
          <div className="mf-eyebrow" style={{ marginBottom: 8 }}>LAST</div>
          <input
            className="mf-input"
            value={last}
            onChange={(e) => setLast(e.target.value)}
            required
            autoComplete="family-name"
          />
        </label>
      </div>

      <label className="block" style={{ marginTop: 16 }}>
        <div className="mf-eyebrow" style={{ marginBottom: 8 }}>EMAIL</div>
        <input
          type="email"
          className="mf-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          placeholder="you@example.com"
        />
      </label>

      <label className="block" style={{ marginTop: 16 }}>
        <div className="mf-eyebrow" style={{ marginBottom: 8 }}>PASSWORD</div>
        <input
          type="password"
          className="mf-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
          placeholder="At least 8 characters"
        />
      </label>

      <label
        className="flex items-start gap-2 cursor-pointer mf-fg-dim"
        style={{ marginTop: 20, fontSize: 11 }}
      >
        <input
          type="checkbox"
          checked={terms}
          onChange={(e) => setTerms(e.target.checked)}
          style={{ marginTop: 2 }}
        />
        I agree to the terms and acknowledge my trainer gets read access to my logs and
        progress photos.
      </label>

      <Btn
        variant="primary"
        type="submit"
        icon={ArrowRight}
        className="w-full"
        disabled={submitting || codeState.status !== 'valid'}
        style={{ height: 48, marginTop: 24 }}
      >
        {submitting ? 'Creating account…' : 'Create account'}
      </Btn>

      <div
        className="mf-fg-dim text-center"
        style={{ marginTop: 24, fontSize: 12 }}
      >
        Already in?{' '}
        <Link href="/auth/signin" className="mf-fg" style={{ textDecoration: 'underline' }}>
          Sign in
        </Link>
      </div>
    </form>
  );
}
