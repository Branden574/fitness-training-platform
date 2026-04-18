import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

async function canEditDay(sessionUserId: string, role: string, dayId: string): Promise<boolean> {
  if (role === 'ADMIN') return true;
  if (role !== 'TRAINER') return false;
  const day = await prisma.programDay.findUnique({
    where: { id: dayId },
    select: { programWeek: { select: { program: { select: { createdById: true } } } } },
  });
  return day?.programWeek.program.createdById === sessionUserId;
}

const patchSchema = z.object({
  sessionType: z.string().optional(),
  notes: z.string().optional().nullable(),
});

const addExerciseSchema = z.object({
  exerciseId: z.string().min(1),
  sets: z.number().int().min(1),
  repsScheme: z.string().min(1),
  targetWeight: z.string().optional().nullable(),
  restSeconds: z.number().int().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// PATCH: update day metadata
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  if (!(await canEditDay(session.user.id, session.user.role, id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: z.infer<typeof patchSchema>;
  try {
    body = patchSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const updated = await prisma.programDay.update({
    where: { id },
    data: {
      ...(body.sessionType !== undefined ? { sessionType: body.sessionType } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
    },
  });
  return NextResponse.json(updated);
}

// POST: add an exercise to this day
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  if (!(await canEditDay(session.user.id, session.user.role, id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: z.infer<typeof addExerciseSchema>;
  try {
    body = addExerciseSchema.parse(await request.json());
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: e.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const maxOrder = await prisma.programDayExercise.aggregate({
    where: { programDayId: id },
    _max: { order: true },
  });

  const created = await prisma.programDayExercise.create({
    data: {
      programDayId: id,
      exerciseId: body.exerciseId,
      order: (maxOrder._max.order ?? -1) + 1,
      sets: body.sets,
      repsScheme: body.repsScheme,
      targetWeight: body.targetWeight ?? null,
      restSeconds: body.restSeconds ?? null,
      notes: body.notes ?? null,
    },
    include: { exercise: { select: { id: true, name: true } } },
  });

  return NextResponse.json(created, { status: 201 });
}
