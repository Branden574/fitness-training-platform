import 'server-only';

import webpush from 'web-push';
import { prisma } from '@/lib/prisma';

// Web-push (VAPID) fan-out helper. One entry point: `sendPushToUser(userId, payload)`.
// Iterates every registered PushSubscription for the user, sending in parallel.
// Dead subscriptions (404/410 Gone — phone reinstalled, user cleared browser data,
// subscription expired) are deleted from the DB as a side effect so the table
// self-cleans and doesn't grow stale rows that would fail every future send.
// Errors on one subscription never block the rest.

let vapidInitialized = false;

function initVapid(): boolean {
  if (vapidInitialized) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? 'mailto:admin@replab.com';
  if (!publicKey || !privateKey) {
    return false;
  }
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidInitialized = true;
    return true;
  } catch (e) {
    console.warn('[push] VAPID init failed:', e);
    return false;
  }
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
}

export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<{ sent: number; dropped: number; failed: number }> {
  if (!initVapid()) {
    return { sent: 0, dropped: 0, failed: 0 };
  }

  const subs = await prisma.pushSubscription.findMany({
    where: { userId },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });
  if (subs.length === 0) {
    return { sent: 0, dropped: 0, failed: 0 };
  }

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? '/',
    tag: payload.tag ?? 'mf-notification',
    icon: payload.icon ?? '/icon-192.png',
    badge: payload.badge ?? '/icon-192.png',
    data: payload.data ?? {},
  });

  const deadSubIds: string[] = [];
  let sent = 0;
  let failed = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
          { TTL: 60 },
        );
        sent++;
      } catch (err: unknown) {
        const status =
          err && typeof err === 'object' && 'statusCode' in err
            ? Number((err as { statusCode: unknown }).statusCode)
            : 0;
        if (status === 404 || status === 410) {
          // Subscription is permanently dead — evict so we don't keep hitting it.
          deadSubIds.push(sub.id);
        } else {
          failed++;
          console.warn(
            `[push] send failed for sub ${sub.id.slice(0, 8)} (status=${status}):`,
            err instanceof Error ? err.message : err,
          );
        }
      }
    }),
  );

  if (deadSubIds.length > 0) {
    await prisma.pushSubscription
      .deleteMany({ where: { id: { in: deadSubIds } } })
      .catch((e) => console.warn('[push] dead-sub cleanup failed:', e));
  }

  return { sent, dropped: deadSubIds.length, failed };
}
