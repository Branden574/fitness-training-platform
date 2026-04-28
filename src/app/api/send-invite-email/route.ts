import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (
      !session?.user ||
      (session.user.role !== 'TRAINER' && session.user.role !== 'ADMIN')
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clientName, inviteCode } = await request.json();

    if (!clientName || !inviteCode) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Load the invitation server-side so we can both verify ownership AND use
    // the invitation's stored email as the "to" address — never trust an
    // attacker-supplied clientEmail. Also pull the inviting trainer's display
    // name so the email reads "{trainer} invited you" and works whether the
    // sender is the trainer themselves or an admin sending on their behalf.
    const invitation = await prisma.invitation.findUnique({
      where: { code: inviteCode },
      select: {
        email: true,
        invitedBy: true,
        status: true,
        inviter: { select: { name: true } },
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invalid invitation' }, { status: 404 });
    }

    // Ownership check: trainers may only send mail for invitations they issued.
    // Admins may send any invitation.
    if (
      session.user.role === 'TRAINER' &&
      invitation.invitedBy !== session.user.id
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // HTML-escape caller-supplied displayable strings
    const escapeHtml = (str: string) =>
      str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    const safeClientName = escapeHtml(clientName);
    const safeInviteCode = escapeHtml(inviteCode);
    const safeTrainerName = escapeHtml(invitation.inviter?.name ?? 'Your coach');
    const clientEmail = invitation.email;

    // Get the base URL for the invite link
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const inviteLink = `${baseUrl}/invite/${encodeURIComponent(inviteCode)}`;

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: 'RepLab <noreply@replab.com>',
      to: clientEmail,
      subject: `🎉 ${invitation.inviter?.name ?? 'Your coach'} invited you to RepLab`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to RepLab</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #FF5722 0%, #F4511E 100%); padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold; letter-spacing: -0.02em;">
                  RepLab
                </h1>
                <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">
                  Train with the best
                </p>
              </div>

              <!-- Content -->
              <div style="background: white; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">
                  Welcome, ${safeClientName}! 👋
                </h2>

                <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                  <strong>${safeTrainerName}</strong> invited you to join them on RepLab — a coaching platform built for personalized training, nutrition planning, and progress tracking.
                </p>

                <p style="color: #4b5563; line-height: 1.6; margin: 0 0 30px 0; font-size: 16px;">
                  You'll get programming, meal plans, and direct messaging with ${safeTrainerName} all in one place.
                </p>

                <!-- CTA Button -->
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #FF5722 0%, #F4511E 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(255, 87, 34, 0.3);">
                    Create Your Account →
                  </a>
                </div>

                <!-- Invite Code -->
                <div style="background: #f9fafb; border: 2px dashed #e5e7eb; border-radius: 8px; padding: 20px; margin: 30px 0; text-align: center;">
                  <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">
                    Your Invite Code
                  </p>
                  <p style="color: #1f2937; margin: 0; font-size: 24px; font-weight: bold; font-family: 'Courier New', monospace; letter-spacing: 2px;">
                    ${safeInviteCode}
                  </p>
                </div>

                <p style="color: #6b7280; line-height: 1.6; margin: 20px 0 0 0; font-size: 14px;">
                  <strong>Can't click the button?</strong> Copy and paste this link into your browser:
                </p>
                <p style="color: #FF5722; line-height: 1.6; margin: 5px 0 0 0; font-size: 14px; word-break: break-all;">
                  ${inviteLink}
                </p>

                <!-- What's Next -->
                <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #e5e7eb;">
                  <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">
                    What happens next?
                  </h3>
                  <ol style="color: #4b5563; line-height: 1.8; margin: 0; padding-left: 20px; font-size: 15px;">
                    <li>Tap the button above to create your account</li>
                    <li>Set up your profile and fitness goals</li>
                    <li>Start receiving programming and nutrition plans from ${safeTrainerName}</li>
                    <li>Track your progress, message your coach, and hit your goals</li>
                  </ol>
                </div>
              </div>

              <!-- Footer -->
              <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 14px;">
                <p style="margin: 0 0 10px 0;">
                  Questions? Reply to this email and ${safeTrainerName} will get back to you.
                </p>
                <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                  © ${new Date().getFullYear()} RepLab. All rights reserved.
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('❌ Failed to send email:', error);
      // Return only the message string — the raw Resend error object can
      // include headers / internal SDK state that shouldn't be echoed to
      // the caller. Full object stays in server logs.
      return NextResponse.json(
        {
          error: 'Failed to send email',
          details:
            error instanceof Error
              ? error.message
              : typeof error === 'object' && error && 'message' in error
                ? String((error as { message: unknown }).message)
                : 'Unknown error',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, data },
      { status: 200 }
    );

  } catch (error) {
    console.error('❌ Error sending invite email:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
