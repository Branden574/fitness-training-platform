import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, isActive } = await request.json();

    if (!userId || typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'User ID and isActive status are required' }, { status: 400 });
    }

    // Update the user's active status
    await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: isActive
      }
    });

    console.log(`Admin ${session.user.id} ${isActive ? 'activated' : 'deactivated'} user ${userId}`);

    return NextResponse.json({ 
      success: true, 
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully` 
    });
  } catch (error) {
    console.error('Toggle user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}