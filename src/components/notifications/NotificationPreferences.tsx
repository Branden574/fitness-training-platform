'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, BellOff, Check, Loader2 } from 'lucide-react';
import {
  pushSupported,
  subscribeForPush,
  postSubscriptionToServer,
  unsubscribeFromPush,
  deleteSubscriptionFromServer,
} from '@/lib/webPushClient';

// Dropped into any role's Settings page. Shows:
// - Two global toggles: in-app + OS push
// - Per-type toggles (workout assigned, PR logged, message, program completed, trainer feedback)
// - Quiet-hours window (start + end in user-local hour; set both or neither)
// - OS push subscribe/unsubscribe button (drives the real browser permission flow)
// Saves via `PUT /api/notifications/preferences` debounced ~400ms on change so
// rapid toggle flicks don't spam the server.

interface Prefs {
  inAppEnabled: boolean;
  pushEnabled: boolean;
  workoutAssigned: boolean;
  workoutUpdated: boolean;
  prLogged: boolean;
  messageReceived: boolean;
  programCompleted: boolean;
  trainerFeedback: boolean;
  quietHoursStart: number | null;
  quietHoursEnd: number | null;
}

const DEFAULT_PREFS: Prefs = {
  inAppEnabled: true,
  pushEnabled: true,
  workoutAssigned: true,
  workoutUpdated: true,
  prLogged: true,
  messageReceived: true,
  programCompleted: true,
  trainerFeedback: true,
  quietHoursStart: null,
  quietHoursEnd: null,
};

const TYPE_ROWS: Array<{ key: keyof Prefs; label: string; hint: string }> = [
  { key: 'workoutAssigned', label: 'New workout assigned', hint: 'Your trainer sends you a new workout.' },
  { key: 'workoutUpdated', label: 'Workout updated', hint: 'A program you\'re on changed.' },
  { key: 'prLogged', label: 'Personal record', hint: 'You hit a new PR on a tracked lift.' },
  { key: 'messageReceived', label: 'New message', hint: 'Someone DMs you in the app.' },
  { key: 'programCompleted', label: 'Program finished', hint: 'You completed a full program block.' },
  { key: 'trainerFeedback', label: 'Trainer feedback', hint: 'Your coach left a note on your training.' },
];

