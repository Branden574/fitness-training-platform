// Trainer-scoped read of their own ContactSubmission rows. Used by the
// /trainer/applications inbox page on initial server render and on filter
// changes. Admin role gets the same data for their own trainerId only —
// /admin/contacts is the cross-trainer view.
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'TRAINER' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const submissions = await prisma.contactSubmission.findMany({
    where: { trainerId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      message: true,
      status: true,
      kind: true,
      waitlist: true,
      notifiedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ submissions });
}
