import { NextResponse } from 'next/server';
import { prisma, withDatabaseRetry, checkDatabaseConnection } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    
    // Check database connection first
    const isConnected = await checkDatabaseConnection();
    if (!isConnected) {
      console.error('❌ Database connection failed in admin API');
      return NextResponse.json(
        { error: 'Database connection unavailable' },
        { status: 503 }
      );
    }
    
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated and is an admin
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all users with their profiles using retry logic (capped at 200)
    const users = await withDatabaseRetry(async () => {
      return await prisma.user.findMany({
        include: {
          clientProfile: true,
          trainer: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      });
    });

    // Get contact submissions with retry (capped at 200)
    const contactSubmissions = await withDatabaseRetry(async () => {
      return await prisma.contactSubmission.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
      });
    });

    // Get invitations with retry (capped at 200)
    const invitations = await withDatabaseRetry(async () => {
      return await prisma.invitation.findMany({
        include: {
          inviter: {
            select: {
              name: true,
              email: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      });
    });

    // Log user statuses for debugging
    users.forEach(user => {
    });

    return NextResponse.json({
      users: users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        loginCount: user.loginCount,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        hasProfile: !!user.clientProfile || !!user.trainer,
      })),
      contactSubmissions,
      invitations,
    });
    
  } catch (error) {
    console.error('❌ Admin data fetch error:', error);
    
    // Check if it's a database connection error
    if (error instanceof Error && error.message.includes('database')) {
      return NextResponse.json(
        { error: 'Database connection error. Please try again.' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { message: 'User ID is required' },
        { status: 400 }
      );
    }

    // Delete user and all related data (CASCADE should handle this)
    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ message: 'User deleted successfully' });
    
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { message: 'Failed to delete user' },
      { status: 500 }
    );
  }
}