export default function NotificationPreferences() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pushState, setPushState] = useState<'unknown' | 'on' | 'off' | 'denied'>('unknown');
  const [pushBusy, setPushBusy] = useState(false);

  // Initial load + detect current browser push permission state.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/notifications/preferences', { cache: 'no-store' });
        if (!res.ok) throw new Error(`load failed: ${res.status}`);
        const data = (await res.json()) as Prefs;
        setPrefs({ ...DEFAULT_PREFS, ...data });
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Failed to load preferences.');
        setPrefs(DEFAULT_PREFS);
      }
    })();

    (async () => {
      if (!pushSupported()) {
        setPushState('denied');
        return;
      }
      if (Notification.permission === 'denied') {
        setPushState('denied');
        return;
      }
      try {
        const reg = await navigator.serviceWorker.getRegistration('/');
        const sub = await reg?.pushManager.getSubscription();
        setPushState(sub ? 'on' : 'off');
      } catch {
        setPushState('off');
      }
    })();
  }, []);

  const save = useCallback(async (next: Prefs) => {
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? 'Save failed.');
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }, []);

  // Debounce server writes: state flips instantly for responsiveness, save fires 400ms after last change.
  useEffect(() => {
    if (!prefs) return;
    const t = setTimeout(() => {
      save(prefs);
    }, 400);
    return () => clearTimeout(t);
  }, [prefs, save]);

  async function togglePushSubscription() {
    if (!pushSupported()) return;
    setPushBusy(true);
    setErr(null);
    try {
      if (pushState === 'on') {
        const endpoint = await unsubscribeFromPush();
        await deleteSubscriptionFromServer(endpoint);
        setPushState('off');
      } else {
        const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapid) {
          setErr('Push isn\'t configured on this deploy yet.');
          return;
        }
        const sub = await subscribeForPush(vapid);
        if (!sub) {
          setPushState(Notification.permission === 'denied' ? 'denied' : 'off');
          setErr(
            Notification.permission === 'denied'
              ? 'Notifications are blocked in your browser. Re-enable in system settings.'
              : 'Could not subscribe. Try again.',
          );
          return;
        }
        const ok = await postSubscriptionToServer(sub);
        if (!ok) {
          setErr('Saved locally but server subscribe failed.');
          return;
        }
        setPushState('on');
      }
    } finally {
      setPushBusy(false);
    }
  }

  if (!prefs) {
    return (
      <div
        className="mf-fg-mute mf-font-mono"
        style={{ padding: 24, textAlign: 'center', fontSize: 11, letterSpacing: '0.1em' }}
      >
        LOADING…
      </div>
    );
  }

  const updatePref = (patch: Partial<Prefs>) => setPrefs((p) => (p ? { ...p, ...patch } : p));

  return (
    <section>
      <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
        NOTIFICATION PREFERENCES
      </div>
      <div className="mf-fg-dim" style={{ fontSize: 12, marginBottom: 16 }}>
        Control what lands in your bell and what pings your phone. Changes save automatically.
      </div>

      {err && (
        <div
          role="alert"
          className="mf-chip mf-chip-bad"
          style={{ display: 'block', padding: '8px 12px', marginBottom: 12 }}
        >
          {err}
        </div>
      )}

      <div className="mf-card" style={{ padding: 16, marginBottom: 16 }}>
        <Row
          label="In-app bell"
          hint="The bell icon in the top bar. Off means notifications never land."
          value={prefs.inAppEnabled}
          onChange={(v) => updatePref({ inAppEnabled: v })}
        />
        <Row
          label="OS push"
          hint="Phone lock screen + desktop notification tray. Requires browser permission."
          value={prefs.pushEnabled}
          onChange={(v) => updatePref({ pushEnabled: v })}
          last
        />
      </div>

      <div className="mf-card" style={{ padding: 16, marginBottom: 16 }}>
        <div className="mf-eyebrow" style={{ marginBottom: 12 }}>
          BY TYPE
        </div>
        {TYPE_ROWS.map((t, i) => (
          <Row
            key={t.key}
            label={t.label}
            hint={t.hint}
            value={prefs[t.key] as boolean}
            onChange={(v) => updatePref({ [t.key]: v } as Partial<Prefs>)}
            last={i === TYPE_ROWS.length - 1}
          />
        ))}
      </div>

      <div className="mf-card" style={{ padding: 16, marginBottom: 16 }}>
        <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
          QUIET HOURS
        </div>
        <div className="mf-fg-dim" style={{ fontSize: 12, marginBottom: 12 }}>
          OS push is suppressed in this window. In-app notifications still land — you&apos;ll see them when you open the app.
        </div>
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <label>
            <div
              className="mf-font-mono mf-fg-dim"
              style={{ fontSize: 10, letterSpacing: '.15em', marginBottom: 6 }}
            >
              START (0–23)
            </div>
            <input
              type="number"
              min={0}
              max={23}
              className="mf-input"
              value={prefs.quietHoursStart ?? ''}
              placeholder="off"
              onChange={(e) => {
                const v = e.target.value.trim();
                updatePref({ quietHoursStart: v === '' ? null : Math.max(0, Math.min(23, Number(v))) });
              }}
            />
          </label>
          <label>
            <div
              className="mf-font-mono mf-fg-dim"
              style={{ fontSize: 10, letterSpacing: '.15em', marginBottom: 6 }}
            >
              END (0–23)
            </div>
            <input
              type="number"
              min={0}
              max={23}
              className="mf-input"
              value={prefs.quietHoursEnd ?? ''}
              placeholder="off"
              onChange={(e) => {
                const v = e.target.value.trim();
                updatePref({ quietHoursEnd: v === '' ? null : Math.max(0, Math.min(23, Number(v))) });
              }}
            />
          </label>
        </div>
        <div
          className="mf-font-mono mf-fg-mute"
          style={{ fontSize: 10, marginTop: 10, letterSpacing: '.1em' }}
        >
          Leave both blank to disable. Example: start 22, end 6 = quiet 10pm–6am.
        </div>
      </div>

      <div className="mf-card" style={{ padding: 16 }}>
        <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
          THIS DEVICE
        </div>
        <div className="flex items-center gap-3">
          {pushState === 'on' ? <Bell size={14} /> : <BellOff size={14} className="mf-fg-mute" />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>
              {pushState === 'on'
                ? 'Push is active on this device.'
                : pushState === 'denied'
                  ? 'Push is blocked in your browser.'
                  : 'Push is off on this device.'}
            </div>
            <div className="mf-fg-dim" style={{ fontSize: 11, marginTop: 2 }}>
              {pushState === 'denied'
                ? 'Allow notifications in your browser or OS settings to enable this option.'
                : 'Subscribing per-device — you can enable push on your laptop AND phone independently.'}
            </div>
          </div>
          <button
            type="button"
            onClick={togglePushSubscription}
            disabled={pushBusy || pushState === 'denied' || !pushSupported()}
            className={`mf-btn ${pushState === 'on' ? '' : 'mf-btn-primary'}`}
            style={{ height: 36 }}
          >
            {pushBusy ? (
              <Loader2 size={12} className="animate-spin" />
            ) : pushState === 'on' ? (
              'Disable on this device'
            ) : (
              'Enable on this device'
            )}
          </button>
        </div>
      </div>

      <div
        className="mf-font-mono mf-fg-mute"
        style={{ fontSize: 10, marginTop: 12, letterSpacing: '.1em', display: 'flex', alignItems: 'center', gap: 6 }}
      >
        {saving ? (
          <>
            <Loader2 size={10} className="animate-spin" />
            SAVING…
          </>
        ) : (
          <>
            <Check size={10} />
            SAVED
          </>
        )}
      </div>
    </section>
  );
}

function Row({
  label,
  hint,
  value,
  onChange,
  last,
}: {
  label: string;
  hint: string;
  value: boolean;
  onChange: (next: boolean) => void;
  last?: boolean;
}) {
  return (
    <label
      className="flex items-start gap-3"
      style={{
        paddingBottom: last ? 0 : 12,
        marginBottom: last ? 0 : 12,
        borderBottom: last ? 'none' : '1px solid var(--mf-hairline)',
        cursor: 'pointer',
      }}
    >
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        style={{ marginTop: 3, flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
        <div className="mf-fg-dim" style={{ fontSize: 11, marginTop: 2 }}>
          {hint}
        </div>
      </div>
    </label>
  );
}
