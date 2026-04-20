'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal, KeyRound, Power, ExternalLink } from 'lucide-react';

interface Props {
  userId: string;
  userEmail: string;
  userName: string | null;
  userRole: 'CLIENT' | 'TRAINER' | 'ADMIN';
  isActive: boolean;
  trainerSlug: string | null;
}

export default function UserRowMenuClient({
  userId,
  userEmail,
  userName,
  userRole,
  isActive: initialActive,
  trainerSlug,
}: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isActive, setIsActive] = useState(initialActive);
  const [busy, setBusy] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(
    null,
  );
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Position the portal-rendered menu relative to the button in viewport coords
  // so the dropdown escapes any ancestor `overflow: hidden` (the users table is
  // wrapped in a card with clipped corners). Recompute on scroll/resize so the
  // menu stays anchored.
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const btn = buttonRef.current;
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      setCoords({
        top: r.bottom + 4,
        right: Math.max(8, window.innerWidth - r.right),
      });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        (buttonRef.current && buttonRef.current.contains(target)) ||
        (menuRef.current && menuRef.current.contains(target))
      ) {
        return;
      }
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggleActive = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/admin/toggle-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isActive: !isActive }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Failed');
        return;
      }
      setIsActive(!isActive);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    if (
      !confirm(
        `Reset password for ${userName ?? userEmail}? They'll have to use the temp password on next login and change it immediately.`,
      )
    )
      return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Failed');
        return;
      }
      setTempPassword(data.tempPassword ?? null);
    } finally {
      setBusy(false);
    }
  };

  const copyTemp = async () => {
    if (!tempPassword) return;
    try {
      await navigator.clipboard.writeText(tempPassword);
    } catch {
      // clipboard API unavailable — leave it displayed for manual copy
    }
  };

  const publicProfileHref =
    userRole === 'TRAINER' && trainerSlug ? `/t/${trainerSlug}` : null;

  const menu =
    open && coords && mounted ? (
      <div
        ref={menuRef}
        role="menu"
        style={{
          position: 'fixed',
          top: coords.top,
          right: coords.right,
          minWidth: 220,
          background: 'var(--mf-surface-2, #0E0E10)',
          border: '1px solid var(--mf-hairline, #1F1F22)',
          borderRadius: 6,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          zIndex: 1000,
          padding: 4,
          fontSize: 13,
          color: 'var(--mf-fg, #F4F4F5)',
        }}
      >
        {publicProfileHref && (
          <MenuItem
            icon={<ExternalLink size={14} />}
            label="View public profile"
            onClick={() => {
              window.open(publicProfileHref, '_blank', 'noopener,noreferrer');
              setOpen(false);
            }}
          />
        )}
        <MenuItem
          icon={<Power size={14} />}
          label={isActive ? 'Deactivate account' : 'Reactivate account'}
          onClick={toggleActive}
          disabled={busy}
          danger={isActive}
        />
        <MenuItem
          icon={<KeyRound size={14} />}
          label="Reset password"
          onClick={resetPassword}
          disabled={busy}
        />

        {tempPassword && (
          <div
            style={{
              marginTop: 4,
              padding: 10,
              background: 'var(--mf-surface-3, #14141A)',
              border: '1px solid var(--mf-hairline)',
              borderRadius: 4,
              fontSize: 11,
            }}
          >
            <div className="mf-fg-dim" style={{ marginBottom: 4 }}>
              TEMP PASSWORD — share securely
            </div>
            <div
              className="mf-font-mono"
              style={{
                wordBreak: 'break-all',
                marginBottom: 6,
                color: 'var(--mf-accent)',
              }}
            >
              {tempPassword}
            </div>
            <button
              type="button"
              onClick={copyTemp}
              className="mf-btn mf-btn-ghost"
              style={{ height: 24, fontSize: 11 }}
            >
              Copy
            </button>
          </div>
        )}

        {error && (
          <div
            role="alert"
            style={{
              marginTop: 4,
              padding: '6px 10px',
              color: '#fca5a5',
              fontSize: 11,
            }}
          >
            {error}
          </div>
        )}
      </div>
    ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="User actions"
        aria-expanded={open}
        className="mf-btn mf-btn-ghost"
        style={{ height: 28, width: 28, padding: 0 }}
      >
        <MoreHorizontal size={14} />
      </button>
      {mounted && menu ? createPortal(menu, document.body) : null}
    </>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  disabled,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 10px',
        background: 'transparent',
        border: 'none',
        borderRadius: 4,
        color: danger ? 'var(--mf-red, #fca5a5)' : 'var(--mf-fg)',
        fontSize: 13,
        textAlign: 'left',
        cursor: disabled ? 'wait' : 'pointer',
        opacity: disabled ? 0.6 : 1,
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = 'var(--mf-surface-3, #14141A)')
      }
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
