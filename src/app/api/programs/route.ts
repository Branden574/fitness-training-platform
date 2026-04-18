import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const DAY_OF_WEEK = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;

const exerciseSchema = z.object({
  exerciseId: z.string().min(1),
  order: z.number().int().min(0),
  sets: z.number().int().min(1),
  repsScheme: z.string().min(1),
  targetWeight: z.string().optional().nullable(),
  restSeconds: z.number().int().optional().nullable(),
  tempo: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const daySchema = z.object({
  dayOfWeek: z.enum(DAY_OF_WEEK),
  sessionType: z.string().min(1),
  notes: z.string().optional().nullable(),
  order: z.number().int().min(0).default(0),
  exercises: z.array(exerciseSchema).default([]),
});

const weekSchema = z.object({
  weekNumber: z.number().int().min(1),
  name: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  days: z.array(daySchema).default([]),
});

const createSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  goal: z.string().optional().nullable(),
  durationWks: z.number().int().min(1).max(52),
  isTemplate: z.boolean().default(true),
  weeks: z.array(weekSchema).default([]),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'TRAINER' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const programs = await prisma.program.findMany({
    where: {
      archived: false,
      ...(session.user.role === 'ADMIN' ? {} : { createdById: session.user.id }),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      creator: { select: { id: true, name: true, email: true } },
      _count: { select: { weeks: true, assignments: true } },
    },
  });

  return NextResponse.json(programs);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'TRAINER' && session.user.role !== 'ADMIN') {
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

  const program = await prisma.program.create({
    data: {
      name: body.name,
      description: body.description ?? null,
      goal: body.goal ?? null,
      durationWks: body.durationWks,
      isTemplate: body.isTemplate,
      createdById: session.user.id,
      weeks: {
        create: body.weeks.map((w) => ({
          weekNumber: w.weekNumber,
          name: w.name ?? null,
          notes: w.notes ?? null,
          days: {
            create: w.days.map((d) => ({
              dayOfWeek: d.dayOfWeek,
              sessionType: d.sessionType,
              notes: d.notes ?? null,
              order: d.order,
              exercises: {
                create: d.exercises.map((e) => ({
                  exerciseId: e.exerciseId,
                  order: e.order,
                  sets: e.sets,
                  repsScheme: e.repsScheme,
                  targetWeight: e.targetWeight ?? null,
                  restSeconds: e.restSeconds ?? null,
                  tempo: e.tempo ?? null,
                  notes: e.notes ?? null,
                })),
              },
            })),
          },
        })),
      },
    },
    include: { _count: { select: { weeks: true, assignments: true } } },
  });

  return NextResponse.json(program, { status: 201 });
}
