import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const assignSchema = z.object({
  clientId: z.string().min(1),
  startDate: z.string().min(1),
  notes: z.string().optional().nullable(),
});

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

  // Must own this program (trainer) unless admin
  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: { id: true, createdById: true },
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

  // Deactivate any existing ACTIVE assignment on this program for this client
  await prisma.programAssignment.updateMany({
    where: { programId, clientId: body.clientId, status: 'ACTIVE' },
    data: { status: 'CANCELLED' },
  });

  const assignment = await prisma.programAssignment.create({
    data: {
      programId,
      clientId: body.clientId,
      assignedById: session.user.id,
      startDate: new Date(body.startDate),
      currentWeek: 1,
      status: 'ACTIVE',
      notes: body.notes ?? null,
    },
  });

  return NextResponse.json(assignment, { status: 201 });
}
