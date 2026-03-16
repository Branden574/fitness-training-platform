import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { customAlphabet } from 'nanoid';

// Create a shorter, more user-friendly code generator
const createInviteCode = customAlphabet('ABCDEFGHIJKLMNPQRSTUVWXYZ123456789', 6);

const createInvitationSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().optional(),
  phone: z.string().optional(),
  submissionId: z.string().optional(),
});

// GET - Fetch all invitations (admin only)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'TRAINER') {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const invitations = await prisma.invitation.findMany({
      include: {
        inviter: {
          select: {
            name: true,
            email: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100,
    });

    return NextResponse.json(invitations);
    
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new invitation (trainer only)
export async function POST(request: Request) {
  try {
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user || (session.user.role !== 'TRAINER' && session.user.role !== 'ADMIN')) {
      return NextResponse.json(
        { message: 'Only trainers and admins can send invitations' },
        { status: 403 }
      );
    }

    const trainerId = session.user.id;

    const body = await request.json();
    
    const validatedData = createInvitationSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    });

    if (existingUser) {
      return NextResponse.json(
        { message: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Check if there's already a pending invitation for this email
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        email: validatedData.email,
        status: 'PENDING'
      }
    });

    if (existingInvitation) {
      return NextResponse.json(
        { 
          message: 'Pending invitation already exists for this email',
          code: existingInvitation.code
        },
        { status: 200 }
      );
    }

    // Generate unique 6-character invitation code
    let invitationCode = createInviteCode();
    let codeExists = true;
    
    // Ensure code is unique
    while (codeExists) {
      const existing = await prisma.invitation.findUnique({
        where: { code: invitationCode }
      });
      if (!existing) {
        codeExists = false;
      } else {
        invitationCode = createInviteCode();
      }
    }
    
    // Set expiration to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create the invitation
    await prisma.invitation.create({
      data: {
        email: validatedData.email,
        phone: validatedData.phone || null,
        code: invitationCode,
        invitedBy: trainerId,
        expiresAt,
      }
    });

    // If this is from a contact submission, update the submission status
    if (validatedData.submissionId) {
      await prisma.contactSubmission.update({
        where: { id: validatedData.submissionId },
        data: { status: 'INVITED' }
      });
    }

    // Generate invitation URL
    let baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3001';
    
    // Validate URL to prevent build-time errors with placeholder values
    try {
      new URL(baseUrl);
    } catch {
      baseUrl = 'http://localhost:3001';
    }

    // Don't automatically send email - trainer will manually send it

    return NextResponse.json({
      message: 'Invitation created successfully',
      code: invitationCode,
      invitationUrl: `${baseUrl}/invite/${invitationCode}`,
      emailSent: false,
      emailError: null
    }, { status: 201 });
    
  } catch (error: unknown) {
    console.error('❌ Error creating invitation - full details:', error);
    const errorObj = error as Error;
    console.error('❌ Error name:', errorObj?.name);
    console.error('❌ Error message:', errorObj?.message);
    console.error('❌ Error stack:', errorObj?.stack);
    
    if (error instanceof z.ZodError) {
      console.error('❌ Zod validation error:', error.issues);
      return NextResponse.json(
        { 
          message: 'Validation error',
          errors: error.issues 
        },
        { status: 400 }
      );
    }
    
    // Check if it's a Prisma error
    if (errorObj && 'code' in errorObj) {
      console.error('❌ Prisma error code:', (errorObj as { code: string }).code);
      console.error('❌ Prisma error meta:', (errorObj as { meta?: unknown }).meta);
    }
    
    return NextResponse.json(
      {
        message: 'Internal server error',
      },
      { status: 500 }
    );
  }
}