import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const item = await prisma.trainerTransformation.findUnique({
    where: { id },
    select: { trainer: { select: { userId: true } } },
  });
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (item.trainer.userId !== session.user.id && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.trainerTransformation.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
