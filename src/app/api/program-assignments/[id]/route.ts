import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { dispatchNotification } from '@/lib/notifications/dispatch';

// DELETE /api/program-assignments/[id] — cancel a single client's
// assignment without touching the program template itself. Use this when
// the trainer wants to unassign one client but keep the program around
// for others. Separate from DELETE /api/programs/[id] which nukes every
// active assignment at once.
//
// Auth: the program's creator, the client's assigned trainer, or any
// admin. Cancellation is soft (status=CANCELLED) so we keep the audit
// trail of what was assigned when.

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'TRAINER' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;

  const assignment = await prisma.programAssignment.findUnique({
    where: { id },
    select: {
      id: true,
      clientId: true,
      status: true,
      program: { select: { name: true, createdById: true } },
      client: { select: { trainerId: true } },
    },
  });
  if (!assignment) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
  }

  if (
    session.user.role === 'TRAINER' &&
    assignment.program.createdById !== session.user.id &&
    assignment.client.trainerId !== session.user.id
  ) {
    return NextResponse.json({ error: 'Not your client' }, { status: 403 });
  }

  if (assignment.status === 'CANCELLED' || assignment.status === 'COMPLETED') {
    // Idempotent — already ended, just succeed.
    return NextResponse.json({ ok: true, alreadyEnded: true });
  }

  await prisma.programAssignment.update({
    where: { id },
    data: { status: 'CANCELLED' },
  });

  void dispatchNotification({
    userId: assignment.clientId,
    type: 'GENERAL',
    title: 'Program ended',
    body: `Your coach ended "${assignment.program.name}". Check in with them about what's next.`,
    actionUrl: '/client/program',
  });

  return NextResponse.json({ ok: true });
}
