import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, withDatabaseRetry, checkDatabaseConnection } from '@/lib/prisma';

export async function GET() {
  try {
    const isConnected = await checkDatabaseConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Database connection unavailable' },
        { status: 503 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [
      totalUsers,
      activeClients,
      totalTrainers,
      totalAppointments,
      totalFoodEntries,
      totalWorkoutSessions,
      totalProgressEntries,
      totalMessages,
      totalContactSubmissions,
      newContactSubmissions,
      pendingInvitations,
      recentUsers,
    ] = await withDatabaseRetry(async () => {
      return await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: 'CLIENT', isActive: true } }),
        prisma.user.count({ where: { role: 'TRAINER' } }),
        prisma.appointment.count(),
        prisma.foodEntry.count(),
        prisma.workoutSession.count(),
        prisma.progressEntry.count(),
        prisma.message.count(),
        prisma.contactSubmission.count(),
        prisma.contactSubmission.count({ where: { status: 'NEW' } }),
        prisma.invitation.count({ where: { status: 'PENDING' } }),
        prisma.user.findMany({
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            _count: {
              select: {
                foodEntries: true,
                clientAppointments: true,
                progressEntries: true,
                workoutSessions: true,
              }
            }
          }
        }),
      ]);
    });

    return NextResponse.json({
      totalUsers,
      activeClients,
      totalTrainers,
      totalAppointments,
      totalFoodEntries,
      totalWorkoutSessions,
      totalProgressEntries,
      totalMessages,
      totalContactSubmissions,
      newContactSubmissions,
      pendingInvitations,
      recentActivity: recentUsers.map(user => ({
        id: user.id,
        name: user.name || 'No name',
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        loginCount: user.loginCount || 0,
        createdAt: user.createdAt.toISOString(),
        _count: user._count,
      })),
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    if (error instanceof Error && error.message.includes('database')) {
      return NextResponse.json(
        { error: 'Database connection error. Please try again.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
