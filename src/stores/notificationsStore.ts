'use client';

import { create } from 'zustand';

// Client-side notifications store. One global store per browser tab.
// Cross-tab consistency comes from SSE + `notification.*` events fanned out
// by the server to every connected EventSource, not from BroadcastChannel —
// a read on tab A fires a server SSE that tab B picks up.

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  /** Legacy field name from existing /api/notifications response. */
  message: string;
  /** Aliased to `message` for API compatibility with the new schema column. */
  body?: string | null;
  actionUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  /** ISO timestamp string. */
  timestamp: string;
  read: boolean;
  readAt?: string | null;
  appointmentId?: string | null;
  clientName?: string;
  appointmentTime?: string;
}

interface NotificationsState {
  notifications: NotificationItem[];
  unreadCount: number;
  connected: boolean;
  lastEventAt: string | null;
  hydrate: (items: NotificationItem[]) => void;
  upsert: (item: NotificationItem) => void;
  markRead: (id: string, read: boolean) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
  setConnected: (connected: boolean) => void;
  mergeSince: (items: NotificationItem[]) => void;
}

function computeUnread(list: NotificationItem[]): number {
  let n = 0;
  for (const it of list) if (!it.read) n++;
  return n;
}

function pickLatestIso(list: NotificationItem[]): string | null {
  let latest: string | null = null;
  for (const it of list) {
    if (!latest || (it.timestamp && it.timestamp > latest)) latest = it.timestamp;
  }
  return latest;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  connected: false,
  lastEventAt: null,

  hydrate(items) {
    const sorted = [...items].sort((a, b) =>
      a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0,
    );
    set({
      notifications: sorted,
      unreadCount: computeUnread(sorted),
      lastEventAt: pickLatestIso(sorted),
    });
  },

  upsert(item) {
    const { notifications } = get();
    const idx = notifications.findIndex((n) => n.id === item.id);
    const next =
      idx >= 0
        ? notifications.map((n, i) => (i === idx ? { ...n, ...item } : n))
        : [item, ...notifications];
    // Re-sort only if we inserted — existing in-place updates keep ordering.
    const sorted =
      idx >= 0
        ? next
        : next.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
    set({
      notifications: sorted,
      unreadCount: computeUnread(sorted),
      lastEventAt: pickLatestIso(sorted),
    });
  },

  markRead(id, read) {
    const next = get().notifications.map((n) =>
      n.id === id
        ? { ...n, read, readAt: read ? new Date().toISOString() : null }
        : n,
    );
    set({ notifications: next, unreadCount: computeUnread(next) });
  },

  markAllRead() {
    const now = new Date().toISOString();
    const next = get().notifications.map((n) =>
      n.read ? n : { ...n, read: true, readAt: now },
    );
    set({ notifications: next, unreadCount: 0 });
  },

  remove(id) {
    const next = get().notifications.filter((n) => n.id !== id);
    set({ notifications: next, unreadCount: computeUnread(next) });
  },

  setConnected(connected) {
    set({ connected });
  },

  mergeSince(items) {
    const { notifications } = get();
    const byId = new Map(notifications.map((n) => [n.id, n]));
    for (const it of items) {
      // Backfill shouldn't clobber local optimistic reads — only upsert when
      // the incoming item is newer OR the id is entirely new.
      const existing = byId.get(it.id);
      if (!existing || !existing.read) {
        byId.set(it.id, { ...existing, ...it });
      }
    }
    const merged = Array.from(byId.values()).sort((a, b) =>
      a.timestamp < b.timestamp ? 1 : -1,
    );
    set({
      notifications: merged,
      unreadCount: computeUnread(merged),
      lastEventAt: pickLatestIso(merged),
    });
  },
}));
