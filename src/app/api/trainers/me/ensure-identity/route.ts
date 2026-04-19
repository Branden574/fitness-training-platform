import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ensureTrainerIdentity } from '@/lib/trainerIdentity';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'TRAINER' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const identity = await ensureTrainerIdentity(session.user.id, prisma);
    return NextResponse.json(
      {
        slug: identity.slug,
        referralCode: identity.referralCode,
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    console.error('ensureTrainerIdentity failed:', error);
    return NextResponse.json(
      { error: 'Failed to generate identity' },
      { status: 500 },
    );
  }
}
