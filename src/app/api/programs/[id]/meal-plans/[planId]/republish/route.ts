import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { dispatchNotification } from '@/lib/notifications/dispatch';

// Republishes a ProgramMealPlan template to every client whose ACTIVE
// ProgramAssignment for this program has a cloned copy (matched via
// MealPlan.sourceTemplateId). Overwrites the client's cloned plan with the
// template's current name, description, macro targets, and recomputed
// start/end dates derived from their assignment startDate + the template's
// week range. Clients whose assignment is not ACTIVE are skipped — no point
// mutating plans for someone who's been re-assigned or cancelled. Clients
// who lost their sourceTemplateId (e.g. ad-hoc edit flow we haven't built
// yet, or a pre-Slice 4 clone) are also skipped.

async function canEdit(sessionUserId: string, role: string, programId: string): Promise<boolean> {
  if (role === 'ADMIN') return true;
  if (role !== 'TRAINER') return false;
  const p = await prisma.program.findUnique({
    where: { id: programId },
    select: { createdById: true },
  });
  return p?.createdById === sessionUserId;
}

function rangeToDates(
  programStart: Date,
  startWeek: number,
  endWeek: number | null,
  durationWks: number,
): { start: Date; end: Date } {
  const MS_PER_DAY = 86_400_000;
  const effectiveEnd = endWeek ?? durationWks;
  const start = new Date(programStart.getTime() + (startWeek - 1) * 7 * MS_PER_DAY);
  const end = new Date(programStart.getTime() + (effectiveEnd * 7 - 1) * MS_PER_DAY);
  return { start, end };
}

export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string; planId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: programId, planId } = await params;
  if (!(await canEdit(session.user.id, session.user.role, programId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [program, template] = await Promise.all([
    prisma.program.findUnique({
      where: { id: programId },
      select: { id: true, durationWks: true },
    }),
    prisma.programMealPlan.findFirst({
      where: { id: planId, programId },
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
    }),
  ]);

  if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 });
  if (!template) return NextResponse.json({ error: 'Meal plan not found' }, { status: 404 });

  // Find every active assignment for this program + its client's cloned copy
  // (if any). One query fans out so the update loop stays O(clients).
  const activeAssignments = await prisma.programAssignment.findMany({
    where: { programId, status: 'ACTIVE' },
    select: { clientId: true, startDate: true },
  });

  let updated = 0;
  const updatedClientIds: string[] = [];

  await prisma.$transaction(async (tx) => {
    for (const a of activeAssignments) {
      const clone = await tx.mealPlan.findFirst({
        where: {
          userId: a.clientId,
          sourceTemplateId: template.id,
        },
        select: { id: true },
      });
      if (!clone) continue;

      const { start, end } = rangeToDates(
        a.startDate,
        template.startWeek,
        template.endWeek,
        program.durationWks,
      );
      await tx.mealPlan.update({
        where: { id: clone.id },
        data: {
          name: template.name,
          description: template.description,
          startDate: start,
          endDate: end,
          dailyCalorieTarget: template.dailyCalorieTarget,
          dailyProteinTarget: template.dailyProteinTarget,
          dailyCarbTarget: template.dailyCarbTarget,
          dailyFatTarget: template.dailyFatTarget,
        },
      });
      updated++;
      updatedClientIds.push(a.clientId);
    }
  });

  // Notify each synced client so they know their plan changed. dispatch is
  // already fail-open internally; wrapping in allSettled keeps the fan-out
  // parallel across clients.
  if (updatedClientIds.length > 0) {
    await Promise.allSettled(
      updatedClientIds.map((clientId) =>
        dispatchNotification({
          userId: clientId,
          type: 'MEAL_PLAN_ASSIGNED',
          title: 'Your meal plan was updated',
          body: `Your coach updated "${template.name}" — targets and dates are refreshed.`,
          actionUrl: '/client',
          metadata: { templateId: template.id },
        }),
      ),
    );
  }

  return NextResponse.json({ updated, eligible: activeAssignments.length });
}
