import { requireClientSession, getClientContext } from '@/lib/client-data';
import { prisma } from '@/lib/prisma';
import { ClientDesktopShell } from '@/components/ui/mf';
import MessagesClient from './messages-client';
import MessagesDesktop from './messages-desktop';

export const dynamic = 'force-dynamic';

export default async function ClientMessagesPage() {
  const session = await requireClientSession();
  const ctx = await getClientContext(session.user.id);

  if (!ctx.trainer) {
    const empty = (
      <div style={{ padding: 24 }}>
        <div className="mf-eyebrow" style={{ marginBottom: 8 }}>COACH</div>
        <div
          className="mf-card"
          style={{ padding: 24, textAlign: 'center' }}
        >
          <div
            className="mf-font-display"
            style={{ fontSize: 18, marginBottom: 8, textTransform: 'uppercase' }}
          >
            NO COACH ASSIGNED
          </div>
          <div className="mf-fg-dim" style={{ fontSize: 13, lineHeight: 1.5 }}>
            You haven&apos;t been matched with a trainer yet. Once your invite code binds
            you to a coach, messages appear here.
          </div>
        </div>
      </div>
    );
    return (
      <>
        <main className="md:hidden">{empty}</main>
        <div className="hidden md:block">
          <ClientDesktopShell
            active="messages"
            title="Messages"
            breadcrumbs="CONNECT"
            athleteInitials={ctx.initials}
            athleteName={ctx.name ?? ctx.email}
          >
            {empty}
          </ClientDesktopShell>
        </div>
      </>
    );
  }

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: session.user.id, receiverId: ctx.trainer.id },
        { senderId: ctx.trainer.id, receiverId: session.user.id },
      ],
    },
    orderBy: { createdAt: 'asc' },
    take: 200,
    select: {
      id: true,
      content: true,
      senderId: true,
      createdAt: true,
    },
  });

  // Mark trainer messages as read
  await prisma.message.updateMany({
    where: {
      senderId: ctx.trainer.id,
      receiverId: session.user.id,
      read: false,
    },
    data: { read: true },
  }).catch(() => {});

  const mapped = messages.map((m) => ({
    id: m.id,
    content: m.content,
    fromMe: m.senderId === session.user.id,
    at: m.createdAt.toISOString(),
  }));

  return (
    <>
      <MessagesClient
        selfId={session.user.id}
        selfInitials={ctx.initials}
        trainer={{ id: ctx.trainer.id, name: ctx.trainer.name, photoUrl: ctx.trainer.photoUrl }}
        initialMessages={mapped}
      />
      <MessagesDesktop
        selfId={session.user.id}
        selfInitials={ctx.initials}
        trainer={{ id: ctx.trainer.id, name: ctx.trainer.name, photoUrl: ctx.trainer.photoUrl }}
        initialMessages={mapped}
      />
    </>
  );
}
