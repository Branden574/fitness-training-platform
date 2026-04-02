import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section') || 'overview';

    if (section === 'overview') {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [
        totalLogins30d,
        successfulLogins30d,
        failedLogins24h,
        activeSessions,
        recentEvents,
        flaggedAccounts,
      ] = await Promise.all([
        prisma.loginEvent.count({
          where: { createdAt: { gte: thirtyDaysAgo } }
        }),
        prisma.loginEvent.count({
          where: { success: true, createdAt: { gte: thirtyDaysAgo } }
        }),
        prisma.loginEvent.count({
          where: { success: false, createdAt: { gte: oneDayAgo } }
        }),
        prisma.session.count({
          where: { expires: { gt: now } }
        }),
        prisma.loginEvent.findMany({
          orderBy: { createdAt: 'desc' },
          take: 50,
        }),
        // Accounts with 5+ failed attempts in 24h
        prisma.loginEvent.groupBy({
          by: ['email'],
          where: { success: false, createdAt: { gte: oneDayAgo } },
          _count: { email: true },
          having: { email: { _count: { gte: 3 } } },
        }),
      ]);

      return NextResponse.json({
        stats: {
          totalLogins30d,
          successfulLogins30d,
          failedLogins24h,
          activeSessions,
          flaggedAccountsCount: flaggedAccounts.length,
        },
        recentEvents,
        flaggedAccounts: flaggedAccounts.map(a => ({
          email: a.email,
          failedAttempts: a._count.email,
        })),
      });
    }

    if (section === 'sessions') {
      const sessions = await prisma.session.findMany({
        where: { expires: { gt: new Date() } },
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true, lastLogin: true, image: true }
          }
        },
        orderBy: { expires: 'desc' },
      });

      return NextResponse.json({ sessions });
    }

    if (section === 'login-history') {
      const limit = parseInt(searchParams.get('limit') || '100');
      const filter = searchParams.get('filter'); // 'failed', 'success', or null for all

      const where: any = {};
      if (filter === 'failed') where.success = false;
      if (filter === 'success') where.success = true;

      const events = await prisma.loginEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit, 500),
      });
      return NextResponse.json({ events });
    }

    if (section === 'api-logs') {
      const logs = await prisma.apiRequestLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      return NextResponse.json({ logs });
    }

    return NextResponse.json({ error: 'Invalid section' }, { status: 400 });
  } catch (error) {
    console.error('Security API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Force sign-out a user by deleting their sessions
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const userId = searchParams.get('userId');

    if (sessionId) {
      await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
      return NextResponse.json({ message: 'Session terminated' });
    }

    if (userId) {
      const result = await prisma.session.deleteMany({ where: { userId } });
      return NextResponse.json({ message: `${result.count} session(s) terminated` });
    }

    return NextResponse.json({ error: 'sessionId or userId required' }, { status: 400 });
  } catch (error) {
    console.error('Session termination error:', error);
    return NextResponse.json({ error: 'Failed to terminate session' }, { status: 500 });
  }
}
