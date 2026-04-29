// src/app/api/trainers/[slug]/notify-me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { checkRateLimitAsync, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  email: z.string().email().max(254),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  // Rate limit: 3 notify-me submissions per 15 minutes per IP, mirroring
  // the existing convention on /api/contact for public ContactSubmission writes.
  const ip = getClientIp(req);
  const rl = await checkRateLimitAsync(`notify-me:${ip}`, { maxRequests: 3, windowSeconds: 900 });
  if (!rl.allowed) return rateLimitResponse(rl.resetIn);

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }
  const email = parsed.data.email.trim().toLowerCase();

  const trainer = await prisma.user.findFirst({
    where: { trainerSlug: slug, role: 'TRAINER' },
    select: {
      id: true,
      trainerClientStatus: true,
    },
  });
  if (!trainer) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (trainer.trainerClientStatus !== 'NOT_ACCEPTING') {
    // The trainer is already accepting in some form; clients should use the
    // normal apply flow. Return 409 so the UI can surface a "they reopened"
    // message and reload.
    return NextResponse.json(
      { error: 'Trainer is currently accepting' },
      { status: 409 },
    );
  }

  // Idempotency: if there's already an open NOTIFY_WHEN_OPEN row for
  // this (trainer, email), return ok without creating a duplicate.
  const existing = await prisma.contactSubmission.findFirst({
    where: {
      trainerId: trainer.id,
      email,
      kind: 'NOTIFY_WHEN_OPEN',
      notifiedAt: null,
    },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ ok: true, deduped: true });
  }

  await prisma.contactSubmission.create({
    data: {
      trainerId: trainer.id,
      email,
      // ContactSubmission.name and .message are required (non-nullable) in
      // the schema; fill defaults rather than relaxing the schema.
      name: email,
      message: '(notify me when reopen)',
      kind: 'NOTIFY_WHEN_OPEN',
      status: 'NEW',
    },
  });

  return NextResponse.json({ ok: true });
}
