import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const patchSchema = z.object({
  id: z.string().cuid(),
  action: z.enum(['approve', 'reject']),
  rejectionReason: z.string().max(500).optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const items = await prisma.trainerTransformation.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    include: {
      trainer: {
        select: {
          user: {
            select: { id: true, name: true, email: true, trainerSlug: true },
          },
        },
      },
    },
  });
  return NextResponse.json(
    { items },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
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
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const updated = await prisma.trainerTransformation.update({
    where: { id: parsed.data.id },
    data: {
      status: parsed.data.action === 'approve' ? 'APPROVED' : 'REJECTED',
      rejectionReason:
        parsed.data.action === 'reject'
          ? parsed.data.rejectionReason ?? 'No reason provided'
          : null,
      reviewedBy: session.user.id,
      reviewedAt: new Date(),
    },
  });
  return NextResponse.json({ item: updated });
}
