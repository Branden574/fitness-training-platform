import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get comprehensive platform statistics
    const [
      totalUsers,
      activeClients,
      totalAppointments,
      totalFoodEntries,
      recentUsers
    ] = await Promise.all([
      // Total users count
      prisma.user.count(),
      
      // Active clients (users who are not trainers)
      prisma.user.count({
        where: {
          role: 'CLIENT'
        }
      }),
      
      // Total appointments
      prisma.appointment.count(),
      
      // Total food entries
      prisma.foodEntry.count(),
      
      // Recent users with detailed information
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          _count: {
            select: {
              foodEntries: true,
              clientAppointments: true,
              progressEntries: true
            }
          }
        }
      })
    ]);

    const adminStats = {
      totalUsers,
      activeClients,
      totalAppointments,
      totalFoodEntries,
      recentActivity: recentUsers.map(user => ({
        id: user.id,
        name: user.name || 'No name',
        email: user.email,
        role: user.role,
        isActive: true, // Default to true for now
        lastLogin: null, // Will be null for now
        loginCount: 0, // Default to 0 for now
        createdAt: user.createdAt.toISOString(),
        _count: user._count
      }))
    };

    return NextResponse.json(adminStats);
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}