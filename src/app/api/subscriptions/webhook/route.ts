import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';

// Flag-gated Stripe subscription webhook handler.
// Activates only when STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET are set.
// Without those, this endpoint is a safe 503 so CI / unauthenticated probes
// don't see a 500.

export async function POST(request: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret || !whSecret) {
    return NextResponse.json(
      { error: 'Subscriptions not configured' },
      { status: 503 },
    );
  }

  const stripe = new Stripe(secret);
  const signature = request.headers.get('stripe-signature') ?? '';
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, whSecret);
  } catch (err) {
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${err instanceof Error ? err.message : 'unknown'}` },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
        const priceId = sub.items.data[0]?.price.id ?? null;

        // Find user via existing Subscription record or fall back to customer-email lookup
        const existing = await prisma.subscription.findUnique({
          where: { stripeCustomerId: customerId },
          select: { userId: true },
        });
        let userId = existing?.userId;
        if (!userId) {
          // Last resort: find user by email attached to the Stripe customer
          const customer = await stripe.customers.retrieve(customerId);
          if (!('deleted' in customer) || !customer.deleted) {
            const email = (customer as Stripe.Customer).email;
            if (email) {
              const user = await prisma.user.findUnique({
                where: { email },
                select: { id: true },
              });
              userId = user?.id;
            }
          }
        }
        if (!userId) break;

        await prisma.subscription.upsert({
          where: { userId },
          create: {
            userId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: sub.id,
            stripePriceId: priceId,
            status: sub.status,
            currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          },
          update: {
            stripeCustomerId: customerId,
            stripeSubscriptionId: sub.id,
            stripePriceId: priceId,
            status: sub.status,
            currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          },
        });
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: { status: 'canceled', cancelAtPeriodEnd: false },
        });
        break;
      }
      default:
        // Ignore other events for now
        break;
    }
  } catch (e) {
    console.error('[subscriptions webhook] handler error:', e);
    // Still 200 so Stripe doesn't retry storms; the event is lost
  }

  return NextResponse.json({ received: true });
}
