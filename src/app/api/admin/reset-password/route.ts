import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { checkRateLimitAsync, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 10 password resets per 15 minutes per IP
    const ip = getClientIp(request);
    const rl = await checkRateLimitAsync(`admin-reset-pw:${ip}`, { maxRequests: 10, windowSeconds: 900 });
    if (!rl.allowed) return rateLimitResponse(rl.resetIn);

    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Generate a cryptographically secure temporary password
    const tempPassword = crypto.randomBytes(16).toString('base64url');
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

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
      tempPassword,
      message: 'Password reset successfully. Share the temporary password securely — user must change it on next login.'
    });
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
