import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getStripe, stripeEnabled } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'TRAINER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!stripeEnabled()) {
    return NextResponse.json(
      { error: 'Billing not configured' },
      { status: 503 },
    );
  }

  const trainer = await prisma.trainer.findUnique({
    where: { userId: session.user.id },
    select: { stripeCustomerId: true },
  });
  if (!trainer?.stripeCustomerId) {
    return NextResponse.json(
      { error: 'No active billing account. Upgrade from the billing page first.' },
      { status: 400 },
    );
  }

  const stripe = getStripe()!;
  const origin =
    request.headers.get('origin') ??
    process.env.NEXTAUTH_URL ??
    'http://localhost:3000';

  const portal = await stripe.billingPortal.sessions.create({
    customer: trainer.stripeCustomerId,
    return_url: `${origin}/trainer/settings/billing`,
  });

  return NextResponse.json({ url: portal.url });
}
