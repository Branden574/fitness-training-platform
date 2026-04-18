import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function canEdit(sessionUserId: string, role: string, pdeId: string): Promise<boolean> {
  if (role === 'ADMIN') return true;
  if (role !== 'TRAINER') return false;
  const pde = await prisma.programDayExercise.findUnique({
    where: { id: pdeId },
    select: {
      programDay: {
        select: { programWeek: { select: { program: { select: { createdById: true } } } } },
      },
    },
  });
  return pde?.programDay.programWeek.program.createdById === sessionUserId;
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  if (!(await canEdit(session.user.id, session.user.role, id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.programDayExercise.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
