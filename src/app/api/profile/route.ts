import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { sniffImage, IMAGE_EXT } from '@/lib/imageSniff';

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

// Update profile (including profile picture upload)
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

    // Handle multipart form data (file upload)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const type = formData.get('type') as string | null;

      if (!file) {
        return NextResponse.json(
          { message: 'No file provided' },
          { status: 400 }
        );
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { message: 'File too large. Maximum 5MB allowed.' },
          { status: 400 }
        );
      }

      // Sniff magic bytes — client-supplied Content-Type is untrusted.
      // Refuses SVG and anything that's not a real image. Extension is
      // derived from the sniffed kind, never from file.name/type.
      const bytes = await file.arrayBuffer();
      const kind = sniffImage(bytes);
      if (!kind) {
        return NextResponse.json(
          { message: 'File must be a real JPEG, PNG, GIF, or WebP image.' },
          { status: 400 }
        );
      }

      // Create uploads directory
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'profiles');
      await mkdir(uploadsDir, { recursive: true });

      const { ext } = IMAGE_EXT[kind];
      const filename = `${session.user.id}-${Date.now()}.${ext}`;
      const filepath = path.join(uploadsDir, filename);

      await writeFile(filepath, Buffer.from(bytes));

      // Update user image in database
      const imageUrl = `/uploads/profiles/${filename}`;
      await prisma.user.update({
        where: { id: session.user.id },
        data: { image: imageUrl },
      });

      return NextResponse.json({ image: imageUrl, message: 'Profile picture updated' });
    }

    // Handle JSON body (profile field updates)
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