import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deleteImage, keyFromPublicUrl } from '@/lib/storage';

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
    select: {
      beforePhotoUrl: true,
      afterPhotoUrl: true,
      trainer: { select: { userId: true } },
    },
  });
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (item.trainer.userId !== session.user.id && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.trainerTransformation.delete({ where: { id } });

  // Fire-and-forget R2 cleanup so deleted transformation pairs don't
  // linger on the CDN. Failures never block the response — DB row is
  // already gone, orphans are cheap.
  for (const url of [item.beforePhotoUrl, item.afterPhotoUrl]) {
    const key = keyFromPublicUrl(url);
    if (key) deleteImage(key).catch(() => {});
  }

  return new NextResponse(null, { status: 204 });
}
