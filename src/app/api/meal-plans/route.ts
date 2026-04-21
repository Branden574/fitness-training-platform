import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const createSchema = z.object({
  userId: z.string().cuid(),
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional().nullable(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dailyCalorieTarget: z.number().int().min(0).max(10000),
  dailyProteinTarget: z.number().min(0).max(1000),
  dailyCarbTarget: z.number().min(0).max(2000),
  dailyFatTarget: z.number().min(0).max(500),
});

function parseLocal(yyyyMmDd: string): Date {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

// Trainer creates a meal plan for one of their assigned clients. Admin can
// create for any client. Client is the authoritative one on `trainerId` —
// a trainer can only assign to users where user.trainerId === session.user.id.
export async function POST(request: NextRequest) {
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
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid fields', details: parsed.error.issues },
      { status: 400 },
    );
  }

  const start = parseLocal(parsed.data.startDate);
  const end = parseLocal(parsed.data.endDate);
  if (end.getTime() < start.getTime()) {
    return NextResponse.json(
      { error: 'End date must be on or after start date.' },
      { status: 400 },
    );
  }

  // Ownership guard: trainer can only assign to their own clients.
  const client = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, role: true, trainerId: true },
  });
  if (!client || client.role !== 'CLIENT') {
    return NextResponse.json(
      { error: 'Target is not a client' },
      { status: 404 },
    );
  }
  if (
    session.user.role === 'TRAINER' &&
    client.trainerId !== session.user.id
  ) {
    return NextResponse.json(
      { error: 'Not your client' },
      { status: 403 },
    );
  }

  const plan = await prisma.mealPlan.create({
    data: {
      userId: parsed.data.userId,
      trainerId: session.user.id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      startDate: start,
      endDate: end,
      dailyCalorieTarget: parsed.data.dailyCalorieTarget,
      dailyProteinTarget: parsed.data.dailyProteinTarget,
      dailyCarbTarget: parsed.data.dailyCarbTarget,
      dailyFatTarget: parsed.data.dailyFatTarget,
    },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
    },
  });

  return NextResponse.json(
    { plan },
    { status: 201, headers: { 'Cache-Control': 'private, no-store' } },
  );
}
