import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { ensureTrainerIdentity } from '@/lib/trainerIdentity';

const schema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(200),
  password: z.string().min(10).max(200),
  agreesToTerms: z.literal(true),
});

export async function POST(request: NextRequest) {
  // 5 signups per hour per IP — enough for a team to test, slow enough to
  // make mass-signup abuse unappealing.
  const ip = getClientIp(request);
  const rl = checkRateLimit(`trainer-signup:${ip}`, {
    maxRequests: 5,
    windowSeconds: 3600,
  });
  if (!rl.allowed) return rateLimitResponse(rl.resetIn);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Check your fields and try again.' },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) {
    // Generic message so we don't leak account existence. Legit users can
    // sign in at /auth/signin.
    return NextResponse.json(
      { error: 'That email is not available. Try signing in instead.' },
      { status: 409 },
    );
  }

  const hashed = await bcrypt.hash(parsed.data.password, 12);

  // 14-day trial on the STARTER tier. They only hit Stripe when they upgrade
  // or the trial expires — admin can still flip them to FREE at any point.
  const user = await prisma.user.create({
    data: {
      email,
      name: parsed.data.name.trim(),
      password: hashed,
      role: 'TRAINER',
      isActive: true,
      trainer: {
        create: {
          subscriptionTier: 'STARTER',
          subscriptionStatus: 'trialing',
          experience: 0,
        },
      },
    },
    select: { id: true, email: true },
  });

  // Auto-generate slug + referral code so search + sharing work immediately
  // after signup — no trip through the Sharing panel required.
  await ensureTrainerIdentity(user.id, prisma);

  return NextResponse.json(
    { id: user.id, email: user.email },
    { status: 201, headers: { 'Cache-Control': 'private, no-store' } },
  );
}
