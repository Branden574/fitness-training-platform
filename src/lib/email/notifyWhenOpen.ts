// src/lib/email/notifyWhenOpen.ts
//
// Fan-out mailer triggered by PATCH /api/trainers/me when a trainer
// transitions out of NOT_ACCEPTING. Sends a one-shot "trainer reopened"
// email to every ContactSubmission row of kind=NOTIFY_WHEN_OPEN with
// notifiedAt=null for that trainer, then sets notifiedAt so the next
// transition does not re-send.
//
// Failures are logged via console and never thrown — callers fire-and-forget.

import 'server-only';
import { prisma } from '@/lib/prisma';
import { sendTrainerReopenedEmail } from '@/lib/email';

export async function sendNotifyWhenOpenForTrainer(trainerId: string): Promise<void> {
  try {
    const trainer = await prisma.user.findUnique({
      where: { id: trainerId },
      select: { name: true, trainerSlug: true },
    });
    if (!trainer || !trainer.trainerSlug) return;

    const rows = await prisma.contactSubmission.findMany({
      where: {
        trainerId,
        kind: 'NOTIFY_WHEN_OPEN',
        notifiedAt: null,
      },
      select: { id: true, email: true },
    });
    if (rows.length === 0) return;

    for (const row of rows) {
      try {
        await sendTrainerReopenedEmail({
          toEmail: row.email,
          trainerName: trainer.name,
          trainerSlug: trainer.trainerSlug,
        });
        // Mark only after the send call returns. Because sendTrainerReopenedEmail
        // is itself fail-open (logs + swallows errors), a runtime exception here
        // would mean something genuinely unexpected — leave notifiedAt null so
        // a future status flip retries.
        await prisma.contactSubmission.update({
          where: { id: row.id },
          data: { notifiedAt: new Date() },
        });
      } catch (err) {
        console.error('[notifyWhenOpen] failed for row', row.id, err);
      }
    }
  } catch (err) {
    console.error('[notifyWhenOpen] outer failure', err);
  }
}
