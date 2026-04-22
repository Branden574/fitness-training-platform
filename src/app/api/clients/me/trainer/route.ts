import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function initials(name: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? '?') + (parts[1]?.[0] ?? '');
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      trainerId: true,
      assignedTrainer: {
        select: {
          id: true,
          name: true,
          image: true,
          trainerSlug: true,
          trainerIsPublic: true,
        },
      },
    },
  });

  if (!me?.assignedTrainer) {
    return NextResponse.json(
      { trainer: null },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

  const t = me.assignedTrainer;
  // Only display-safe fields in the response — no internal `id` exposed since
  // clients don't need it for rendering; dropping to reduce ambient surface
  // area. `isPublic` lets the client shell decide whether to render the
  // sidebar chip as a Link (public profile exists) or a plain div (private —
  // /t/[slug] would 404 and clicking into a 404 is worse than a non-link).
  return NextResponse.json(
    {
      trainer: {
        name: t.name,
        initials: initials(t.name),
        photoUrl: t.image,
        slug: t.trainerSlug,
        isPublic: t.trainerIsPublic === true,
      },
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
