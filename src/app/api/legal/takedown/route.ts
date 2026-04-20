import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

const schema = z.object({
  contentType: z.enum(['transformation', 'testimonial', 'profile']),
  contentId: z.string().min(1).max(200),
  reporterEmail: z.string().email(),
  reporterName: z.string().max(120).optional(),
  reason: z.string().min(10).max(2000),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`takedown:${ip}`, {
    maxRequests: 3,
    windowSeconds: 60 * 60,
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
      { error: 'Invalid fields', details: parsed.error.issues },
      { status: 400 },
    );
  }

  await prisma.contentTakedownRequest.create({
    data: {
      contentType: parsed.data.contentType,
      contentId: parsed.data.contentId,
      reporterEmail: parsed.data.reporterEmail.toLowerCase().trim(),
      reporterName: parsed.data.reporterName ?? null,
      reason: parsed.data.reason,
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
