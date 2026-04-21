'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn, getSession } from 'next-auth/react';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Btn } from '@/components/ui/mf';
import { BootLoader } from '@/components/animations/BootLoader';

const SIGN_IN_BOOT_MESSAGES: Array<[number, string, number]> = [
  [220, 'AUTHENTICATED', 10],
  [320, 'LOADING · ROSTER', 32],
  [320, 'SYNCING · PROGRAMS', 58],
  [280, 'SYNCING · NUTRITION', 78],
  [260, 'READY · MARTINEZ FITNESS', 100],
];

export default function SignInFormClient() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [keepSigned, setKeepSigned] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bootDestination, setBootDestination] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error && result.error !== 'undefined') {
        setError('Invalid email or password. Please try again.');
        setLoading(false);
      } else if (result?.ok) {
        const session = await getSession();
        const destination =
          session?.user?.role === 'ADMIN'
            ? '/admin'
            : session?.user?.role === 'TRAINER'
              ? '/trainer'
              : '/client';
        // Hand off to the full-screen BootLoader. Once it finishes we mark the
        // session as booted so BootGate on the destination page doesn't play
        // the same animation again, then route. Loading stays true so the
        // button can't be double-clicked mid-boot.
        setBootDestination(destination);
      } else {
        setError('Something went wrong. Please try again.');
        setLoading(false);
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  function handleBootDone() {
    try {
      sessionStorage.setItem('mf.booted', '1');
    } catch {
      // private-mode or storage disabled — the destination BootGate just replays
    }
    if (bootDestination) {
      router.push(bootDestination);
      router.refresh();
    }
  }

  return (
    <>
      {bootDestination && (
        <BootLoader onDone={handleBootDone} messages={SIGN_IN_BOOT_MESSAGES} />
      )}
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
        <div className="mf-eyebrow" style={{ marginBottom: 8 }}>EMAIL</div>
        <input
          type="email"
          className="mf-input"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </label>

      <label className="block" style={{ marginTop: 16 }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
          <div className="mf-eyebrow">PASSWORD</div>
          <Link
            href="/contact"
            className="mf-fg-dim hover:text-[color:var(--mf-fg)]"
            style={{ fontSize: 11 }}
          >
            Forgot?
          </Link>
        </div>
        <div style={{ position: 'relative' }}>
          <input
            type={showPw ? 'text' : 'password'}
            className="mf-input"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            style={{ paddingRight: 40 }}
          />
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            className="mf-fg-mute"
            aria-label={showPw ? 'Hide password' : 'Show password'}
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </label>

      <div className="flex items-center justify-between mf-fg-dim" style={{ marginTop: 16, fontSize: 12 }}>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={keepSigned}
            onChange={(e) => setKeepSigned(e.target.checked)}
          />
          Keep me signed in
        </label>
        <span className="mf-font-mono mf-fg-mute">30-day session</span>
      </div>

      <Btn
        variant="primary"
        type="submit"
        icon={ArrowRight}
        className="w-full"
        disabled={loading}
        style={{ height: 48, marginTop: 24 }}
      >
        {loading ? 'Signing in…' : 'Sign in'}
      </Btn>

      <div
        className="mf-fg-dim text-center"
        style={{ marginTop: 24, fontSize: 12 }}
      >
        No account?{' '}
        <Link href="/auth/signup" className="mf-fg" style={{ textDecoration: 'underline' }}>
          Request invite code
        </Link>
      </div>
    </form>
    </>
  );
}
