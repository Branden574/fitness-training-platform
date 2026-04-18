import { requireTrainerSession, initialsFor } from '@/lib/trainer-data';
import { prisma } from '@/lib/prisma';
import { DesktopShell } from '@/components/ui/mf';
import TrainerInboxClient from './inbox-client';

export const dynamic = 'force-dynamic';

interface SearchParams {
  with?: string;
}

export default async function TrainerMessagesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireTrainerSession();
  const sp = await searchParams;

  // All clients of this trainer (for the left rail)
  const clients = await prisma.user.findMany({
    where: { trainerId: session.user.id, role: 'CLIENT' },
    select: {
      id: true,
      name: true,
      email: true,
      sentMessages: {
        where: { receiverId: session.user.id },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { content: true, createdAt: true, read: true },
      },
      receivedMessages: {
        where: { senderId: session.user.id },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { createdAt: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  const rail = clients.map((c) => {
    const last = c.sentMessages[0];
    const lastFromMe = c.receivedMessages[0];
    const lastAt =
      last && lastFromMe
        ? last.createdAt > lastFromMe.createdAt
          ? last.createdAt
          : lastFromMe.createdAt
        : (last?.createdAt ?? lastFromMe?.createdAt ?? null);
    return {
      id: c.id,
      name: c.name,
      email: c.email,
      initials: initialsFor(c.name, c.email),
      lastPreview: last?.content ?? null,
      unreadFromClient: last && !last.read ? 1 : 0,
      lastAt: lastAt?.toISOString() ?? null,
    };
  });

  // Sort rail: unread first, then most recent
  rail.sort((a, b) => {
    if (a.unreadFromClient !== b.unreadFromClient) return b.unreadFromClient - a.unreadFromClient;
    if (a.lastAt && b.lastAt) return b.lastAt.localeCompare(a.lastAt);
    if (a.lastAt) return -1;
    if (b.lastAt) return 1;
    return (a.name ?? '').localeCompare(b.name ?? '');
  });

  const activeId = sp.with && rail.some((r) => r.id === sp.with) ? sp.with : rail[0]?.id ?? null;

  let thread: Array<{ id: string; content: string; fromMe: boolean; at: string }> = [];
  let activeName: string | null = null;
  let activeInitials = '';

  if (activeId) {
    const activeRail = rail.find((r) => r.id === activeId);
    activeName = activeRail?.name ?? activeRail?.email ?? null;
    activeInitials = activeRail?.initials ?? '';

    const msgs = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: session.user.id, receiverId: activeId },
          { senderId: activeId, receiverId: session.user.id },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take: 200,
      select: { id: true, content: true, senderId: true, createdAt: true },
    });
    thread = msgs.map((m) => ({
      id: m.id,
      content: m.content,
      fromMe: m.senderId === session.user.id,
      at: m.createdAt.toISOString(),
    }));

    // Mark trainer-incoming messages read
    await prisma.message.updateMany({
      where: { senderId: activeId, receiverId: session.user.id, read: false },
      data: { read: true },
    }).catch(() => {});
  }

  const totalUnread = rail.reduce((s, r) => s + r.unreadFromClient, 0);

  return (
    <DesktopShell
      role="trainer"
      active="messages"
      title="Inbox"
      breadcrumbs="TRAINER / MESSAGES"
      nav={undefined}
    >
      <TrainerInboxClient
        selfId={session.user.id}
        rail={rail}
        activeId={activeId}
        activeName={activeName}
        activeInitials={activeInitials}
        initialThread={thread}
        totalUnread={totalUnread}
      />
    </DesktopShell>
  );
}
