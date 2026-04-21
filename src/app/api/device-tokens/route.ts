import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// POST /api/device-tokens — register or refresh a native device push token.
// DELETE /api/device-tokens?token=... — unregister (called on sign-out or
// when the Capacitor plugin fires a 'registrationError'). Both idempotent.

const RegisterSchema = z.object({
  token: z.string().min(32).max(4096),
  platform: z.enum(['IOS', 'ANDROID']),
  appVersion: z.string().max(64).optional(),
  deviceName: z.string().max(128).optional(),
});

async function resolveUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  return user?.id ?? null;
}

export async function POST(request: NextRequest) {
  const userId = await resolveUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { token, platform, appVersion, deviceName } = parsed.data;

  // Upsert by token (globally unique). If the same token is already bound
  // to a different user (phone handed off to family member, rare), we move
  // it — last-writer-wins is the right semantics.
  const row = await prisma.devicePushToken.upsert({
    where: { token },
    create: {
      userId,
      token,
      platform,
      appVersion,
      deviceName,
    },
    update: {
      userId,
      platform,
      appVersion,
      deviceName,
      lastSeenAt: new Date(),
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: row.id });
}

export async function DELETE(request: NextRequest) {
  const userId = await resolveUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'token required' }, { status: 400 });
  }

  // Scope delete to the authenticated user so one client can't evict
  // another user's token by guessing it.
  await prisma.devicePushToken.deleteMany({
    where: { userId, token },
  });

  return NextResponse.json({ ok: true });
}
