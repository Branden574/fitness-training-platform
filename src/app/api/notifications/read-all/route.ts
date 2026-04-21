import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { publishToUser } from '@/lib/notifications/sse-registry';

// POST /api/notifications/read-all — marks every unread Notification for the
// current user as read (sets both legacy `read: true` and new `readAt: now()`)
// in a single updateMany. Publishes an SSE event so other open tabs drop the
// badge count without a round trip.

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;
  const now = new Date();

  const result = await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true, readAt: now },
  });

  try {
    publishToUser(userId, {
      event: 'notification.read_all',
      data: { at: now.toISOString(), updated: result.count },
    });
  } catch (e) {
    console.warn('[read-all] SSE publish failed:', e);
  }

  return NextResponse.json({ updated: result.count });
}
