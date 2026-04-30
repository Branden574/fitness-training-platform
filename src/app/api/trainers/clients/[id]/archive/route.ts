import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { archiveClient } from '@/lib/clientArchival';

const bodySchema = z.object({
  reason: z.string().max(500).optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await context.params;

  // Trainer must own this client; admin can archive any.
  const target = await prisma.user.findFirst({
    where:
      session.user.role === 'ADMIN'
        ? { id, role: 'CLIENT' }
        : { id, role: 'CLIENT', trainerId: session.user.id },
    select: { id: true },
  });
  if (!target) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request' },
      { status: 400 },
    );
  }

  await archiveClient({
    clientId: id,
    archivedByUserId: session.user.id,
    reason: parsed.data.reason ?? null,
  });

  return NextResponse.json({ ok: true });
}
