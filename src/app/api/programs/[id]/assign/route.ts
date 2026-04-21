import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendProgramAssignedEmail } from '@/lib/email';
import { z } from 'zod';

const assignSchema = z.object({
  clientId: z.string().min(1),
  startDate: z.string().min(1),
  notes: z.string().optional().nullable(),
});

// Given a program's start date (the date the assignment begins) + a template's
// week range (1-indexed, inclusive), produce concrete start/end dates. If
// endWeek is null, the plan runs to the end of the program (durationWks).
function rangeToDates(
  programStart: Date,
  startWeek: number,
  endWeek: number | null,
  durationWks: number,
): { start: Date; end: Date } {
  const MS_PER_DAY = 86_400_000;
  const effectiveEnd = endWeek ?? durationWks;
  const start = new Date(programStart.getTime() + (startWeek - 1) * 7 * MS_PER_DAY);
  // endWeek is inclusive — the plan covers through the last day of that week,
  // so we add (endWeek * 7 - 1) days from the program's start.
  const end = new Date(programStart.getTime() + (effectiveEnd * 7 - 1) * MS_PER_DAY);
  return { start, end };
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'TRAINER' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id: programId } = await params;

  let body: z.infer<typeof assignSchema>;
  try {
    body = assignSchema.parse(await request.json());
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: e.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  // Must own this program (trainer) unless admin. Pull durationWks + meal-plan
  // templates here so we can clone them into the client's MealPlan rows below.
  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: {
      id: true,
      name: true,
      durationWks: true,
      createdById: true,
      mealPlans: {
        orderBy: [{ order: 'asc' }, { startWeek: 'asc' }],
        select: {
          id: true,
          name: true,
          description: true,
          startWeek: true,
          endWeek: true,
          dailyCalorieTarget: true,
          dailyProteinTarget: true,
          dailyCarbTarget: true,
          dailyFatTarget: true,
        },
      },
    },
  });
  if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 });
  if (session.user.role !== 'ADMIN' && program.createdById !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Client must be trainer's or admin scope
  if (session.user.role === 'TRAINER') {
    const client = await prisma.user.findFirst({
      where: { id: body.clientId, trainerId: session.user.id, role: 'CLIENT' },
      select: { id: true },
    });
    if (!client) return NextResponse.json({ error: 'Client not found or not yours' }, { status: 404 });
  }

  const startDate = new Date(body.startDate);
  if (Number.isNaN(startDate.getTime())) {
    return NextResponse.json({ error: 'Invalid startDate' }, { status: 400 });
  }

  // Assignment + meal plan clones go into a single transaction so a mid-way
  // failure doesn't leave the client with half a program attached.
  const result = await prisma.$transaction(async (tx) => {
    await tx.programAssignment.updateMany({
      where: { programId, clientId: body.clientId, status: 'ACTIVE' },
      data: { status: 'CANCELLED' },
    });

    const assignment = await tx.programAssignment.create({
      data: {
        programId,
        clientId: body.clientId,
        assignedById: session.user.id,
        startDate,
        currentWeek: 1,
        status: 'ACTIVE',
        notes: body.notes ?? null,
      },
    });

    const clonedPlans: Array<{ id: string }> = [];
    for (const tpl of program.mealPlans) {
      const { start, end } = rangeToDates(
        startDate,
        tpl.startWeek,
        tpl.endWeek,
        program.durationWks,
      );
      const cloned = await tx.mealPlan.create({
        data: {
          userId: body.clientId,
          trainerId: session.user.id,
          name: tpl.name,
          description: tpl.description,
          startDate: start,
          endDate: end,
          dailyCalorieTarget: tpl.dailyCalorieTarget,
          dailyProteinTarget: tpl.dailyProteinTarget,
          dailyCarbTarget: tpl.dailyCarbTarget,
          dailyFatTarget: tpl.dailyFatTarget,
          sourceTemplateId: tpl.id,
        },
        select: { id: true },
      });
      clonedPlans.push(cloned);
    }

    return { assignment, clonedPlanCount: clonedPlans.length };
  });

  // Side-effects (notifications, email, inbox message) are fail-open: if any
  // of them throws we still return 201. Running them in parallel via
  // allSettled so a single failure (e.g. Resend rate limit, Notification DB
  // hiccup) doesn't drag down the others.
  const [clientUser, trainerUser] = await Promise.all([
    prisma.user.findUnique({
      where: { id: body.clientId },
      select: { id: true, email: true, name: true },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true },
    }),
  ]);

  if (clientUser) {
    const trainerName = trainerUser?.name ?? 'Your coach';
    const programDisplay = program.name;
    const startLabel = startDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    const mealPlanSummary =
      program.mealPlans.length > 0
        ? ` Includes ${program.mealPlans.length} meal plan${program.mealPlans.length === 1 ? '' : 's'}.`
        : '';

    await Promise.allSettled([
      prisma.notification.create({
        data: {
          userId: body.clientId,
          type: 'PROGRAM_ASSIGNED',
          title: 'New program assigned',
          message: `${trainerName} assigned you "${programDisplay}". Starts ${startLabel}.${mealPlanSummary}`,
          actionUrl: '/client',
        },
      }),
      sendProgramAssignedEmail({
        toEmail: clientUser.email,
        toName: clientUser.name ?? null,
        trainerName,
        programName: programDisplay,
        durationWks: program.durationWks,
        startDate,
        mealPlans: program.mealPlans.map((mp) => ({
          name: mp.name,
          startWeek: mp.startWeek,
          endWeek: mp.endWeek,
          dailyCalorieTarget: mp.dailyCalorieTarget,
          dailyProteinTarget: mp.dailyProteinTarget,
          dailyCarbTarget: mp.dailyCarbTarget,
          dailyFatTarget: mp.dailyFatTarget,
        })),
      }),
      prisma.message.create({
        data: {
          senderId: session.user.id,
          receiverId: body.clientId,
          type: 'TEXT',
          content: `Assigned you a new program — ${programDisplay} (${program.durationWks} wk). Starts ${startLabel}.${mealPlanSummary} Open the app when you're ready.`,
        },
      }),
    ]).then((settled) => {
      settled.forEach((r, i) => {
        if (r.status === 'rejected') {
          const label = ['notification', 'email', 'inbox_message'][i];
          console.warn(`[program-assigned:${label}] fan-out failed:`, r.reason);
        }
      });
    });
  }

  return NextResponse.json(
    { ...result.assignment, clonedMealPlans: result.clonedPlanCount },
    { status: 201 },
  );
}
