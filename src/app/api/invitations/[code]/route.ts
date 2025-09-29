import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Validate invitation code
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    const invitation = await prisma.invitation.findUnique({
      where: { code },
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
        { status: 404 }
      );
    }

    // Check if invitation is still valid
    if (invitation.status !== 'PENDING') {
      return NextResponse.json(
        { message: 'Invitation has already been used or expired' },
        { status: 400 }
      );
    }

    if (new Date() > invitation.expiresAt) {
      // Mark as expired
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' }
      });

      return NextResponse.json(
        { message: 'Invitation has expired' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        invitedBy: invitation.inviter.name,
        expiresAt: invitation.expiresAt,
      }
    });
    
  } catch (error) {
    console.error('Error validating invitation:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}