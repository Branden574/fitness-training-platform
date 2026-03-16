import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

// Disable body parsing — Stripe needs raw body for signature verification
export const dynamic = 'force-dynamic';

// POST /api/shop/webhook — Stripe webhook handler
// Verifies webhook signature to prevent spoofing
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature — prevents tampered/spoofed events
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session);
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutExpired(session);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailed(paymentIntent);
        break;
      }

      default:
        // Acknowledge unhandled events
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    // Return 200 to prevent Stripe from retrying — log the error for investigation
    return NextResponse.json({ received: true, error: 'Processing failed' });
  }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.orderId;
  if (!orderId) {
    console.error('No orderId in checkout session metadata');
    return;
  }

  // Idempotency: check if order is already paid to prevent duplicate processing
  const existingOrder = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!existingOrder) {
    console.error(`Order ${orderId} not found`);
    return;
  }

  if (existingOrder.paymentStatus === 'PAID') {
    // Already processed — skip (handles webhook retries safely)
    return;
  }

  // Update order to paid + confirmed
  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'CONFIRMED',
      paymentStatus: 'PAID',
      stripePaymentIntentId: session.payment_intent as string,
    },
  });

  // Decrement inventory for each item
  for (const item of existingOrder.items) {
    await prisma.product.update({
      where: { id: item.productId },
      data: {
        stock: { decrement: item.quantity },
      },
    });
  }
}

async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.orderId;
  if (!orderId) return;

  // Cancel the pending order since checkout expired
  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'CANCELLED',
      paymentStatus: 'UNPAID',
      notes: 'Checkout session expired',
    },
  });
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  // Find order by payment intent ID if we have it
  const order = await prisma.order.findFirst({
    where: { stripePaymentIntentId: paymentIntent.id },
  });

  if (order) {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: 'FAILED',
        notes: `Payment failed: ${paymentIntent.last_payment_error?.message || 'Unknown error'}`,
      },
    });
  }
}
