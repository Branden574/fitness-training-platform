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
      { error: 'Stripe Connect not configured yet.' },
      { status: 503 },
    );
  }

  const stripe = getStripe()!;

  const trainer = await prisma.trainer.findUnique({
    where: { userId: session.user.id },
    select: { stripeConnectAccountId: true },
  });

  let accountId = trainer?.stripeConnectAccountId ?? null;
  if (!accountId) {
    // Standard Connect — trainer has full Stripe Dashboard access, we get
    // marketplace reporting + can charge application_fee_amount on payments
    // routed to them. Type 'standard' requires no special capabilities
    // request; 'express' or 'custom' would need Connect platform approval.
    const account = await stripe.accounts.create({
      type: 'standard',
      metadata: { userId: session.user.id },
    });
    accountId = account.id;
    await prisma.trainer.update({
      where: { userId: session.user.id },
      data: { stripeConnectAccountId: accountId },
    });
  }

  const origin =
    request.headers.get('origin') ??
    process.env.NEXTAUTH_URL ??
    'http://localhost:3000';

  const link = await stripe.accountLinks.create({
    account: accountId,
    // refresh_url fires if the onboarding link expires before completion;
    // return_url is where Stripe redirects after finish/cancel.
    refresh_url: `${origin}/trainer/settings/billing?connect=refresh`,
    return_url: `${origin}/trainer/settings/billing?connect=return`,
    type: 'account_onboarding',
  });

  return NextResponse.json({ url: link.url });
}
