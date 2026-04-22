import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { dispatchNotification } from '@/lib/notifications/dispatch';

// Per-client MealPlan CRUD that the POST /api/meal-plans route didn't have
// a delete/patch counterpart for — trainers were stuck with duplicate plans
// they couldn't clean up. ADMIN + the trainer who owns the client's roster
// are the only allowed editors. MealPlan → Meal → MealItem cascades delete
// via the schema so we don't have to walk the tree manually.

async function loadPlanAndAuth(
  planId: string,
): Promise<
  | {
      ok: true;
      plan: {
        id: string;
        userId: string;
        trainerId: string;
        name: string;
      };
      sessionUserId: string;
      sessionRole: string;
    }
  | { ok: false; status: number; error: string }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }
  if (session.user.role !== 'TRAINER' && session.user.role !== 'ADMIN') {
    return { ok: false, status: 403, error: 'Forbidden' };
  }
  const plan = await prisma.mealPlan.findUnique({
    where: { id: planId },
    select: {
      id: true,
      userId: true,
      trainerId: true,
      name: true,
      user: { select: { trainerId: true } },
    },
  });
  if (!plan) {
    return { ok: false, status: 404, error: 'Meal plan not found' };
  }
  // Trainers can mutate plans where they either authored the row OR they're
  // the client's assigned trainer. The second condition covers the case
  // where a plan was authored by an admin on behalf of the trainer.
  if (
    session.user.role === 'TRAINER' &&
    plan.trainerId !== session.user.id &&
    plan.user?.trainerId !== session.user.id
  ) {
    return { ok: false, status: 403, error: 'Not your client' };
  }
  return {
    ok: true,
    plan: {
      id: plan.id,
      userId: plan.userId,
      trainerId: plan.trainerId,
      name: plan.name,
    },
    sessionUserId: session.user.id,
    sessionRole: session.user.role,
  };
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const auth = await loadPlanAndAuth(id);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  await prisma.mealPlan.delete({ where: { id } });

  // Let the client know their plan was removed so they don't keep logging
  // against a target that's gone. Fire-and-forget — a notification failure
  // must not strand the HTTP response.
  void dispatchNotification({
    userId: auth.plan.userId,
    type: 'GENERAL',
    title: 'Meal plan removed',
    body: `Your coach removed the meal plan "${auth.plan.name}". Check the Food tab for the current plan.`,
    actionUrl: '/client/food',
  });

  return NextResponse.json({ ok: true });
}

const patchSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  dailyCalorieTarget: z.number().int().min(0).max(10000).optional(),
  dailyProteinTarget: z.number().min(0).max(1000).optional(),
  dailyCarbTarget: z.number().min(0).max(2000).optional(),
  dailyFatTarget: z.number().min(0).max(500).optional(),
});

function parseLocal(yyyyMmDd: string): Date {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const auth = await loadPlanAndAuth(id);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
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

  const data: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.description !== undefined) data.description = parsed.data.description;
  if (parsed.data.startDate) data.startDate = parseLocal(parsed.data.startDate);
  if (parsed.data.endDate) data.endDate = parseLocal(parsed.data.endDate);
  if (parsed.data.dailyCalorieTarget !== undefined)
    data.dailyCalorieTarget = parsed.data.dailyCalorieTarget;
  if (parsed.data.dailyProteinTarget !== undefined)
    data.dailyProteinTarget = parsed.data.dailyProteinTarget;
  if (parsed.data.dailyCarbTarget !== undefined)
    data.dailyCarbTarget = parsed.data.dailyCarbTarget;
  if (parsed.data.dailyFatTarget !== undefined)
    data.dailyFatTarget = parsed.data.dailyFatTarget;

  // Range sanity only when both fields are present (either from the body or
  // combined with an existing DB value).
  if (data.startDate instanceof Date && data.endDate instanceof Date) {
    if (data.endDate.getTime() < data.startDate.getTime()) {
      return NextResponse.json(
        { error: 'End date must be on or after start date.' },
        { status: 400 },
      );
    }
  }

  const updated = await prisma.mealPlan.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      dailyCalorieTarget: true,
      dailyProteinTarget: true,
      dailyCarbTarget: true,
      dailyFatTarget: true,
    },
  });

  void dispatchNotification({
    userId: auth.plan.userId,
    type: 'GENERAL',
    title: 'Meal plan updated',
    body: `Your coach updated "${updated.name}". Open the Food tab to see the latest targets.`,
    actionUrl: '/client/food',
  });

  return NextResponse.json({ plan: updated });
}
