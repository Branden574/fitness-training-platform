import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const patchSchema = z.object({
  quote: z.string().min(5).max(500).optional(),
  attribution: z.string().min(1).max(120).optional(),
  order: z.number().int().min(0).max(1000).optional(),
});

async function ownership(userId: string, id: string) {
  const item = await prisma.trainerTestimonial.findUnique({
    where: { id },
    select: { trainer: { select: { userId: true } } },
  });
  if (!item) return { found: false as const };
  return { found: true as const, owner: item.trainer.userId === userId };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const check = await ownership(session.user.id, id);
  if (!check.found) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!check.owner && session.user.role !== 'ADMIN') {
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

  const updated = await prisma.trainerTestimonial.update({
    where: { id },
    data: parsed.data,
  });
  return NextResponse.json({ item: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const check = await ownership(session.user.id, id);
  if (!check.found) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!check.owner && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.trainerTestimonial.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
