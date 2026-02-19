import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Get current user's profile information
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user with trainer information
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        assignedTrainer: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        clientProfile: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Return user profile data
    const profileData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      trainerId: user.trainerId,
      trainer: user.assignedTrainer,
      clientProfile: user.clientProfile,
      createdAt: user.createdAt
    };

    return NextResponse.json(profileData);
    
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}