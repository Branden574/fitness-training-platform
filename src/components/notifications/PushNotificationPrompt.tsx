'use client';

import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import {
  pushSupported,
  subscribeForPush,
  postSubscriptionToServer,
} from '@/lib/webPushClient';

// Non-intrusive inline prompt for enabling OS-level push notifications.
// Appears once when Notification.permission === 'default'. Dismissal persists
// in localStorage so we don't nag. A user who dismisses can still opt in
// from notification preferences later.

const LOCAL_STORAGE_KEY = 'mf.pushPromptDismissedAt';
const REPROMPT_DAYS = 30;

export default function PushNotificationPrompt() {
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<'idle' | 'working' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!pushSupported()) return;
    if (Notification.permission !== 'default') return;
    const lastDismissed = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (lastDismissed) {
      const dismissedAt = Number(lastDismissed);
      if (
        Number.isFinite(dismissedAt) &&
        Date.now() - dismissedAt < REPROMPT_DAYS * 86_400_000
      ) {
        return;
      }
    }
    setShow(true);
  }, []);

  if (!show) return null;

  async function enable() {
    setStatus('working');
    setErrorMessage(null);
    const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapid) {
      setStatus('error');
      setErrorMessage('Push isn’t configured on this deploy yet.');
      return;
    }
    const sub = await subscribeForPush(vapid);
    if (!sub) {
      setStatus('error');
      setErrorMessage(
        Notification.permission === 'denied'
          ? 'Notifications are blocked. Enable them in your browser settings.'
          : 'Could not enable notifications. Try again?',
      );
      return;
    }
    const ok = await postSubscriptionToServer(sub);
    if (!ok) {
      setStatus('error');
      setErrorMessage('Saved on your device but we couldn’t reach the server.');
      return;
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, String(Date.now()));
    setShow(false);
  }

  function dismiss() {
    localStorage.setItem(LOCAL_STORAGE_KEY, String(Date.now()));
    setShow(false);
  }

  return (
    <div
      role="region"
      aria-label="Enable push notifications"
      className="mf-card"
      style={{
        margin: '12px 20px 0',
        padding: '10px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        borderColor: 'var(--mf-accent)',
        background: 'rgba(255,77,28,0.06)',
      }}
    >
      <Bell size={16} className="mf-fg" style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>
          Get notified
        </div>
        <div className="mf-fg-dim" style={{ fontSize: 11 }}>
          Turn on push to hear about new workouts, PRs, and messages even when the app is closed.
        </div>
        {errorMessage && (
          <div
            role="alert"
            className="mf-font-mono"
            style={{ fontSize: 10, color: '#fca5a5', marginTop: 4 }}
          >
            {errorMessage}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={enable}
        disabled={status === 'working'}
        className="mf-btn mf-btn-primary"
        style={{ height: 32, fontSize: 11, flexShrink: 0 }}
      >
        {status === 'working' ? 'Enabling…' : 'Enable'}
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="mf-fg-mute"
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 4,
          flexShrink: 0,
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
