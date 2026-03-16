import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// POST /api/clients/reset-password - Reset client password (trainer only)
export async function POST(request: NextRequest) {
  try {

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const trainer = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { trainer: true }
    });

    if (!trainer || trainer.role !== 'TRAINER') {
      return NextResponse.json({ error: 'Only trainers can reset client passwords' }, { status: 403 });
    }

    const body = await request.json();
    const { clientId } = body;

    if (!clientId) {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 });
    }

    // Verify the client exists and is assigned to this trainer
    const client = await prisma.user.findUnique({
      where: { id: clientId }
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    if (client.role !== 'CLIENT') {
      return NextResponse.json({ error: 'User is not a client' }, { status: 400 });
    }

    // Check if client is assigned to this trainer
    if (client.trainerId !== trainer.id) {
      return NextResponse.json({ error: 'Client is not assigned to you' }, { status: 403 });
    }

    // Generate a cryptographically secure temporary password
    const tempPassword = crypto.randomBytes(16).toString('base64url');

    // Hash the new password
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    // Update client password and set passwordChangeRequired to true
    await prisma.user.update({
      where: { id: clientId },
      data: {
        password: hashedPassword,
        passwordChangeRequired: true,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Password has been reset. Share the temporary password securely with the client — they will be required to change it on next login.',
      tempPassword
    });

  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
