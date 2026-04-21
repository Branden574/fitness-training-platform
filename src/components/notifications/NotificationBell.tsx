'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Check, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import {
  useNotificationsStore,
  type NotificationItem,
} from '@/stores/notificationsStore';

// The bell. Always rendered in the DesktopShell top bar for authenticated
// users. Responsibilities:
// 1. Initial fetch of existing notifications (GET /api/notifications).
// 2. Open an EventSource on /api/notifications/stream and drive the Zustand
//    store from the incoming events.
// 3. On reconnect, backfill anything missed via the `since` query param of
//    the existing list endpoint.
// 4. Render an animated badge (Framer Motion), a popover with a list, and
//    one-click mark-read + mark-all-read that hit the REST endpoints we built
//    in 3A.3. Optimistic local updates so the UI feels instant.

interface RawIncoming {
  id: string;
  type: string;
  title: string;
  message?: string;
  body?: string | null;
  actionUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  appointmentId?: string | null;
  clientName?: string;
  appointmentTime?: string;
  timestamp?: string;
  createdAt?: string;
  read?: boolean;
  readAt?: string | null;
}

function normalize(raw: RawIncoming): NotificationItem {
  const tsSource = raw.timestamp ?? raw.createdAt ?? new Date().toISOString();
  return {
    id: String(raw.id),
    type: String(raw.type),
    title: String(raw.title),
    message: String(raw.message ?? raw.body ?? ''),
    body: raw.body ?? raw.message ?? null,
    actionUrl: raw.actionUrl ?? null,
    metadata: raw.metadata ?? null,
    timestamp: new Date(tsSource).toISOString(),
    read: Boolean(raw.read ?? raw.readAt != null),
    readAt: raw.readAt ?? null,
    appointmentId: raw.appointmentId ?? null,
    clientName: raw.clientName,
    appointmentTime: raw.appointmentTime,
  };
}

