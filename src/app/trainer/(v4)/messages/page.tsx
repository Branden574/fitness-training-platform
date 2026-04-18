import { requireTrainerSession, initialsFor } from '@/lib/trainer-data';
import { prisma } from '@/lib/prisma';
import InboxDesktop from './inbox-desktop';
import InboxMobile from './inbox-mobile';

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

  // Desktop: default to first client if ?with missing. Mobile: null shows list.
  const requestedWith = sp.with && rail.some((r) => r.id === sp.with) ? sp.with : null;
  const desktopActiveId = requestedWith ?? rail[0]?.id ?? null;
  const mobileActiveId = requestedWith;

  // Resolve thread for whichever active id we need (desktop always has one if any clients exist;
  // mobile only has one when ?with=<id>). If they're the same, fetch once. If only desktop has
  // one (mobile is list view), fetch desktop's.
  const threadForId = desktopActiveId; // superset of mobileActiveId
  let thread: Array<{ id: string; content: string; fromMe: boolean; at: string }> = [];
  let activeName: string | null = null;
  let activeInitials = '';

  if (threadForId) {
    const activeRail = rail.find((r) => r.id === threadForId);
    activeName = activeRail?.name ?? activeRail?.email ?? null;
    activeInitials = activeRail?.initials ?? '';

    const msgs = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: session.user.id, receiverId: threadForId },
          { senderId: threadForId, receiverId: session.user.id },
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

    // Mark trainer-incoming messages read for the active thread. Matches prior desktop
    // behavior (which defaulted to first client when no ?with was set).
    await prisma.message
      .updateMany({
        where: { senderId: threadForId, receiverId: session.user.id, read: false },
        data: { read: true },
      })
      .catch(() => {});
  }

  const totalUnread = rail.reduce((s, r) => s + r.unreadFromClient, 0);

  // For the mobile list view (no ?with), we don't need the preloaded thread.
  const mobileInitialThread = mobileActiveId ? thread : [];
  const mobileActiveName = mobileActiveId ? activeName : null;
  const mobileActiveInitials = mobileActiveId ? activeInitials : '';

  return (
    <>
      <InboxMobile
        selfId={session.user.id}
        rail={rail}
        activeId={mobileActiveId}
        activeName={mobileActiveName}
        activeInitials={mobileActiveInitials}
        initialThread={mobileInitialThread}
      />
      <InboxDesktop
        selfId={session.user.id}
        rail={rail}
        activeId={desktopActiveId}
        activeName={activeName}
        activeInitials={activeInitials}
        initialThread={thread}
        totalUnread={totalUnread}
      />
    </>
  );
}
