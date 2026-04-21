'use client';

import { useState } from 'react';
import { Eye, EyeOff, Check, AlertCircle } from 'lucide-react';

export default function ChangePasswordClient() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const meetsComplexity = (pw: string) =>
    pw.length >= 8 &&
    /[a-z]/.test(pw) &&
    /[A-Z]/.test(pw) &&
    /\d/.test(pw) &&
    /[@$!%*?&]/.test(pw);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("New passwords don't match.");
      return;
    }
    if (!meetsComplexity(newPassword)) {
      setError(
        'Password must be 8+ chars with upper, lower, number, and one of @$!%*?&.',
      );
      return;
    }
    if (currentPassword === newPassword) {
      setError('New password must differ from the current one.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message || 'Password change failed. Try again.');
        return;
      }
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setError('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const fieldStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--mf-surface-2)',
    border: '1px solid var(--mf-hairline)',
    borderRadius: 4,
    color: 'var(--mf-fg)',
    padding: '10px 36px 10px 12px',
    fontSize: 13,
    fontFamily: 'var(--font-mf-sans), sans-serif',
  };

  const toggleStyle: React.CSSProperties = {
    position: 'absolute',
    right: 8,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'transparent',
    border: 'none',
    color: 'var(--mf-fg-mute)',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
  };

  return (
    <form onSubmit={onSubmit} style={{ display: 'grid', gap: 14 }}>
      <div>
        <label
          htmlFor="currentPassword"
          style={{
            fontFamily: 'var(--font-mf-mono), monospace',
            fontSize: 10,
            color: '#86868B',
            letterSpacing: '.15em',
            display: 'block',
            marginBottom: 6,
          }}
        >
          CURRENT PASSWORD
        </label>
        <div style={{ position: 'relative' }}>
          <input
            id="currentPassword"
            type={show.current ? 'text' : 'password'}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            required
            style={fieldStyle}
          />
          <button
            type="button"
            onClick={() => setShow((s) => ({ ...s, current: !s.current }))}
            style={toggleStyle}
            aria-label={show.current ? 'Hide password' : 'Show password'}
          >
            {show.current ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      <div>
        <label
          htmlFor="newPassword"
          style={{
            fontFamily: 'var(--font-mf-mono), monospace',
            fontSize: 10,
            color: '#86868B',
            letterSpacing: '.15em',
            display: 'block',
            marginBottom: 6,
          }}
        >
          NEW PASSWORD
        </label>
        <div style={{ position: 'relative' }}>
          <input
            id="newPassword"
            type={show.next ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
            style={fieldStyle}
          />
          <button
            type="button"
            onClick={() => setShow((s) => ({ ...s, next: !s.next }))}
            style={toggleStyle}
            aria-label={show.next ? 'Hide password' : 'Show password'}
          >
            {show.next ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mf-mono), monospace',
            fontSize: 9,
            color: '#86868B',
            letterSpacing: '.1em',
            marginTop: 6,
          }}
        >
          8+ CHARS · UPPER · LOWER · NUMBER · ONE OF @$!%*?&amp;
        </div>
      </div>

      <div>
        <label
          htmlFor="confirmPassword"
          style={{
            fontFamily: 'var(--font-mf-mono), monospace',
            fontSize: 10,
            color: '#86868B',
            letterSpacing: '.15em',
            display: 'block',
            marginBottom: 6,
          }}
        >
          CONFIRM NEW PASSWORD
        </label>
        <div style={{ position: 'relative' }}>
          <input
            id="confirmPassword"
            type={show.confirm ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
            style={fieldStyle}
          />
          <button
            type="button"
            onClick={() => setShow((s) => ({ ...s, confirm: !s.confirm }))}
            style={toggleStyle}
            aria-label={show.confirm ? 'Hide password' : 'Show password'}
          >
            {show.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            padding: '10px 12px',
            background: '#2a1212',
            border: '1px solid #6b1f1f',
            borderRadius: 4,
            color: '#fca5a5',
            fontSize: 12,
          }}
        >
          <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            padding: '10px 12px',
            background: '#0f2418',
            border: '1px solid #1f6b35',
            borderRadius: 4,
            color: '#86efac',
            fontSize: 12,
          }}
        >
          <Check size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>Password updated. Use the new password on your next sign-in.</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mf-btn mf-btn-primary"
        style={{
          marginTop: 6,
          height: 44,
          fontFamily: 'var(--font-mf-mono), monospace',
          fontSize: 11,
          letterSpacing: '.18em',
          fontWeight: 700,
          width: '100%',
        }}
      >
        {loading ? 'UPDATING…' : 'UPDATE PASSWORD'}
      </button>
    </form>
  );
}
