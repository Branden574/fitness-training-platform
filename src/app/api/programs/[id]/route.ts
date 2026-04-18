import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

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
  const { id } = await params;

  const program = await prisma.program.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, name: true, email: true } },
      weeks: {
        orderBy: { weekNumber: 'asc' },
        include: {
          days: {
            orderBy: { order: 'asc' },
            include: {
              exercises: {
                orderBy: { order: 'asc' },
                include: { exercise: { select: { id: true, name: true, muscleGroups: true } } },
              },
            },
          },
        },
      },
      assignments: {
        include: { client: { select: { id: true, name: true, email: true } } },
      },
    },
  });
  if (!program) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Visibility: creator, assigned client, or admin
  const isCreator = program.createdById === session.user.id;
  const isAssignedClient = program.assignments.some((a) => a.clientId === session.user.id);
  if (session.user.role !== 'ADMIN' && !isCreator && !isAssignedClient) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(program);
}

const patchSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional().nullable(),
  goal: z.string().optional().nullable(),
  isTemplate: z.boolean().optional(),
  archived: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  if (!(await canEdit(session.user.id, session.user.role, id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: z.infer<typeof patchSchema>;
  try {
    body = patchSchema.parse(await request.json());
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: e.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const updated = await prisma.program.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.goal !== undefined ? { goal: body.goal } : {}),
      ...(body.isTemplate !== undefined ? { isTemplate: body.isTemplate } : {}),
      ...(body.archived !== undefined ? { archived: body.archived } : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  if (!(await canEdit(session.user.id, session.user.role, id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Soft-delete via archive rather than cascade to preserve assigned-client history
  await prisma.program.update({ where: { id }, data: { archived: true } });
  return NextResponse.json({ ok: true });
}
