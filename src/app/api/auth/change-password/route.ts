import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { checkRateLimitAsync, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "New passwords don't match",
  path: ["confirmPassword"],
});

export async function POST(request: Request) {
  try {
    // Rate limit: 5 password change attempts per 15 minutes per IP
    const ip = getClientIp(request);
    const rl = await checkRateLimitAsync(`change-pw:${ip}`, { maxRequests: 5, windowSeconds: 900 });
    if (!rl.allowed) return rateLimitResponse(rl.resetIn);

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = changePasswordSchema.parse(body);

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true, passwordChangeRequired: true }
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(validatedData.currentPassword, user.password);
    
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { message: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(validatedData.newPassword, 12);

    // Update password and clear the password change requirement
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        password: hashedNewPassword,
        passwordChangeRequired: false
      }
    });

    return NextResponse.json(
      { message: 'Password updated successfully' },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Change password error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          message: 'Validation error',
          errors: error.issues 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}