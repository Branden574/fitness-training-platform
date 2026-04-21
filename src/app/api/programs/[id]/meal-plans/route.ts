import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Meal plan templates attached to a Program. A program can have one plan
// covering its whole duration, or multiple plans with week ranges (e.g.,
// 1-4 cut, 5-8 maintenance). On ProgramAssignment, these templates get
// cloned into per-client MealPlan rows with concrete dates — that cloning
// lives in the assign route (Slice 3).

const mealItemSchema = z.object({
  foodId: z.string().min(1),
  quantity: z.number().positive(),
  order: z.number().int().nonnegative().optional(),
  notes: z.string().optional().nullable(),
});

const mealSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.enum(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK']),
  order: z.number().int().nonnegative().optional(),
  notes: z.string().optional().nullable(),
  items: z.array(mealItemSchema).default([]),
});

const createSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().optional().nullable(),
  startWeek: z.number().int().positive().default(1),
  endWeek: z.number().int().positive().optional().nullable(),
  dailyCalorieTarget: z.number().int().positive(),
  dailyProteinTarget: z.number().nonnegative(),
  dailyCarbTarget: z.number().nonnegative(),
  dailyFatTarget: z.number().nonnegative(),
  order: z.number().int().nonnegative().optional(),
  meals: z.array(mealSchema).default([]),
});

async function canEdit(sessionUserId: string, role: string, programId: string): Promise<boolean> {
  if (role === 'ADMIN') return true;
  if (role !== 'TRAINER') return false;
  const p = await prisma.program.findUnique({
    where: { id: programId },
    select: { createdById: true },
  });
  return p?.createdById === sessionUserId;
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: programId } = await params;
  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: { id: true, createdById: true, assignments: { select: { clientId: true } } },
  });
  if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 });

  // Same visibility rule as GET /api/programs/[id]: creator, assigned client, or admin.
  const isCreator = program.createdById === session.user.id;
  const isAssignedClient = program.assignments.some((a) => a.clientId === session.user.id);
  if (session.user.role !== 'ADMIN' && !isCreator && !isAssignedClient) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const plans = await prisma.programMealPlan.findMany({
    where: { programId },
    orderBy: [{ order: 'asc' }, { startWeek: 'asc' }],
    include: {
      meals: {
        orderBy: { order: 'asc' },
        include: {
          items: {
            orderBy: { order: 'asc' },
            include: { food: true },
          },
        },
      },
    },
  });

  return NextResponse.json({ mealPlans: plans });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: programId } = await params;
  if (!(await canEdit(session.user.id, session.user.role, programId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: z.infer<typeof createSchema>;
  try {
    body = createSchema.parse(await request.json());
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: e.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  // endWeek, when present, must be >= startWeek. Don't bother bounding against
  // program.durationWks here — a trainer might be sketching, and an out-of-bounds
  // plan just shows as "inactive" for later weeks of the current assignment.
  if (body.endWeek != null && body.endWeek < body.startWeek) {
    return NextResponse.json(
      { error: 'endWeek must be >= startWeek' },
      { status: 400 },
    );
  }

  const plan = await prisma.programMealPlan.create({
    data: {
      programId,
      name: body.name,
      description: body.description ?? null,
      startWeek: body.startWeek,
      endWeek: body.endWeek ?? null,
      dailyCalorieTarget: body.dailyCalorieTarget,
      dailyProteinTarget: body.dailyProteinTarget,
      dailyCarbTarget: body.dailyCarbTarget,
      dailyFatTarget: body.dailyFatTarget,
      order: body.order ?? 0,
      meals: {
        create: body.meals.map((m, mi) => ({
          name: m.name,
          type: m.type,
          order: m.order ?? mi,
          notes: m.notes ?? null,
          items: {
            create: m.items.map((it, ii) => ({
              foodId: it.foodId,
              quantity: it.quantity,
              order: it.order ?? ii,
              notes: it.notes ?? null,
            })),
          },
        })),
      },
    },
    include: {
      meals: {
        orderBy: { order: 'asc' },
        include: {
          items: {
            orderBy: { order: 'asc' },
            include: { food: true },
          },
        },
      },
    },
  });

  return NextResponse.json(plan, { status: 201 });
}
