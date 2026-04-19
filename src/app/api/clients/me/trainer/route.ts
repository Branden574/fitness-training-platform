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
  // clients don't need it for rendering; dropping to reduce ambient surface area.
  return NextResponse.json(
    {
      trainer: {
        name: t.name,
        initials: initials(t.name),
        photoUrl: t.image,
        slug: t.trainerSlug,
      },
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
