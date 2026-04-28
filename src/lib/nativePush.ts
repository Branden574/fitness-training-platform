import 'server-only';

import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';
import { prisma } from '@/lib/prisma';
import type { PushPayload } from '@/lib/push';

// Native device push fan-out (APNS + FCM) via firebase-admin. Parallel to
// sendPushToUser (web-push/VAPID). Tokens live in DevicePushToken; this
// helper iterates them, sends via FCM, and deletes tokens that come back
// UNREGISTERED / NOT_FOUND so the table self-cleans.
//
// Env required: FCM_SERVICE_ACCOUNT — the Firebase service account JSON.
// Either paste the raw JSON (works fine in Railway's multi-line env UI)
// or base64-encode it; both are handled. Without the env, every call is
// a silent no-op so dev/staging without Firebase wired still works.
//
// iOS routing note: Capacitor's @capacitor/push-notifications plugin on
// iOS returns raw APNS tokens by default. firebase-admin can only send to
// FCM registration tokens. To get FCM tokens on iOS, add Firebase
// Messaging iOS SDK to the Xcode project (Pod: 'Firebase/Messaging'
// + GoogleService-Info.plist). Until that ships, IOS tokens are stored
// but skipped on send (platform check below).

let cachedApp: App | null = null;
let initAttempted = false;

function getFirebaseApp(): App | null {
  if (cachedApp) return cachedApp;
  if (initAttempted) return null;
  initAttempted = true;

  const raw = process.env.FCM_SERVICE_ACCOUNT;
  if (!raw) return null;

  let parsed: Record<string, unknown>;
  try {
    const asJson = raw.trim().startsWith('{')
      ? raw
      : Buffer.from(raw, 'base64').toString('utf8');
    parsed = JSON.parse(asJson) as Record<string, unknown>;
  } catch (e) {
    console.warn('[nativePush] FCM_SERVICE_ACCOUNT is not valid JSON / base64-JSON:', e);
    return null;
  }

  try {
    const existing = getApps();
    if (existing.length > 0) {
      cachedApp = existing[0];
      return cachedApp;
    }
    cachedApp = initializeApp({
      credential: cert(parsed as Parameters<typeof cert>[0]),
    });
    return cachedApp;
  } catch (e) {
    console.warn('[nativePush] firebase-admin init failed:', e);
    return null;
  }
}

function getMessagingOrNull(): Messaging | null {
  const app = getFirebaseApp();
  if (!app) return null;
  try {
    return getMessaging(app);
  } catch (e) {
    console.warn('[nativePush] getMessaging failed:', e);
    return null;
  }
}

interface SendResult {
  sent: number;
  dropped: number;
  failed: number;
  skipped: number;
}

export async function sendNativePushToUser(
  userId: string,
  payload: PushPayload,
): Promise<SendResult> {
  const messaging = getMessagingOrNull();
  if (!messaging) {
    return { sent: 0, dropped: 0, failed: 0, skipped: 0 };
  }

  const tokens = await prisma.devicePushToken.findMany({
    where: { userId },
    select: { id: true, token: true, platform: true },
  });
  if (tokens.length === 0) {
    return { sent: 0, dropped: 0, failed: 0, skipped: 0 };
  }

  let sent = 0;
  let dropped = 0;
  let failed = 0;
  let skipped = 0;
  const toDelete: string[] = [];

  await Promise.all(
    tokens.map(async (row) => {
      // See "iOS routing note" at top of file. Until Firebase iOS SDK ships
      // in the native app, IOS tokens aren't FCM-routable — skip cleanly.
      if (row.platform === 'IOS' && !isFcmToken(row.token)) {
        skipped++;
        return;
      }
      try {
        await messaging.send({
          token: row.token,
          notification: {
            title: payload.title,
            body: payload.body,
          },
          data: {
            url: payload.url ?? '/',
            ...(payload.tag ? { tag: payload.tag } : {}),
            ...(payload.data
              ? Object.fromEntries(
                  Object.entries(payload.data).map(([k, v]) => [k, String(v)]),
                )
              : {}),
          },
          android: {
            priority: 'high',
            notification: {
              channelId: 'replab-default',
            },
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
              },
            },
          },
        });
        sent++;
      } catch (err) {
        const code = (err as { code?: string })?.code ?? '';
        if (
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token'
        ) {
          toDelete.push(row.id);
          dropped++;
        } else {
          console.warn('[nativePush] send failed:', code || err);
          failed++;
        }
      }
    }),
  );

  if (toDelete.length > 0) {
    try {
      await prisma.devicePushToken.deleteMany({
        where: { id: { in: toDelete } },
      });
    } catch (e) {
      console.warn('[nativePush] cleanup deletion failed:', e);
    }
  }

  return { sent, dropped, failed, skipped };
}

// FCM tokens are opaque but consistently 140+ chars and start with a path-
// like prefix; raw APNS tokens are 64 hex chars. This is a best-effort guard
// to avoid firing a guaranteed-fail send for an APNS-only iOS device.
function isFcmToken(token: string): boolean {
  if (!token) return false;
  if (/^[a-f0-9]{64}$/i.test(token)) return false;
  return token.length >= 100;
}
