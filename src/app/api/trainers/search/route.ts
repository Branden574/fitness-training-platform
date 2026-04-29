import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimitAsync, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

function initialsOf(name: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? '?') + (parts[1]?.[0] ?? '');
}

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await checkRateLimitAsync(`trainer-search:${ip}`, {
    maxRequests: 30,
    windowSeconds: 60,
  });
  if (!rl.allowed) return rateLimitResponse(rl.resetIn);

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim();

  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const trainers = await prisma.user.findMany({
    where: {
      role: 'TRAINER',
      trainerIsPublic: true,
      trainerSlug: { not: null },
      name: { contains: q, mode: 'insensitive' },
    },
    select: {
      id: true,
      name: true,
      image: true,
      trainerSlug: true,
      trainerAcceptingClients: true,
      trainerClientStatus: true,
      trainer: { select: { contactPhone: true } },
    },
    take: 10,
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({
    results: trainers.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.trainerSlug,
      photoUrl: t.image,
      initials: initialsOf(t.name),
      acceptingClients: t.trainerAcceptingClients,
      clientStatus: t.trainerClientStatus,
      contactPhone: t.trainer?.contactPhone ?? null,
    })),
  });
}
