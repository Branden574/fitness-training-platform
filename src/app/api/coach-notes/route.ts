import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createSchema = z.object({
  clientId: z.string().min(1),
  body: z.string().min(1).max(4000),
  context: z.enum(['GENERAL', 'TRAINING', 'NUTRITION', 'PROGRESS']).default('GENERAL'),
  contextId: z.string().optional().nullable(),
});

async function assertTrainerAccess(sessionUserId: string, clientId: string): Promise<boolean> {
  const actor = await prisma.user.findUnique({
    where: { id: sessionUserId },
    select: { role: true },
  });
  if (!actor) return false;
  if (actor.role === 'ADMIN') return true;
  if (actor.role !== 'TRAINER') return false;
  const client = await prisma.user.findFirst({
    where: { id: clientId, trainerId: sessionUserId, role: 'CLIENT' },
    select: { id: true },
  });
  return client != null;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');
  if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 });

  // Clients can only read their own notes; trainers see notes on their clients
  if (session.user.role === 'CLIENT' && session.user.id !== clientId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (session.user.role === 'TRAINER') {
    const ok = await assertTrainerAccess(session.user.id, clientId);
    if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const notes = await prisma.coachNote.findMany({
    where: { clientId },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { trainer: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json(notes);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'TRAINER' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Only trainers can create notes' }, { status: 403 });
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

  if (session.user.role === 'TRAINER') {
    const ok = await assertTrainerAccess(session.user.id, body.clientId);
    if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const note = await prisma.coachNote.create({
    data: {
      trainerId: session.user.id,
      clientId: body.clientId,
      body: body.body,
      context: body.context,
      contextId: body.contextId ?? null,
    },
    include: { trainer: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json(note, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const note = await prisma.coachNote.findUnique({ where: { id } });
  if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (session.user.role !== 'ADMIN' && note.trainerId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.coachNote.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
