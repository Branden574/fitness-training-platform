import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import NotificationsClient, { type InitialNotification } from './notifications-client';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect('/auth/signin?callbackUrl=/notifications');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true },
  });
  if (!user) redirect('/auth/signin?callbackUrl=/notifications');

  const rows = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  const initial: InitialNotification[] = rows.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message ?? n.body ?? '',
    body: n.body ?? n.message ?? null,
    actionUrl: n.actionUrl ?? null,
    metadata: (n.metadata as Record<string, unknown> | null) ?? null,
    timestamp: n.createdAt.toISOString(),
    read: Boolean(n.readAt) || n.read === true,
    readAt: n.readAt ? n.readAt.toISOString() : null,
    appointmentId: n.appointmentId ?? null,
  }));

  const roleHome =
    user.role === 'TRAINER'
      ? '/trainer'
      : user.role === 'ADMIN'
        ? '/admin'
        : '/client';

  return <NotificationsClient initial={initial} backHref={roleHome} />;
}
