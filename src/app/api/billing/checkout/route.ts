import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getStripe, stripeEnabled } from '@/lib/stripe';
import { resolveStripePriceId, type Tier } from '@/lib/subscriptionTiers';

const schema = z.object({
  tier: z.enum(['STARTER', 'PRO', 'CUSTOM']),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'TRAINER' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!stripeEnabled()) {
    return NextResponse.json(
      {
        error:
          'Billing is not yet configured. Ask admin to set STRIPE_SECRET_KEY.',
      },
      { status: 503 },
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
    return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
  }

  const priceId = resolveStripePriceId(parsed.data.tier as Tier);
  if (!priceId) {
    return NextResponse.json(
      { error: `Stripe price for ${parsed.data.tier} is not configured.` },
      { status: 503 },
    );
  }

  const stripe = getStripe()!;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      name: true,
      trainer: { select: { stripeCustomerId: true } },
    },
  });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Idempotent-ish customer creation. If a race ever creates two customers
  // for the same user, the second checkout will still work — the webhook
  // will just store whichever subscription id finished last. Not worth a
  // transaction for this low-frequency path.
  let customerId = user.trainer?.stripeCustomerId ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name ?? undefined,
      metadata: { userId: session.user.id },
    });
    customerId = customer.id;
    await prisma.trainer.update({
      where: { userId: session.user.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const origin =
    request.headers.get('origin') ??
    process.env.NEXTAUTH_URL ??
    'http://localhost:3000';

  const checkout = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/trainer/settings/billing?checkout=success`,
    cancel_url: `${origin}/trainer/settings/billing?checkout=cancel`,
    metadata: { userId: session.user.id, tier: parsed.data.tier },
    subscription_data: {
      metadata: { userId: session.user.id, tier: parsed.data.tier },
    },
    allow_promotion_codes: true,
  });

  return NextResponse.json(
    { url: checkout.url },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
