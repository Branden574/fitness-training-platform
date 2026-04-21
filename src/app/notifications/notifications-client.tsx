'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bell, Check, X } from 'lucide-react';
import { formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import {
  useNotificationsStore,
  type NotificationItem,
} from '@/stores/notificationsStore';

export interface InitialNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  body: string | null;
  actionUrl: string | null;
  metadata: Record<string, unknown> | null;
  timestamp: string;
  read: boolean;
  readAt: string | null;
  appointmentId: string | null;
}

export default function NotificationsClient({
  initial,
  backHref,
}: {
  initial: InitialNotification[];
  backHref: string;
}) {
  const router = useRouter();
  const notifications = useNotificationsStore((s) => s.notifications);
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const hydrate = useNotificationsStore((s) => s.hydrate);
  const markReadInStore = useNotificationsStore((s) => s.markRead);
  const markAllReadInStore = useNotificationsStore((s) => s.markAllRead);
  const removeInStore = useNotificationsStore((s) => s.remove);

  useEffect(() => {
    hydrate(initial);
  }, [initial, hydrate]);

  const grouped = useMemo(() => groupByDay(notifications), [notifications]);

  async function onRowClick(n: NotificationItem) {
    if (!n.read) {
      markReadInStore(n.id, true);
      fetch(`/api/notifications/${n.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true }),
      }).catch(() => {});
    }
    if (n.actionUrl) router.push(n.actionUrl);
  }

  async function onMarkAll() {
    if (unreadCount === 0) return;
    markAllReadInStore();
    fetch('/api/notifications/read-all', { method: 'POST' }).catch(() => {});
  }

  async function onDismiss(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    removeInStore(id);
    fetch(`/api/notifications/${id}`, { method: 'DELETE' }).catch(() => {});
  }

  return (
    <div
      data-mf
      className="mf-bg mf-fg"
      style={{ minHeight: '100vh' }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px 80px' }}>
        <Link
          href={backHref}
          className="mf-font-mono mf-fg-dim"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11,
            letterSpacing: '0.1em',
            marginBottom: 20,
          }}
        >
          <ArrowLeft size={12} />
          BACK
        </Link>

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginBottom: 24,
            gap: 12,
          }}
        >
          <div>
            <div className="mf-eyebrow" style={{ marginBottom: 6 }}>
              ACCOUNT
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.01em' }}>
              Notifications
            </h1>
            <div
              className="mf-font-mono mf-fg-mute"
              style={{ fontSize: 11, letterSpacing: '0.1em', marginTop: 4 }}
            >
              {unreadCount > 0
                ? `${unreadCount} UNREAD · ${notifications.length} TOTAL`
                : `${notifications.length} TOTAL`}
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAll}
              className="mf-btn mf-btn-ghost"
              style={{ height: 32, fontSize: 11, padding: '0 12px' }}
            >
              <Check size={12} />
              Mark all read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div
            className="mf-card"
            style={{
              padding: '48px 24px',
              textAlign: 'center',
              borderStyle: 'dashed',
            }}
          >
            <Bell size={24} className="mf-fg-mute" style={{ margin: '0 auto 12px' }} />
            <div
              className="mf-fg-mute mf-font-mono"
              style={{ fontSize: 11, letterSpacing: '0.1em' }}
            >
              NO NOTIFICATIONS YET
            </div>
            <div
              className="mf-fg-dim"
              style={{ fontSize: 13, marginTop: 8, lineHeight: 1.5 }}
            >
              When new activity lands, it&apos;ll show up here and ring the bell in the top bar.
            </div>
          </div>
        ) : (
          grouped.map(({ label, items }) => (
            <section key={label} style={{ marginBottom: 28 }}>
              <div
                className="mf-eyebrow"
                style={{ marginBottom: 10 }}
              >
                {label}
              </div>
              <div className="mf-card" style={{ overflow: 'hidden' }}>
                {items.map((n, idx) => (
                  <Row
                    key={n.id}
                    n={n}
                    onClick={onRowClick}
                    onDismiss={onDismiss}
                    last={idx === items.length - 1}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}

function Row({
  n,
  onClick,
  onDismiss,
  last,
}: {
  n: NotificationItem;
  onClick: (n: NotificationItem) => void;
  onDismiss: (id: string, e: React.MouseEvent) => void;
  last: boolean;
}) {
  const when = safeRelative(n.timestamp);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(n)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(n);
        }
      }}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '14px 16px',
        background: n.read ? 'transparent' : 'rgba(255,77,28,0.06)',
        borderBottom: last ? 'none' : '1px solid var(--mf-hairline)',
        cursor: n.actionUrl ? 'pointer' : 'default',
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          background: n.read ? 'transparent' : 'var(--mf-accent)',
          marginTop: 7,
          flexShrink: 0,
          border: n.read ? '1px solid var(--mf-hairline)' : 'none',
        }}
        aria-hidden
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: n.read ? 400 : 600,
            marginBottom: 2,
          }}
        >
          {n.title}
        </div>
        {n.message && (
          <div
            className="mf-fg-dim"
            style={{ fontSize: 13, lineHeight: 1.5 }}
          >
            {n.message}
          </div>
        )}
        <div
          className="mf-font-mono mf-fg-mute"
          style={{ fontSize: 10, marginTop: 6, letterSpacing: '0.1em' }}
        >
          {when.toUpperCase()}
        </div>
      </div>
      <button
        type="button"
        onClick={(e) => onDismiss(n.id, e)}
        aria-label="Dismiss notification"
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

function groupByDay(items: NotificationItem[]): Array<{ label: string; items: NotificationItem[] }> {
  const today: NotificationItem[] = [];
  const yesterday: NotificationItem[] = [];
  const earlier: NotificationItem[] = [];
  for (const n of items) {
    const d = new Date(n.timestamp);
    if (Number.isNaN(d.getTime())) {
      earlier.push(n);
      continue;
    }
    if (isToday(d)) today.push(n);
    else if (isYesterday(d)) yesterday.push(n);
    else earlier.push(n);
  }
  const out: Array<{ label: string; items: NotificationItem[] }> = [];
  if (today.length) out.push({ label: 'TODAY', items: today });
  if (yesterday.length) out.push({ label: 'YESTERDAY', items: yesterday });
  if (earlier.length) out.push({ label: 'EARLIER', items: earlier });
  return out;
}

function safeRelative(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return '';
  }
}
