import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// POST /api/shop/checkout — Create Stripe Checkout Session
// Card info NEVER touches our server. Stripe handles all payment processing.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, pickupDate, pickupTime, pickupName, pickupPhone, customerEmail } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    if (!pickupDate || !pickupTime || !pickupName || !pickupPhone || !customerEmail) {
      return NextResponse.json({ error: 'Pickup details and email are required' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    // Server-side validation: fetch real products and verify prices
    // NEVER trust client-side prices
    const productIds = items.map((item: { productId: string }) => item.productId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        isActive: true,
      },
      include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } },
    });

    if (products.length !== productIds.length) {
      return NextResponse.json(
        { error: 'One or more products are no longer available' },
        { status: 400 }
      );
    }

    // Check stock availability
    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) continue;
      if (product.trackInventory && product.stock < item.quantity) {
        return NextResponse.json(
          { error: `${product.name} only has ${product.stock} in stock` },
          { status: 400 }
        );
      }
    }

    // Build line items from server-side prices (NEVER from client)
    const lineItems = items.map((item: { productId: string; quantity: number }) => {
      const product = products.find((p) => p.id === item.productId)!;
      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: product.name,
            description: product.shortDescription || undefined,
            images: product.images.length > 0 ? [product.images[0].url] : undefined,
          },
          unit_amount: product.price, // Already in cents
        },
        quantity: item.quantity,
      };
    });

    // Calculate server-side totals
    const subtotal = items.reduce((sum: number, item: { productId: string; quantity: number }) => {
      const product = products.find((p) => p.id === item.productId)!;
      return sum + product.price * item.quantity;
    }, 0);

    // Get user session if logged in (optional)
    const session = await getServerSession(authOptions);

    // Generate unique order number
    const orderNumber = `BMF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Create pending order in database BEFORE Stripe checkout
    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerEmail,
        customerName: pickupName,
        userId: session?.user?.id || null,
        status: 'PENDING',
        paymentStatus: 'UNPAID',
        fulfillmentStatus: 'UNFULFILLED',
        subtotal,
        tax: 0,
        total: subtotal,
        pickupDate: new Date(pickupDate),
        pickupTime,
        pickupName,
        pickupPhone,
        items: {
          create: items.map((item: { productId: string; quantity: number }) => {
            const product = products.find((p) => p.id === item.productId)!;
            return {
              productId: product.id,
              productName: product.name,
              price: product.price,
              quantity: item.quantity,
              total: product.price * item.quantity,
            };
          }),
        },
      },
    });

    // Create Stripe Checkout Session
    // Customer card info is handled entirely by Stripe — never touches our server
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const checkoutSession = await getStripe().checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: customerEmail,
      line_items: lineItems,
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        pickupDate,
        pickupTime,
        pickupName,
        pickupPhone,
      },
      success_url: `${baseUrl}/shop/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/shop/checkout/cancel?order_id=${order.id}`,
      expires_at: Math.floor(Date.now() / 1000) + 1800, // 30 minutes from now
    });

    // Store Stripe session ID on order for webhook verification
    await prisma.order.update({
      where: { id: order.id },
      data: { stripeSessionId: checkoutSession.id },
    });

    return NextResponse.json({
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
      orderId: order.id,
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
