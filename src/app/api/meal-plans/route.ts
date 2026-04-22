import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { dispatchNotification } from '@/lib/notifications/dispatch';

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
  /** True when the trainer has seen the "you already have an active plan for this
   * client" warning and chose to create a second plan anyway. */
  allowOverlap: z.boolean().optional(),
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

  // Overlap guard: if the client already has a plan covering any part of the
  // new range, flag the duplicate back to the UI with a 409 so the trainer
  // sees the "already has an active plan" prompt. Front-end can retry with
  // `allowOverlap: true` when the user confirms. This is the cheapest
  // defense against the accidental-duplicate bug we saw in prod testing.
  if (!parsed.data.allowOverlap) {
    const overlap = await prisma.mealPlan.findFirst({
      where: {
        userId: parsed.data.userId,
        startDate: { lte: end },
        endDate: { gte: start },
      },
      select: { id: true, name: true, startDate: true, endDate: true },
      orderBy: { startDate: 'desc' },
    });
    if (overlap) {
      return NextResponse.json(
        {
          error: 'overlap',
          message: `This client already has "${overlap.name}" covering ${overlap.startDate
            .toISOString()
            .slice(0, 10)} → ${overlap.endDate.toISOString().slice(0, 10)}. Remove or end that plan first, or resubmit to keep both.`,
          existing: overlap,
        },
        { status: 409 },
      );
    }
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

  // Notify the client that a plan was assigned. Fire-and-forget — the plan
  // was already committed above; a notification hiccup must not rollback.
  void dispatchNotification({
    userId: parsed.data.userId,
    type: 'GENERAL',
    title: 'New meal plan assigned',
    body: `Your coach assigned "${plan.name}" — ${parsed.data.dailyCalorieTarget} kcal / day. Open the Food tab to see it.`,
    actionUrl: '/client/food',
    metadata: { mealPlanId: plan.id },
  });

  return NextResponse.json(
    { plan },
    { status: 201, headers: { 'Cache-Control': 'private, no-store' } },
  );
}
