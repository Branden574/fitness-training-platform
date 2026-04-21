import { NextResponse, type NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { getStripe, stripeWebhookSecret } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';

// Stripe signature verification requires the raw request body, so this route
// opts out of any Next.js body parsing / caching.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function mapStripeStatus(
  s: Stripe.Subscription.Status,
): 'trialing' | 'active' | 'past_due' | 'canceled' {
  switch (s) {
    case 'trialing':
      return 'trialing';
    case 'active':
      return 'active';
    case 'past_due':
    case 'unpaid':
      return 'past_due';
    default:
      return 'canceled';
  }
}

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  if (!stripe) {
    // Env-gated: without a secret key we never process webhooks, so a stray
    // delivery during initial setup can't crash the app.
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }
  const secret = stripeWebhookSecret();
  if (!secret) {
    return NextResponse.json({ error: 'Webhook secret missing' }, { status: 503 });
  }

  const sig = request.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    console.error('Stripe webhook signature check failed', err);
    // Stripe retries on 400 — if we're getting these, the secret is wrong.
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object as Stripe.Checkout.Session;
        const userId = s.metadata?.userId;
        const tier = s.metadata?.tier;
        if (userId && s.subscription) {
          await prisma.trainer.update({
            where: { userId },
            data: {
              stripeSubscriptionId:
                typeof s.subscription === 'string'
                  ? s.subscription
                  : s.subscription.id,
              subscriptionStatus: 'active',
              // Only overwrite tier if the checkout carried one (prevents a
              // Billing Portal upgrade without metadata from nuking the tier).
              ...(tier ? { subscriptionTier: tier } : {}),
            },
          });
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        if (userId) {
          await prisma.trainer.update({
            where: { userId },
            data: {
              stripeSubscriptionId: sub.id,
              subscriptionStatus: mapStripeStatus(sub.status),
            },
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        if (userId) {
          await prisma.trainer.update({
            where: { userId },
            data: { subscriptionStatus: 'canceled' },
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        // Stripe's Invoice shape moves across API versions — subscription
        // lives on either `subscription` (older) or `subscription_details`
        // (newer, current SDK). Cast through `unknown` and pull whichever is
        // populated instead of fighting the discriminated type.
        const inv = event.data.object as unknown as {
          subscription?: string | { metadata?: Record<string, string> } | null;
          subscription_details?: { metadata?: Record<string, string> | null } | null;
        };
        let userId: string | null = null;
        if (inv.subscription_details?.metadata?.userId) {
          userId = inv.subscription_details.metadata.userId;
        } else if (inv.subscription && typeof inv.subscription !== 'string') {
          userId = inv.subscription.metadata?.userId ?? null;
        }
        if (userId) {
          await prisma.trainer.update({
            where: { userId },
            data: { subscriptionStatus: 'past_due' },
          });
        }
        break;
      }

      case 'account.updated': {
        // Stripe Connect — trainer completing onboarding or bank info changing.
        const acct = event.data.object as Stripe.Account;
        const userId = acct.metadata?.userId;
        if (userId) {
          await prisma.trainer.update({
            where: { userId },
            data: {
              connectOnboarded: !!acct.details_submitted,
              connectChargesEnabled: !!acct.charges_enabled,
              connectPayoutsEnabled: !!acct.payouts_enabled,
            },
          });
        }
        break;
      }

      default:
        // Intentionally no-op so untracked event types don't crash the
        // handler and trigger Stripe retries. Logging only.
        console.log('Stripe webhook: unhandled event', event.type);
        break;
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    // 500 → Stripe retries. For persistent handler bugs we'll see the same
    // event fire repeatedly in logs until we ship a fix.
    console.error('Stripe webhook handler error', event.type, err);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }
}
