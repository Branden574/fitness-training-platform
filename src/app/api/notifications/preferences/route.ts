import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// GET/PUT /api/notifications/preferences — per-user toggles + quiet hours.
// GET lazy-creates defaults (mirrors dispatch.ts's loadOrCreatePreferences so
// the settings page never has to handle a null row) so the UI can fetch and
// render immediately for any authenticated user.

const putSchema = z.object({
  inAppEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  workoutAssigned: z.boolean().optional(),
  workoutUpdated: z.boolean().optional(),
  prLogged: z.boolean().optional(),
  messageReceived: z.boolean().optional(),
  programCompleted: z.boolean().optional(),
  trainerFeedback: z.boolean().optional(),
  quietHoursStart: z.number().int().min(0).max(23).nullable().optional(),
  quietHoursEnd: z.number().int().min(0).max(23).nullable().optional(),
});

const SELECT = {
  inAppEnabled: true,
  pushEnabled: true,
  workoutAssigned: true,
  workoutUpdated: true,
  prLogged: true,
  messageReceived: true,
  programCompleted: true,
  trainerFeedback: true,
  quietHoursStart: true,
  quietHoursEnd: true,
  updatedAt: true,
} as const;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const prefs = await prisma.notificationPreference.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id },
    update: {},
    select: SELECT,
  });
  return NextResponse.json(prefs);
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof putSchema>;
  try {
    body = putSchema.parse(await request.json());
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: e.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  // Reject a quiet-hours pair where only one side is set; both must be present
  // together or both null. Same hour for start + end means "off" in dispatch.ts.
  const hasStart = body.quietHoursStart !== undefined;
  const hasEnd = body.quietHoursEnd !== undefined;
  if (hasStart !== hasEnd) {
    return NextResponse.json(
      { error: 'Quiet hours must be set as a pair — both start and end together.' },
      { status: 400 },
    );
  }

  const prefs = await prisma.notificationPreference.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      ...body,
    },
    update: body,
    select: SELECT,
  });

  return NextResponse.json(prefs);
}
