import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hardDeleteClient } from '@/lib/clientArchival';

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await context.params;

  const target = await prisma.user.findFirst({
    where:
      session.user.role === 'ADMIN'
        ? { id, role: 'CLIENT' }
        : { id, role: 'CLIENT', trainerId: session.user.id },
    select: { id: true, archivedAt: true },
  });
  if (!target) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }
  if (!target.archivedAt) {
    return NextResponse.json(
      { error: 'Client must be archived first' },
      { status: 409 },
    );
  }

  await hardDeleteClient(id);
  return NextResponse.json({ ok: true, deleted: id });
}
