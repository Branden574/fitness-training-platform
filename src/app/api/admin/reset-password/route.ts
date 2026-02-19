import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Generate a new password
    const newPassword = Math.random().toString(36).slice(-8) + '!'; // Random password with special char
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update the user's password and mark as requiring change
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        passwordChangeRequired: true
      }
    });

    return NextResponse.json({ 
      success: true, 
      newPassword,
      message: 'Password reset successfully. User must change password on next login.' 
    });
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}