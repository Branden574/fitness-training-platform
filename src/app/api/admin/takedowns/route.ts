import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const resolveSchema = z.object({
  id: z.string().cuid(),
  resolution: z.enum(['remove', 'keep']),
  note: z.string().max(1000).optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const items = await prisma.contentTakedownRequest.findMany({
    where: { status: { in: ['OPEN', 'REVIEWING'] } },
    orderBy: { createdAt: 'asc' },
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
  const parsed = resolveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const takedown = await prisma.contentTakedownRequest.findUnique({
    where: { id: parsed.data.id },
  });
  if (!takedown) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (parsed.data.resolution === 'remove') {
    if (takedown.contentType === 'transformation') {
      await prisma.trainerTransformation
        .update({
          where: { id: takedown.contentId },
          data: { status: 'REMOVED' },
        })
        .catch(() => null);
    } else if (takedown.contentType === 'testimonial') {
      await prisma.trainerTestimonial
        .delete({ where: { id: takedown.contentId } })
        .catch(() => null);
    }
  }

  const updated = await prisma.contentTakedownRequest.update({
    where: { id: parsed.data.id },
    data: {
      status: parsed.data.resolution === 'remove' ? 'RESOLVED_REMOVED' : 'RESOLVED_KEPT',
      resolvedBy: session.user.id,
      resolvedAt: new Date(),
      resolutionNote: parsed.data.note ?? null,
    },
  });
  return NextResponse.json({ item: updated });
}
