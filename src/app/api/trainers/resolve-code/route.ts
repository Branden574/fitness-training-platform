import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

const schema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{6}$/, 'Code must be 6 alphanumeric characters'),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`trainer-resolve-code:${ip}`, {
    maxRequests: 30,
    windowSeconds: 60,
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
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const code = parsed.data.code.toUpperCase();
  // findFirst (not findUnique) because trainerReferralCode isn't @unique in the
  // schema yet — deferred until a partial unique index can be applied. Deterministic
  // ordering is important: if a TOCTOU race ever allowed a duplicate, we want
  // the same trainer served every time rather than an arbitrary winner.
  const trainer = await prisma.user.findFirst({
    where: { trainerReferralCode: code },
    orderBy: { createdAt: 'asc' },
    select: {
      role: true,
      trainerSlug: true,
      trainerIsPublic: true,
    },
  });

  if (
    !trainer ||
    trainer.role !== 'TRAINER' ||
    !trainer.trainerIsPublic ||
    !trainer.trainerSlug
  ) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ slug: trainer.trainerSlug });
}
