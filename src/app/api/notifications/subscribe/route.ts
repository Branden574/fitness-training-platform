import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// POST/DELETE /api/notifications/subscribe
// Client sends the browser's PushSubscription.toJSON() payload. We upsert by
// endpoint (unique) so re-subscribing from the same browser updates keys
// in place instead of creating duplicate rows.

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof subscribeSchema>;
  try {
    body = subscribeSchema.parse(await request.json());
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: e.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const userAgent = request.headers.get('user-agent') ?? null;

  const sub = await prisma.pushSubscription.upsert({
    where: { endpoint: body.endpoint },
    create: {
      userId: session.user.id,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      userAgent,
    },
    update: {
      // On re-subscribe (keys rotated, same browser), refresh keys + reassign
      // to the current user (the same device shouldn't belong to two users).
      userId: session.user.id,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      userAgent,
    },
    select: { id: true },
  });

  return NextResponse.json({ id: sub.id, ok: true });
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint');

  if (endpoint) {
    await prisma.pushSubscription
      .deleteMany({ where: { endpoint, userId: session.user.id } })
      .catch(() => {
        // Not-found is fine — the client wanted the row gone and it isn't there.
      });
  } else {
    // No endpoint = remove ALL subscriptions for this user (e.g., "sign out
    // everywhere" or a global push off toggle).
    await prisma.pushSubscription.deleteMany({ where: { userId: session.user.id } });
  }

  return NextResponse.json({ ok: true });
}
