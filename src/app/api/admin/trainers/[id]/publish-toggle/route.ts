import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ensureTrainerIdentity } from '@/lib/trainerIdentity';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: userId } = await params;

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      trainerIsPublic: true,
      trainerSlug: true,
    },
  });
  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  if (target.role !== 'TRAINER' && target.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Target is not a trainer' },
      { status: 400 },
    );
  }

  // Always ensure slug + referral code exist before flipping public so the
  // search API's (trainerIsPublic + trainerSlug) filter will actually hit.
  const identity = await ensureTrainerIdentity(userId, prisma);

  const nextPublic = !target.trainerIsPublic;
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { trainerIsPublic: nextPublic },
    select: { trainerIsPublic: true, trainerSlug: true, trainerReferralCode: true },
  });

  await prisma.adminLog.create({
    data: {
      adminEmail: session.user.email ?? '',
      action: nextPublic ? 'TRAINER_PUBLISH' : 'TRAINER_UNPUBLISH',
      targetUserId: userId,
      targetEmail: target.email,
      details: { slug: identity.slug, referralCode: identity.referralCode },
    },
  });

  return NextResponse.json(
    {
      trainerIsPublic: updated.trainerIsPublic,
      trainerSlug: updated.trainerSlug,
      trainerReferralCode: updated.trainerReferralCode,
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
