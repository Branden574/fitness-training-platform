import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Public: fetch order by Stripe session ID (for checkout success page)
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      const order = await prisma.order.findFirst({
        where: { stripeSessionId: sessionId },
        include: { items: true },
      });
      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
      // Return limited data for public access
      return NextResponse.json({
        orderNumber: order.orderNumber,
        customerEmail: order.customerEmail,
        pickupDate: order.pickupDate,
        pickupTime: order.pickupTime,
        pickupName: order.pickupName,
        total: order.total,
        items: order.items.map((item) => ({
          productName: item.productName,
          quantity: item.quantity,
          price: item.price,
        })),
      });
    }

    // Admin: fetch all orders
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (
      session.user.role !== 'ADMIN' &&
      session.user.role !== 'TRAINER'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
