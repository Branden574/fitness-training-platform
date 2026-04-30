// src/lib/clientArchival.ts
// Single source of truth for the trainer-initiated client offboarding flow.
// Used by /api/trainers/clients/[id]/archive, /restore, /delete-now, and the
// nightly /api/cron/hard-delete-archived.

import { Resend } from 'resend';
import { prisma } from '@/lib/prisma';
import { deleteR2Prefix } from '@/lib/storage';

export const ARCHIVE_GRACE_DAYS = 30;
const ARCHIVE_GRACE_MS = ARCHIVE_GRACE_DAYS * 86400000;

export interface ArchiveInput {
  clientId: string;
  archivedByUserId: string;
  reason?: string | null;
}

/**
 * Soft-archives a client: sets archivedAt + archivedByUserId + archivedReason,
 * sets isActive=false. Reversible via restoreClient() within ARCHIVE_GRACE_DAYS.
 */
export async function archiveClient(input: ArchiveInput): Promise<void> {
  await prisma.user.update({
    where: { id: input.clientId },
    data: {
      archivedAt: new Date(),
      archivedByUserId: input.archivedByUserId,
      archivedReason: input.reason ?? null,
      isActive: false,
    },
  });
}

/**
 * Reverses an archive: clears archive fields, restores isActive=true.
 */
export async function restoreClient(clientId: string): Promise<void> {
  await prisma.user.update({
    where: { id: clientId },
    data: {
      archivedAt: null,
      archivedByUserId: null,
      archivedReason: null,
      isActive: true,
    },
  });
}

/**
 * Compute the `archivedAt` cutoff for cron-driven hard-delete.
 * Returns the timestamp BEFORE which any archivedAt qualifies for purge.
 */
export function hardDeleteCutoff(): Date {
  return new Date(Date.now() - ARCHIVE_GRACE_MS);
}

/**
 * Permanently deletes a single client's account and all data.
 * - Sends a final notification email (best-effort; doesn't block delete)
 * - Wipes R2 objects under users/{userId}/ prefix (best-effort)
 * - Deletes ContactSubmission rows by email (SetNull on trainer FK)
 * - prisma.user.delete cascades through child records
 *
 * Caller is responsible for authorization. The cron loops over a query
 * filtered by hardDeleteCutoff(); the delete-now route loads the user
 * and verifies trainer/admin ownership before calling this.
 */
export async function hardDeleteClient(clientId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: clientId },
    select: { id: true, email: true, name: true },
  });
  if (!user) return;

  // 1. Final notification email (best-effort)
  try {
    await sendFinalDeletionEmail(user.email, user.name);
  } catch (err) {
    console.error('hardDeleteClient: email failed for', user.id, err);
  }

  // 2. Wipe R2 photos under users/{userId}/ prefix (best-effort)
  try {
    await deleteR2Prefix(`users/${user.id}/`);
  } catch (err) {
    console.error('hardDeleteClient: R2 wipe failed for', user.id, err);
  }

  // 3. Delete ContactSubmission rows by email — trainer FK is SetNull, not Cascade
  await prisma.contactSubmission.deleteMany({
    where: { email: user.email },
  });

  // 4. Delete the user — cascades through WorkoutSession, WorkoutProgress,
  //    Appointment, Message, ClientProfile, CoachNote, ProgramAssignment,
  //    Notification, PushSubscription, DevicePushToken, FoodEntry,
  //    FavoriteFood, MealPlan, NutritionPlan, ProgressEntry, Session, Account.
  await prisma.user.delete({ where: { id: user.id } });

  console.log(`[hardDeleteClient] Deleted user ${user.id} (${user.email})`);
}

async function sendFinalDeletionEmail(
  email: string,
  name: string | null,
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return; // no-op in environments without Resend
  const resend = new Resend(process.env.RESEND_API_KEY);
  const display = name ?? 'there';
  await resend.emails.send({
    from: 'RepLab <noreply@replabusa.com>',
    to: email,
    subject: 'Your RepLab account has been deleted',
    text: `Hi ${display},\n\nYour RepLab account has been permanently deleted along with all associated workout history, messages, and uploaded photos.\n\nIf you'd like to come back, you'll need to apply to a trainer fresh at https://replabusa.com/apply.\n\n— RepLab`,
  });
}
