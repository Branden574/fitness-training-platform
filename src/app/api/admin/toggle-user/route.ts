import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, withDatabaseRetry, checkDatabaseConnection } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Toggle User - Processing user status change');
    
    // Check database connection first
    const isConnected = await checkDatabaseConnection();
    if (!isConnected) {
      console.error('❌ Database connection failed in toggle-user API');
      return NextResponse.json(
        { error: 'Database connection unavailable' },
        { status: 503 }
      );
    }
    
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, isActive } = await request.json();

    if (!userId || typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'User ID and isActive status are required' }, { status: 400 });
    }

    console.log(`🎯 Updating user ${userId} to isActive: ${isActive}`);

    // Update the user's active status with retry
    const updatedUser = await withDatabaseRetry(async () => {
      return await prisma.user.update({
        where: { id: userId },
        data: {
          isActive: isActive
        },
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true
        }
      });
    });

    console.log(`✅ User ${updatedUser.name} (${updatedUser.email}) status changed to: ${updatedUser.isActive ? 'Active' : 'Inactive'}`);
    console.log(`Admin ${session.user.id} ${isActive ? 'activated' : 'deactivated'} user ${userId}`);

    return NextResponse.json({ 
      success: true, 
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user: updatedUser
    });
  } catch (error) {
    console.error('❌ Toggle user error:', error);
    
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