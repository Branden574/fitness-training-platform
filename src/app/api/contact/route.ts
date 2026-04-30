import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { ContactStatus } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { checkRateLimitAsync, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import {
  sendApplicationAcknowledgedEmail,
  sendApplicationReceivedEmail,
} from '@/lib/email';

// Primary public applicant schema. All NEW fields (trainerId, goal) are
// optional so existing callers sending only name/email/phone/message keep
// working. `goal` is now free-text (was enum get-stronger / lose-weight-recomp
// / other; preset buttons were replaced with a textarea so trainers see the
// applicant's intent in their own words). `goalOther` is still accepted and
// merged into `goal` for backward compatibility with cached clients.
const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(120),
  email: z.string().email('Invalid email format'),
  phone: z.string().optional(),
  message: z.string().max(500).optional(),

  // NEW — multi-trainer apply flow
  trainerId: z.string().cuid().optional(),
  goal: z.string().max(300).optional(),
  goalOther: z.string().max(300).optional(),

  // Enhanced intake (legacy — still accepted for older callers)
  age: z.string().optional(),
  fitnessLevel: z.string().optional(),
  fitnessGoals: z.string().optional(),
  currentActivity: z.string().optional(),
  injuries: z.string().optional(),
  availability: z.string().optional(),
});

function composeMessage(
  message: string | undefined,
  goal: string | undefined,
  goalOther: string | undefined,
): string {
  // Backward compat: map legacy enum values from cached form bundles into
  // readable labels; otherwise trust whatever text the applicant typed.
  let goalLabel: string | null = null;
  if (goal) {
    if (goal === 'get-stronger') goalLabel = 'Get stronger';
    else if (goal === 'lose-weight-recomp') goalLabel = 'Lose weight / recomp';
    else if (goal === 'other') goalLabel = goalOther?.trim() || 'Other';
    else goalLabel = goal.trim() || null;
  } else if (goalOther?.trim()) {
    goalLabel = goalOther.trim();
  }

  const header = goalLabel ? `[Goal: ${goalLabel}]` : null;
  const body = message?.trim() || null;

  if (header && body) return `${header}\n\n${body}`;
  if (header) return header;
  if (body) return body;
  return '(no message)';
}

