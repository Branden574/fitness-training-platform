import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const patchSchema = z.object({
  acceptingClients: z.boolean().optional(),
  isPublic: z.boolean().optional(),
});

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'TRAINER' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid fields', details: parsed.error.issues },
      { status: 400 },
    );
  }

  const data: Record<string, boolean> = {};
  if (parsed.data.acceptingClients !== undefined)
    data.trainerAcceptingClients = parsed.data.acceptingClients;
  if (parsed.data.isPublic !== undefined)
    data.trainerIsPublic = parsed.data.isPublic;

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: {
      trainerAcceptingClients: true,
      trainerIsPublic: true,
    },
  });

  return NextResponse.json(updated);
}
