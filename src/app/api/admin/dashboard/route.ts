import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, withDatabaseRetry, checkDatabaseConnection } from '@/lib/prisma';

export async function GET() {
  try {
    console.log('🔍 Admin Dashboard - Fetching comprehensive stats');
    
    // Check database connection first
    const isConnected = await checkDatabaseConnection();
    if (!isConnected) {
      console.error('❌ Database connection failed in admin dashboard API');
      return NextResponse.json(
        { error: 'Database connection unavailable' },
        { status: 503 }
      );
    }
    
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get comprehensive platform statistics with retry
    const [
      totalUsers,
      activeClients,
      totalAppointments,
      totalFoodEntries,
      recentUsers
    ] = await withDatabaseRetry(async () => {
      return await Promise.all([
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
    });

    console.log(`✅ Admin dashboard data fetched successfully`);
    console.log(`  - Total Users: ${totalUsers}`);
    console.log(`  - Recent Users: ${recentUsers.length}`);
    
    // Log user statuses for debugging
    recentUsers.forEach(user => {
      console.log(`  - ${user.name}: isActive=${user.isActive}, role=${user.role}`);
    });

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
        isActive: user.isActive, // Use actual database value
        lastLogin: user.lastLogin, // Use actual last login
        loginCount: user.loginCount || 0, // Use actual login count
        createdAt: user.createdAt.toISOString(),
        _count: user._count
      }))
    };

    return NextResponse.json(adminStats);
  } catch (error) {
    console.error('❌ Admin dashboard error:', error);
    
    // Check if it's a database connection error
    if (error instanceof Error && error.message.includes('database')) {
      return NextResponse.json(
        { error: 'Database connection error. Please try again.' },
        { status: 503 }
      );
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}