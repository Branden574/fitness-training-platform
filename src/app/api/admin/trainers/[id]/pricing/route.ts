import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ensureTrainerRow } from '@/lib/trainerRow';

const schema = z.object({
  tier: z.enum(['FREE', 'STARTER', 'PRO', 'CUSTOM']).nullable().optional(),
  monthlyPrice: z.number().min(0).max(10000).nullable().optional(),
  subscriptionStatus: z
    .enum(['free', 'trialing', 'active', 'past_due', 'canceled'])
    .nullable()
    .optional(),
});

export async function PATCH(
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
    select: { id: true, email: true, role: true },
  });
  if (!target) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (target.role !== 'TRAINER') {
    return NextResponse.json(
      { error: 'Target is not a trainer' },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid fields' }, { status: 400 });
  }

  // Ensure the Trainer row exists before we PATCH it. Brent's row was seeded
  // manually but self-signed-up trainers have theirs created during register;
  // this is a belt-and-suspenders guard so admin price edits never fail with
  // "record to update not found" on a legacy User that pre-dates Trainer row
  // auto-creation.
  await ensureTrainerRow(userId, prisma);

  const data: Record<string, unknown> = {};
  if (parsed.data.tier !== undefined) data.subscriptionTier = parsed.data.tier;
  if (parsed.data.monthlyPrice !== undefined)
    data.monthlyPrice = parsed.data.monthlyPrice;
  if (parsed.data.subscriptionStatus !== undefined)
    data.subscriptionStatus = parsed.data.subscriptionStatus;

  // FREE tier always implies status=free unless admin explicitly overrode.
  // Prevents the "tier=FREE but status=active" state that would otherwise
  // let a past_due FREE account still bill through Stripe.
  if (
    parsed.data.tier === 'FREE' &&
    parsed.data.subscriptionStatus === undefined
  ) {
    data.subscriptionStatus = 'free';
  }

  const updated = await prisma.trainer.update({
    where: { userId },
    data,
    select: {
      subscriptionTier: true,
      monthlyPrice: true,
      subscriptionStatus: true,
    },
  });

  await prisma.adminLog.create({
    data: {
      adminEmail: session.user.email ?? '',
      action: 'TRAINER_PRICING_UPDATE',
      targetUserId: userId,
      targetEmail: target.email,
      details: {
        subscriptionTier: updated.subscriptionTier,
        monthlyPrice: updated.monthlyPrice,
        subscriptionStatus: updated.subscriptionStatus,
      },
    },
  });

  return NextResponse.json(updated, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
