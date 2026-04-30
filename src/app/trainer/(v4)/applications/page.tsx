import { requireTrainerSession } from '@/lib/trainer-data';
import { prisma } from '@/lib/prisma';
import { DesktopShell } from '@/components/ui/mf';
import ApplicationsClient, { type SerializedSubmission } from './applications-client';

export const dynamic = 'force-dynamic';

export default async function TrainerApplicationsPage() {
  const session = await requireTrainerSession();

  const submissions = await prisma.contactSubmission.findMany({
    where: { trainerId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      message: true,
      status: true,
      kind: true,
      waitlist: true,
      notifiedAt: true,
      createdAt: true,
    },
  });

  // For any INVITED applications, look up the matching Invitation code so the
  // detail pane can show "Resend invite email" without forcing the trainer to
  // bounce to /admin/invitations. We key on email + invitedBy and pick the
  // most recent — Invitation has no FK back to the submission.
  const invitedEmails = Array.from(
    new Set(
      submissions
        .filter((s) => s.kind === 'APPLICATION' && s.status === 'INVITED')
        .map((s) => s.email),
    ),
  );
  const invitations = invitedEmails.length
    ? await prisma.invitation.findMany({
        where: {
          invitedBy: session.user.id,
          email: { in: invitedEmails },
        },
        orderBy: { createdAt: 'desc' },
        select: { email: true, code: true },
      })
    : [];
  const codeByEmail = new Map<string, string>();
  for (const inv of invitations) {
    if (!codeByEmail.has(inv.email)) codeByEmail.set(inv.email, inv.code);
  }

  const initial: SerializedSubmission[] = submissions.map((s) => ({
    ...s,
    notifiedAt: s.notifiedAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
    inviteCode:
      s.kind === 'APPLICATION' && s.status === 'INVITED'
        ? codeByEmail.get(s.email) ?? null
        : null,
  }));

  return (
    <DesktopShell
      role="trainer"
      active="applications"
      title="Applications"
      breadcrumbs="TRAINER / APPLICATIONS"
    >
      <ApplicationsClient initial={initial} />
    </DesktopShell>
  );
}
