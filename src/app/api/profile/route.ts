import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

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

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { message: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF' },
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

      // Create uploads directory
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'profiles');
      await mkdir(uploadsDir, { recursive: true });

      // Derive extension from the validated MIME type — never trust file.name,
      // which is user-controlled (e.g. "shell.php.jpg" would otherwise extract .jpg
      // while leaving a server-executable suffix in the stored filename).
      const mimeToExt: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'image/gif': 'gif',
      };
      const ext = mimeToExt[file.type] ?? 'jpg';
      const filename = `${session.user.id}-${Date.now()}.${ext}`;
      const filepath = path.join(uploadsDir, filename);

      // Write file
      const bytes = await file.arrayBuffer();
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