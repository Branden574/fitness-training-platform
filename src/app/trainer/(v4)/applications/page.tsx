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

  const initial: SerializedSubmission[] = submissions.map((s) => ({
    ...s,
    notifiedAt: s.notifiedAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
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
