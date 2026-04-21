import 'server-only';

import type { NotificationType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { publishToUser } from './sse-registry';
import { sendPushToUser } from '@/lib/push';
import { sendNativePushToUser } from '@/lib/nativePush';

// The ONE authorized place to create a Notification row. All 14 existing
// `prisma.notification.create` call sites get migrated through this helper in
// 3A.6; new code calls this instead of touching Prisma directly.
//
// Contract:
// - Fire-and-forget from the caller's perspective. Errors are logged but never
//   thrown — a failing notification must not block the real parent action
//   (workout save, program assign, etc.). Call this AFTER any enclosing
//   `prisma.$transaction` commits, never inside one.
// - Writes to both old (`message`, `read`) and new (`body`, `readAt`) columns
//   so pre-3A readers keep working.
// - Preferences gate the channels: `inAppEnabled=false` skips DB persistence
//   entirely; `pushEnabled=false` skips OS push. Type-specific toggles gate
//   both. Quiet hours suppress push but still persist in-app so the user sees
//   it when they're back online.

export interface DispatchInput {
  userId: string;
  type: NotificationType;
  title: string;
  /** User-facing body. Mirrors legacy `message` column — writers populate both. */
  body: string;
  actionUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  /** Skip push even if user enables it — e.g., the user themselves triggered this. */
  suppressPush?: boolean;
}

interface ChannelDecision {
  persist: boolean;
  push: boolean;
}

/**
 * Maps an enum type to the per-type preference column. Types not in this map
 * (SYSTEM, GENERAL, APPOINTMENT_*) default to "always on" — operational stuff
 * the user doesn't opt out of at a type level.
 */
const TYPE_TO_PREF_KEY: Partial<Record<NotificationType, keyof PrefRowPartial>> = {
  WORKOUT_ASSIGNED: 'workoutAssigned',
  WORKOUT_UPDATED: 'workoutUpdated',
  PR_LOGGED: 'prLogged',
  MESSAGE_RECEIVED: 'messageReceived',
  PROGRAM_COMPLETED: 'programCompleted',
  TRAINER_FEEDBACK: 'trainerFeedback',
};

type PrefRowPartial = {
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
};

async function loadOrCreatePreferences(userId: string): Promise<PrefRowPartial> {
  const existing = await prisma.notificationPreference.findUnique({
    where: { userId },
    select: {
      inAppEnabled: true,
      pushEnabled: true,
      workoutAssigned: true,
      workoutUpdated: true,
      prLogged: true,
      messageReceived: true,
      programCompleted: true,
      trainerFeedback: true,
      quietHoursStart: true,
      quietHoursEnd: true,
    },
  });
  if (existing) return existing;
  // Lazy default creation so new users get the full-on preferences without a
  // migration. `upsert` not `create` to race-safely handle the case where two
  // simultaneous dispatches for a brand-new user both miss the findUnique.
  return prisma.notificationPreference.upsert({
    where: { userId },
    create: { userId },
    update: {},
    select: {
      inAppEnabled: true,
      pushEnabled: true,
      workoutAssigned: true,
      workoutUpdated: true,
      prLogged: true,
      messageReceived: true,
      programCompleted: true,
      trainerFeedback: true,
      quietHoursStart: true,
      quietHoursEnd: true,
    },
  });
}

function inQuietHours(prefs: PrefRowPartial, userTimezone: string | null): boolean {
  const start = prefs.quietHoursStart;
  const end = prefs.quietHoursEnd;
  if (start == null || end == null) return false;
  if (start === end) return false;
  // User's current hour in their declared timezone; fall back to UTC if unset.
  const tz = userTimezone ?? 'UTC';
  let currentHour: number;
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric',
      hour12: false,
    });
    currentHour = parseInt(fmt.format(new Date()), 10);
    if (!Number.isFinite(currentHour)) currentHour = new Date().getUTCHours();
  } catch {
    currentHour = new Date().getUTCHours();
  }
  // Wraps past midnight when end < start (e.g., 22 → 6 = 22,23,0,1,2,3,4,5).
  if (end < start) return currentHour >= start || currentHour < end;
  return currentHour >= start && currentHour < end;
}

function decide(
  prefs: PrefRowPartial,
  type: NotificationType,
  userTimezone: string | null,
  suppressPush: boolean,
): ChannelDecision {
  const typePrefKey = TYPE_TO_PREF_KEY[type];
  const typeAllowed = typePrefKey ? prefs[typePrefKey] === true : true;

  if (!typeAllowed) return { persist: false, push: false };
  if (!prefs.inAppEnabled) return { persist: false, push: false };

  if (suppressPush) return { persist: true, push: false };
  if (!prefs.pushEnabled) return { persist: true, push: false };
  if (inQuietHours(prefs, userTimezone)) return { persist: true, push: false };

  return { persist: true, push: true };
}

export async function dispatchNotification(input: DispatchInput): Promise<void> {
  try {
    const [prefs, user] = await Promise.all([
      loadOrCreatePreferences(input.userId),
      prisma.user.findUnique({
        where: { id: input.userId },
        select: { timezone: true },
      }),
    ]);

    const decision = decide(
      prefs,
      input.type,
      user?.timezone ?? null,
      input.suppressPush ?? false,
    );

    if (!decision.persist) return;

    const created = await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.body,
        body: input.body,
        actionUrl: input.actionUrl ?? null,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        read: false,
      },
      select: {
        id: true,
        userId: true,
        type: true,
        title: true,
        body: true,
        message: true,
        actionUrl: true,
        metadata: true,
        read: true,
        readAt: true,
        createdAt: true,
      },
    });

    // SSE publish — best-effort; failures here are network/controller cleanup
    // glitches and we don't want them to poison push delivery.
    try {
      publishToUser(input.userId, {
        event: 'notification.created',
        data: created,
      });
    } catch (e) {
      console.warn('[dispatchNotification] SSE publish failed:', e);
    }

    if (decision.push) {
      const pushPayload = {
        title: input.title,
        body: input.body,
        url: input.actionUrl ?? '/',
        tag: input.type,
        data: { notificationId: created.id, type: input.type },
      };
      // Fire-and-forget from the dispatch perspective so the caller's response
      // returns promptly; errors inside each sender are already contained.
      // Web-push (browsers) + native push (Capacitor iOS/Android) run in
      // parallel — one user's laptop browser and phone both light up.
      sendPushToUser(input.userId, pushPayload).catch((e) =>
        console.warn('[dispatchNotification] web push failed:', e),
      );
      sendNativePushToUser(input.userId, pushPayload).catch((e) =>
        console.warn('[dispatchNotification] native push failed:', e),
      );
    }
  } catch (err) {
    // Swallow everything. A failed notification must NEVER break the caller's
    // real work (workout save, program assign, etc.). Log so ops can triage.
    console.warn('[dispatchNotification] dispatch failed:', err);
  }
}
