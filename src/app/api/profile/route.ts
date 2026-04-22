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

// Update user profile. Photo upload used to live here writing to local
// disk (`public/uploads/profiles/...`) — that path was wiped on every
// Railway redeploy and has been retired in favor of the R2-backed
// `/api/profile/photo` endpoint. This route now only handles JSON profile
// field updates (currently just `name`).
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const contentType = request.headers.get('content-type') || '';

    // Reject multipart uploads here — they used to be accepted and written
    // to ephemeral Railway disk. Route the caller to the new endpoint.
    if (contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        {
          message:
            'Photo uploads have moved. POST the file to /api/profile/photo instead.',
        },
        { status: 410 },
      );
    }

    const body = await request.json();
    const { name } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { message: 'No fields to update' },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
    });

    return NextResponse.json({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      image: updatedUser.image,
    });

  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
