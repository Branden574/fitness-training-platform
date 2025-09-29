import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const validateInvitationSchema = z.object({
  code: z.string().min(6, 'Code must be at least 6 characters'),
  email: z.string().email('Invalid email format'),
  phone: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = validateInvitationSchema.parse(body);

    // Find the invitation by code
    const invitation = await prisma.invitation.findUnique({
      where: { 
        code: validatedData.code.toUpperCase() 
      },
      include: {
        inviter: {
          select: {
            name: true,
            email: true,
          }
        }
      }
    });

    if (!invitation) {
      return NextResponse.json(
        { message: 'Invalid invitation code' },
        { status: 400 }
      );
    }

    // Check if invitation has expired
    if (new Date() > invitation.expiresAt) {
      return NextResponse.json(
        { message: 'Invitation code has expired' },
        { status: 400 }
      );
    }

    // Check if invitation is still pending
    if (invitation.status !== 'PENDING') {
      return NextResponse.json(
        { message: 'Invitation code has already been used' },
        { status: 400 }
      );
    }

    // Verify email matches
    if (invitation.email.toLowerCase() !== validatedData.email.toLowerCase()) {
      return NextResponse.json(
        { message: 'Email address does not match the invitation' },
        { status: 400 }
      );
    }

    // Verify phone if provided and invitation has phone
    if (invitation.phone && validatedData.phone) {
      // Normalize phone numbers for comparison (remove spaces, dashes, etc.)
      const normalizePhone = (phone: string) => phone.replace(/[\s\-\(\)]/g, '');
      const invitePhone = normalizePhone(invitation.phone);
      const providedPhone = normalizePhone(validatedData.phone);
      
      if (invitePhone !== providedPhone) {
        return NextResponse.json(
          { message: 'Phone number does not match the invitation' },
          { status: 400 }
        );
      }
    }

    // Check if user already exists with this email
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    });

    if (existingUser) {
      return NextResponse.json(
        { message: 'An account with this email already exists' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: 'Invitation code is valid',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        phone: invitation.phone,
        inviter: invitation.inviter,
        expiresAt: invitation.expiresAt
      }
    });
    
  } catch (error) {
    console.error('Error validating invitation:', error);
    
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