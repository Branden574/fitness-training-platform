import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

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

// PATCH replaces the entire meal tree when `meals` is present. Partial edits
// to individual meals/items aren't worth the schema overhead at this slice —
// the builder UI holds the whole plan in state anyway and sends it back.
// Top-level metadata (name, targets, week range) can be patched without
// sending meals[] by omitting that field.
const patchSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  description: z.string().optional().nullable(),
  startWeek: z.number().int().positive().optional(),
  endWeek: z.number().int().positive().nullable().optional(),
  dailyCalorieTarget: z.number().int().positive().optional(),
  dailyProteinTarget: z.number().nonnegative().optional(),
  dailyCarbTarget: z.number().nonnegative().optional(),
  dailyFatTarget: z.number().nonnegative().optional(),
  order: z.number().int().nonnegative().optional(),
  meals: z.array(mealSchema).optional(),
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

async function loadPlan(programId: string, planId: string) {
  return prisma.programMealPlan.findFirst({
    where: { id: planId, programId },
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
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string; planId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: programId, planId } = await params;
  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: { createdById: true, assignments: { select: { clientId: true } } },
  });
  if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 });

  const isCreator = program.createdById === session.user.id;
  const isAssignedClient = program.assignments.some((a) => a.clientId === session.user.id);
  if (session.user.role !== 'ADMIN' && !isCreator && !isAssignedClient) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const plan = await loadPlan(programId, planId);
  if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(plan);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; planId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: programId, planId } = await params;
  if (!(await canEdit(session.user.id, session.user.role, programId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const existing = await prisma.programMealPlan.findFirst({
    where: { id: planId, programId },
    select: { id: true, startWeek: true, endWeek: true },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let body: z.infer<typeof patchSchema>;
  try {
    body = patchSchema.parse(await request.json());
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: e.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  // Resolve effective week range after patch to validate.
  const nextStart = body.startWeek ?? existing.startWeek;
  const nextEnd =
    body.endWeek === undefined ? existing.endWeek : body.endWeek;
  if (nextEnd != null && nextEnd < nextStart) {
    return NextResponse.json(
      { error: 'endWeek must be >= startWeek' },
      { status: 400 },
    );
  }

  // Replace meals tree atomically so a partial failure doesn't leave a plan
  // with half old / half new meals. Metadata changes ride along in the same tx.
  const updated = await prisma.$transaction(async (tx) => {
    await tx.programMealPlan.update({
      where: { id: planId },
      data: {
        name: body.name,
        description: body.description,
        startWeek: body.startWeek,
        endWeek: body.endWeek,
        dailyCalorieTarget: body.dailyCalorieTarget,
        dailyProteinTarget: body.dailyProteinTarget,
        dailyCarbTarget: body.dailyCarbTarget,
        dailyFatTarget: body.dailyFatTarget,
        order: body.order,
      },
    });

    if (body.meals) {
      await tx.programMeal.deleteMany({ where: { programMealPlanId: planId } });
      for (let mi = 0; mi < body.meals.length; mi++) {
        const m = body.meals[mi];
        await tx.programMeal.create({
          data: {
            programMealPlanId: planId,
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
          },
        });
      }
    }

    return tx.programMealPlan.findUnique({
      where: { id: planId },
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
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string; planId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: programId, planId } = await params;
  if (!(await canEdit(session.user.id, session.user.role, programId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const existing = await prisma.programMealPlan.findFirst({
    where: { id: planId, programId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Cascades delete ProgramMeals + ProgramMealItems via onDelete: Cascade.
  await prisma.programMealPlan.delete({ where: { id: planId } });
  return NextResponse.json({ ok: true });
}
