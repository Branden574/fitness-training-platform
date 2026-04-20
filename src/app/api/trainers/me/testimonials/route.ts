import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ensureTrainerRow } from '@/lib/trainerRow';

const createSchema = z.object({
  quote: z.string().min(5).max(500),
  attribution: z.string().min(1).max(120),
  order: z.number().int().min(0).max(1000).optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'TRAINER' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const trainer = await ensureTrainerRow(session.user.id, prisma);
  const items = await prisma.trainerTestimonial.findMany({
    where: { trainerId: trainer.id },
    orderBy: { order: 'asc' },
  });
  return NextResponse.json(
    { items },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'TRAINER' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const trainer = await ensureTrainerRow(session.user.id, prisma);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid fields', details: parsed.error.issues },
      { status: 400 },
    );
  }

  const last = await prisma.trainerTestimonial.aggregate({
    where: { trainerId: trainer.id },
    _max: { order: true },
  });
  const nextOrder = parsed.data.order ?? (last._max.order ?? -1) + 1;

  const created = await prisma.trainerTestimonial.create({
    data: {
      trainerId: trainer.id,
      quote: parsed.data.quote,
      attribution: parsed.data.attribution,
      order: nextOrder,
    },
  });
  return NextResponse.json({ item: created }, { status: 201 });
}