export async function POST(request: Request) {
  try {
    // Rate limit: 3 contact form submissions per 15 minutes per IP
    const ip = getClientIp(request);
    const rl = await checkRateLimitAsync(`contact:${ip}`, { maxRequests: 3, windowSeconds: 900 });
    if (!rl.allowed) return rateLimitResponse(rl.resetIn);

    const body = await request.json();
    const validatedData = contactSchema.parse(body);
    const normalizedEmail = validatedData.email.toLowerCase().trim();

    // Resolve optional trainerId → validate public trainer → flag waitlist if
    // trainer has paused intake. Invalid trainerIds are silently coerced to null
    // so bad links never error the applicant. Also capture the trainer's email
    // + reply-to preferences so we can fire both notification emails after
    // the submission saves.
    let assignedTrainerId: string | null = null;
    let waitlist = false;
    let trainerForEmail: {
      email: string;
      name: string | null;
      slug: string | null;
      replyFromEmail: string | null;
      replyFromName: string | null;
    } | null = null;
    if (validatedData.trainerId) {
      const trainer = await prisma.user.findUnique({
        where: { id: validatedData.trainerId },
        select: {
          email: true,
          name: true,
          role: true,
          trainerClientStatus: true,
          trainerAcceptingClients: true, // legacy — still selected during cohabitation
          trainerSlug: true,
          trainer: {
            select: { replyFromEmail: true, replyFromName: true },
          },
        },
      });
      // No trainerIsPublic gate here. Per project memory, trainerIsPublic gates
      // directory/search surfaces only — a private trainer sharing their direct
      // apply link still owns that submission and should be notified.
      if (trainer && trainer.role === 'TRAINER') {
        assignedTrainerId = validatedData.trainerId;
        if (trainer.trainerClientStatus !== 'ACCEPTING') waitlist = true;
        trainerForEmail = {
          email: trainer.email,
          name: trainer.name,
          slug: trainer.trainerSlug,
          replyFromEmail: trainer.trainer?.replyFromEmail ?? null,
          replyFromName: trainer.trainer?.replyFromName ?? null,
        };
      }
    }

    const composedMessage = composeMessage(
      validatedData.message,
      validatedData.goal,
      validatedData.goalOther,
    );

    const contactSubmission = await prisma.contactSubmission.create({
      data: {
        name: validatedData.name,
        email: normalizedEmail,
        phone: validatedData.phone || null,
        message: composedMessage,
        age: validatedData.age || null,
        fitnessLevel: validatedData.fitnessLevel || null,
        fitnessGoals: validatedData.fitnessGoals || null,
        currentActivity: validatedData.currentActivity || null,
        injuries: validatedData.injuries || null,
        availability: validatedData.availability || null,
        status: 'NEW',
        trainerId: assignedTrainerId,
        waitlist,
      },
    });

    // Fire-and-forget notification emails. safeSend swallows errors + no-ops
    // when RESEND_API_KEY is missing, so these never fail the request.
    if (trainerForEmail) {
      const applicantName = validatedData.name.trim();
      const messageText = validatedData.message?.trim() || null;
      const goalText =
        validatedData.goal === 'get-stronger'
          ? 'Get stronger'
          : validatedData.goal === 'lose-weight-recomp'
            ? 'Lose weight / recomp'
            : validatedData.goal === 'other'
              ? validatedData.goalOther?.trim() || 'Other'
              : validatedData.goal?.trim() || validatedData.goalOther?.trim() || null;

      // 1. Trainer gets an email with applicant details. Reply-To is the
      //    applicant so hitting Reply writes back to them.
      void sendApplicationReceivedEmail({
        trainerEmail: trainerForEmail.email,
        trainerName: trainerForEmail.name,
        applicantName,
        applicantEmail: normalizedEmail,
        applicantPhone: validatedData.phone || null,
        message: messageText,
        goal: goalText,
        waitlist,
        submissionId: contactSubmission.id,
      });

      // 2. Applicant gets a confirmation. Reply-To is the trainer's
      //    preferred email (replyFromEmail) or their account email so the
      //    applicant's reply reaches the trainer directly.
      const trainerReplyEmail =
        trainerForEmail.replyFromEmail?.trim() || trainerForEmail.email;
      const trainerReplyName =
        trainerForEmail.replyFromName?.trim() || trainerForEmail.name;
      void sendApplicationAcknowledgedEmail({
        applicantEmail: normalizedEmail,
        applicantName,
        trainerName: trainerForEmail.name,
        trainerReplyEmail,
        trainerReplyName,
        waitlist,
        trainerSlug: trainerForEmail.slug,
      });
    }

    const response = NextResponse.json(
      {
        message: 'Contact form submitted successfully!',
        id: contactSubmission.id,
      },
      { status: 201 },
    );

    // /apply/success reads this short-lived httpOnly cookie to render the
    // "you applied with X" confirmation without exposing any PII in the URL.
    // Payload is treated as display-only by the success page (the page re-
    // queries the trainer by id from the DB for authoritative rendering).
    response.cookies.set(
      'mf_apply_success',
      JSON.stringify({
        trainerId: assignedTrainerId,
        email: normalizedEmail,
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60,
      },
    );

    return response;
  } catch (error) {
    console.error('Contact form error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          message: 'Validation error',
          errors: error.issues,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  try {
    // Require authentication - only trainers and admins can view submissions
    const session = await getServerSession(authOptions);
    if (!session?.user || !['TRAINER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // BOLA fix: trainers can only see submissions directed at them. Admin
    // sees everything for triage + moderation. Without this scope a trainer
    // could enumerate every applicant's PII across the whole platform.
    const scope =
      session.user.role === 'ADMIN'
        ? {}
        : { trainerId: session.user.id };
    const where = status
      ? { ...scope, status: status as ContactStatus }
      : scope;

    const submissions = await prisma.contactSubmission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json(submissions);
    
  } catch (error) {
    console.error('Get contact submissions error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    // Require authentication - only trainers and admins can update submissions
    const session = await getServerSession(authOptions);
    if (!session?.user || !['TRAINER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { message: 'Submission ID and status are required' },
        { status: 400 }
      );
    }

    // BOLA fix: verify the submission belongs to this trainer (or caller is
    // admin) before letting them mutate it. Previously any TRAINER could
    // change the status of any submission on the platform.
    const existing = await prisma.contactSubmission.findUnique({
      where: { id },
      select: { id: true, trainerId: true },
    });
    if (!existing) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }
    if (
      session.user.role !== 'ADMIN' &&
      existing.trainerId !== session.user.id
    ) {
      return NextResponse.json(
        { message: 'Not found' },
        { status: 404 }, // 404 not 403 — don't leak existence of other trainers' submissions.
      );
    }

    const updatedSubmission = await prisma.contactSubmission.update({
      where: { id },
      data: { status: status as ContactStatus }
    });

    return NextResponse.json(updatedSubmission);
    
  } catch (error) {
    console.error('Update contact submission error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}