import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() ?? '';
  const specialty = searchParams.get('specialty')?.trim().toLowerCase() ?? '';
  const location = searchParams.get('loc')?.trim() ?? '';
  const accepting = searchParams.get('accepting') === '1';
  const tier = searchParams.get('tier') ?? '';
  const minYearsRaw = Number.parseInt(searchParams.get('minYears') ?? '0', 10);
  const minYears = Number.isFinite(minYearsRaw) ? Math.max(0, minYearsRaw) : 0;
  const sort = searchParams.get('sort') ?? 'recent';

  const trainerFilters: Record<string, unknown> = {};
  if (specialty) trainerFilters.specialties = { has: specialty };
  if (location)
    trainerFilters.location = { contains: location, mode: 'insensitive' };
  if (tier) trainerFilters.priceTier = tier;
  if (minYears > 0) trainerFilters.experience = { gte: minYears };

  const where: Record<string, unknown> = {
    role: 'TRAINER',
    trainerIsPublic: true,
    trainerSlug: { not: null },
  };
  if (q) where.name = { contains: q, mode: 'insensitive' };
  if (accepting) where.trainerAcceptingClients = true;
  if (Object.keys(trainerFilters).length > 0) {
    where.trainer = { is: trainerFilters };
  }

  const orderBy =
    sort === 'experienced'
      ? { trainer: { experience: 'desc' as const } }
      : sort === 'az'
        ? { name: 'asc' as const }
        : { trainer: { profilePublishedAt: 'desc' as const } };

  const trainers = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      image: true,
      trainerSlug: true,
      trainerAcceptingClients: true,
      trainerClientStatus: true,
      trainer: {
        select: {
          bio: true,
          headline: true,
          photoUrl: true,
          coverImageUrl: true,
          location: true,
          experience: true,
          specialties: true,
          priceTier: true,
          clientsTrained: true,
          profilePublishedAt: true,
        },
      },
    },
    orderBy,
    take: 100,
  });

  return NextResponse.json({ trainers });
}
