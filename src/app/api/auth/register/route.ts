import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)'),
  invitationCode: z.string().min(1, 'Invitation code is required'),
});

export async function POST(request: Request) {
  try {
    // Rate limit: 5 registration attempts per 15 minutes per IP
    const ip = getClientIp(request);
    const rl = checkRateLimit(`register:${ip}`, { maxRequests: 5, windowSeconds: 900 });
    if (!rl.allowed) return rateLimitResponse(rl.resetIn);

    const body = await request.json();

    // Validate the request body
    const validatedData = registerSchema.parse(body);
    
    // Normalize email to lowercase for consistency
    const normalizedEmail = validatedData.email.toLowerCase().trim();

    // Lookup invitation by (code, email) together so a valid code alone isn't
    // sufficient — an attacker must guess both. Single generic failure message
    // prevents enumerating which half was wrong.
    const invitation = await prisma.invitation.findFirst({
      where: {
        code: validatedData.invitationCode,
        email: normalizedEmail,
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { message: 'Invalid invitation code or email' },
        { status: 400 }
      );
    }

    if (invitation.status !== 'PENDING') {
      return NextResponse.json(
        { message: 'Invitation has already been used or expired' },
        { status: 400 }
      );
    }

    if (new Date() > invitation.expiresAt) {
      return NextResponse.json(
        { message: 'Invitation has expired' },
        { status: 400 }
      );
    }
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingUser) {
      return NextResponse.json(
        { message: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);

    // Create the user and link to trainer
    const user = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: normalizedEmail,
        password: hashedPassword,
        role: 'CLIENT',
        trainerId: invitation.invitedBy, // Link client to the trainer who invited them
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        trainerId: true,
        createdAt: true,
      }
    });

    // Mark invitation as accepted
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
      }
    });

    // Update contact submission status to COMPLETED
    await prisma.contactSubmission.updateMany({
      where: { 
        email: normalizedEmail,
        status: 'INVITED'
      },
      data: {
        status: 'COMPLETED'
      }
    });

    return NextResponse.json(
      { 
        message: 'User created successfully',
        user
      },
      { status: 201 }
    );
    
  } catch (error) {
    console.error('Registration error:', error);
    
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