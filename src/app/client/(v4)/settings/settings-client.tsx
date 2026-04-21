'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { ChevronRight, Check, LogOut } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

interface Props {
  initialTimezone: string | null;
  email: string;
  trainerName: string | null;
}

type ThemeKey = 'dark' | 'light' | 'auto';

const THEME_OPTIONS: Array<{ key: ThemeKey; label: string }> = [
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
  { key: 'auto', label: 'Auto' },
];

function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Full IANA list if the runtime supports Intl.supportedValuesOf (ES2022+
 * Node 18+ / modern browsers). Falls back to a curated short list so the
 * picker always has options even on older runtimes.
 */
function allTimezones(): string[] {
  try {
    const fn = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] })
      .supportedValuesOf;
    if (typeof fn === 'function') {
      const list = fn('timeZone');
      if (Array.isArray(list) && list.length > 0) return list;
    }
  } catch {
    // fall through
  }
  return [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Phoenix',
    'America/Los_Angeles',
    'America/Anchorage',
    'Pacific/Honolulu',
    'America/Toronto',
    'America/Mexico_City',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Madrid',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Singapore',
    'Australia/Sydney',
  ];
}

export default function SettingsClient({
  initialTimezone,
  email,
  trainerName,
}: Props) {
  const { theme, setTheme } = useTheme();
  const [tz, setTz] = useState<string>(
    initialTimezone ?? browserTimezone(),
  );
  const [savedTz, setSavedTz] = useState<string | null>(initialTimezone);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flashSaved, setFlashSaved] = useState(false);

  const zones = useMemo(() => allTimezones(), []);
  const detectedZone = useMemo(() => browserTimezone(), []);

  useEffect(() => {
    if (!flashSaved) return;
    const t = setTimeout(() => setFlashSaved(false), 1600);
    return () => clearTimeout(t);
  }, [flashSaved]);

  const saveTz = async (next: string) => {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch('/api/client/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Could not save timezone');
        return;
      }
      setSavedTz(next);
      setFlashSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const tzDirty = tz !== savedTz;

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {/* Appearance */}
      <Section title="APPEARANCE">
        <div className="grid grid-cols-3 gap-2">
          {THEME_OPTIONS.map(({ key, label }) => {
            const active = theme === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTheme(key)}
                className="mf-btn"
                style={{
                  height: 40,
                  background: active ? 'var(--mf-accent)' : undefined,
                  color: active ? 'var(--mf-accent-ink)' : undefined,
                  borderColor: active ? 'var(--mf-accent)' : undefined,
                }}
                aria-pressed={active}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div
          className="mf-fg-dim"
          style={{ fontSize: 11, marginTop: 8 }}
        >
          Auto follows your device&apos;s light/dark setting. Dark is the
          default.
        </div>
      </Section>

      {/* Timezone */}
      <Section title="TIMEZONE">
        <select
          className="mf-input"
          value={tz}
          onChange={(e) => setTz(e.target.value)}
          onBlur={() => {
            if (tzDirty) saveTz(tz);
          }}
        >
          {zones.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 8,
          }}
        >
          <button
            type="button"
            onClick={() => saveTz(tz)}
            disabled={saving || !tzDirty}
            className="mf-btn mf-btn-primary"
            style={{ height: 36, fontSize: 12 }}
          >
            {saving ? 'Saving…' : tzDirty ? 'Save timezone' : 'Saved'}
          </button>
          {tz !== detectedZone && (
            <button
              type="button"
              onClick={() => setTz(detectedZone)}
              className="mf-btn mf-btn-ghost"
              style={{ height: 36, fontSize: 12 }}
            >
              Use device ({detectedZone})
            </button>
          )}
          {flashSaved && (
            <span
              className="mf-font-mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.1em',
                color: '#86efac',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Check size={12} /> SAVED
            </span>
          )}
        </div>
        <div className="mf-fg-dim" style={{ fontSize: 11, marginTop: 8 }}>
          Your log timestamps (workouts, food, progress) are stored in UTC
          and displayed here in your local time. Your coach sees them in
          this timezone too, so &ldquo;7:30 AM breakfast&rdquo; reads
          correctly regardless of where they&apos;re training from.
        </div>
        {error && (
          <div
            role="alert"
            style={{
              padding: '8px 10px',
              marginTop: 8,
              background: '#2a1212',
              border: '1px solid #6b1f1f',
              color: '#fca5a5',
              borderRadius: 4,
              fontSize: 11,
            }}
          >
            {error}
          </div>
        )}
      </Section>

      {/* Account */}
      <Section title="ACCOUNT">
        <Row label={`Email · ${email}`} />
        <Row label="Change password" href="/auth/change-password" last />
      </Section>

      {/* Training */}
      <Section title="TRAINING">
        <Row label={`Coach · ${trainerName ?? 'Unassigned'}`} />
        <Row label="Current program" href="/client/program" />
        <Row label="Food log" href="/client/food" last />
      </Section>

      {/* Support */}
      <Section title="SUPPORT">
        <Row label="Contact coach" href="/client/messages" />
        <Row label="Help + privacy" href="/contact" last />
      </Section>

      <button
        type="button"
        onClick={() => signOut({ callbackUrl: '/auth/signin' })}
        className="mf-btn"
        style={{
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          color: '#fca5a5',
          borderColor: 'rgba(252, 165, 165, 0.3)',
        }}
      >
        <LogOut size={14} />
        Sign out
      </button>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
        {title}
      </div>
      <div className="mf-card" style={{ padding: 12 }}>
        {children}
      </div>
    </div>
  );
}

function Row({
  label,
  href,
  last,
}: {
  label: string;
  href?: string;
  last?: boolean;
}) {
  const rowStyle: React.CSSProperties = {
    padding: '10px 8px',
    display: 'flex',
    alignItems: 'center',
    borderBottom: last ? 'none' : '1px solid var(--mf-hairline)',
  };
  if (href) {
    return (
      <Link href={href} style={rowStyle}>
        <span style={{ flex: 1, fontSize: 14 }}>{label}</span>
        <ChevronRight size={14} className="mf-fg-mute" />
      </Link>
    );
  }
  return (
    <div style={rowStyle}>
      <span style={{ flex: 1, fontSize: 14 }}>{label}</span>
    </div>
  );
}