async function fetchList(since?: string | null): Promise<NotificationItem[]> {
  const url = since
    ? `/api/notifications?since=${encodeURIComponent(since)}`
    : '/api/notifications';
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.map(normalize);
}

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const lastSeenIsoRef = useRef<string | null>(null);

  const notifications = useNotificationsStore((s) => s.notifications);
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const hydrate = useNotificationsStore((s) => s.hydrate);
  const upsert = useNotificationsStore((s) => s.upsert);
  const markReadInStore = useNotificationsStore((s) => s.markRead);
  const markAllReadInStore = useNotificationsStore((s) => s.markAllRead);
  const removeInStore = useNotificationsStore((s) => s.remove);
  const setConnected = useNotificationsStore((s) => s.setConnected);
  const mergeSince = useNotificationsStore((s) => s.mergeSince);

  // Initial hydrate + SSE wiring. Dep-free so we mount once per component life.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const items = await fetchList();
      if (cancelled) return;
      hydrate(items);
      lastSeenIsoRef.current = items[0]?.timestamp ?? null;
    })();

    function wireEventSource() {
      const es = new EventSource('/api/notifications/stream');
      esRef.current = es;

      es.addEventListener('ready', async () => {
        setConnected(true);
        // On every open (first + every reconnect), backfill anything that
        // landed while we were disconnected. EventSource auto-reconnects on
        // network blip — this guarantees we never miss an event.
        const since = lastSeenIsoRef.current;
        if (since) {
          const missed = await fetchList(since);
          if (missed.length > 0) mergeSince(missed);
        }
      });

      es.addEventListener('notification.created', (evt) => {
        try {
          const data = JSON.parse((evt as MessageEvent).data) as RawIncoming;
          const normalized = normalize(data);
          upsert(normalized);
          lastSeenIsoRef.current = normalized.timestamp;
        } catch (e) {
          console.warn('[bell] bad notification.created payload', e);
        }
      });

      es.addEventListener('notification.read', (evt) => {
        try {
          const data = JSON.parse((evt as MessageEvent).data) as {
            id: string;
            read: boolean;
          };
          markReadInStore(data.id, data.read);
        } catch {
          // ignore malformed
        }
      });

      es.addEventListener('notification.read_all', () => {
        markAllReadInStore();
      });

      es.addEventListener('notification.deleted', (evt) => {
        try {
          const data = JSON.parse((evt as MessageEvent).data) as { id: string };
          removeInStore(data.id);
        } catch {
          // ignore
        }
      });

      es.onerror = () => {
        // EventSource retries on its own (retry: 2000 hint from the server).
        // We just reflect the disconnected state; no manual reconnect needed.
        setConnected(false);
      };
    }

    wireEventSource();

    return () => {
      cancelled = true;
      const es = esRef.current;
      if (es) {
        es.close();
        esRef.current = null;
      }
      setConnected(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close popover on outside click + Escape.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const pop = popoverRef.current;
      const trig = triggerRef.current;
      if (!pop) return;
      if (pop.contains(e.target as Node)) return;
      if (trig && trig.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleItemClick = useCallback(
    async (n: NotificationItem) => {
      setOpen(false);
      if (!n.read) {
        // Optimistic local read, then server; other tabs pick up the SSE echo.
        markReadInStore(n.id, true);
        fetch(`/api/notifications/${n.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ read: true }),
        }).catch(() => {
          /* best-effort; SSE still keeps other tabs honest */
        });
      }
      if (n.actionUrl) {
        router.push(n.actionUrl);
      }
    },
    [markReadInStore, router],
  );

  const handleMarkAll = useCallback(async () => {
    if (unreadCount === 0) return;
    markAllReadInStore();
    fetch('/api/notifications/read-all', { method: 'POST' }).catch(() => {
      /* best-effort */
    });
  }, [markAllReadInStore, unreadCount]);

  const handleDismiss = useCallback(
    async (id: string, event: React.MouseEvent) => {
      event.stopPropagation();
      removeInStore(id);
      fetch(`/api/notifications/${id}`, { method: 'DELETE' }).catch(() => {
        /* best-effort */
      });
    },
    [removeInStore],
  );

  const badgeLabel = unreadCount > 9 ? '9+' : String(unreadCount);

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mf-btn mf-btn-ghost"
        style={{ height: 36, width: 36, padding: 0, position: 'relative' }}
        aria-label={`Notifications (${unreadCount} unread)`}
        aria-expanded={open}
      >
        <Bell size={14} />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key={badgeLabel}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 24 }}
              className="mf-font-mono"
              style={{
                position: 'absolute',
                top: 2,
                right: 2,
                minWidth: 14,
                height: 14,
                padding: '0 3px',
                fontSize: 9,
                lineHeight: '14px',
                borderRadius: 7,
                background: 'var(--mf-accent)',
                color: 'var(--mf-accent-ink)',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {badgeLabel}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={popoverRef}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="mf-card-elev"
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: 'min(380px, calc(100vw - 24px))',
              maxHeight: 'min(520px, calc(100vh - 80px))',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 80,
              overflow: 'hidden',
              boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
            }}
            role="dialog"
            aria-label="Notifications"
          >
            <div
              className="flex items-center justify-between"
              style={{
                padding: '10px 14px',
                borderBottom: '1px solid var(--mf-hairline)',
              }}
            >
              <div>
                <div className="mf-eyebrow">NOTIFICATIONS</div>
                {unreadCount > 0 && (
                  <div
                    className="mf-font-mono mf-fg-mute"
                    style={{ fontSize: 10, marginTop: 2 }}
                  >
                    {unreadCount} UNREAD
                  </div>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAll}
                  className="mf-btn mf-btn-ghost"
                  style={{ height: 28, fontSize: 10, padding: '0 8px' }}
                >
                  <Check size={12} />
                  Mark all read
                </button>
              )}
            </div>
            <div
              className="mf-scroll"
              style={{ flex: 1, overflowY: 'auto' }}
            >
              {notifications.length === 0 ? (
                <div
                  className="mf-fg-mute mf-font-mono"
                  style={{
                    padding: 36,
                    textAlign: 'center',
                    fontSize: 11,
                    letterSpacing: '0.1em',
                  }}
                >
                  NO NOTIFICATIONS
                </div>
              ) : (
                notifications.map((n) => <Row key={n.id} n={n} onClick={handleItemClick} onDismiss={handleDismiss} />)
              )}
            </div>
            <div
              style={{
                padding: '8px 14px',
                borderTop: '1px solid var(--mf-hairline)',
              }}
            >
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="mf-font-mono mf-fg-dim"
                style={{ fontSize: 10, letterSpacing: '0.1em' }}
              >
                VIEW ALL →
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Row({
  n,
  onClick,
  onDismiss,
}: {
  n: NotificationItem;
  onClick: (n: NotificationItem) => void;
  onDismiss: (id: string, e: React.MouseEvent) => void;
}) {
  const when = safeRelative(n.timestamp);
  return (
    <button
      type="button"
      onClick={() => onClick(n)}
      className="flex items-start gap-2"
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '10px 14px',
        background: n.read ? 'transparent' : 'rgba(255,77,28,0.06)',
        border: 'none',
        borderBottom: '1px solid var(--mf-hairline)',
        cursor: 'pointer',
        position: 'relative',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          background: n.read ? 'transparent' : 'var(--mf-accent)',
          marginTop: 6,
          flexShrink: 0,
        }}
        aria-hidden
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: n.read ? 400 : 600,
            marginBottom: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {n.title}
        </div>
        <div
          className="mf-fg-dim"
          style={{
            fontSize: 11,
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {n.message}
        </div>
        <div
          className="mf-font-mono mf-fg-mute"
          style={{ fontSize: 9, marginTop: 4, letterSpacing: '0.1em' }}
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
          alignSelf: 'flex-start',
          flexShrink: 0,
        }}
      >
        <X size={12} />
      </button>
    </button>
  );
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
