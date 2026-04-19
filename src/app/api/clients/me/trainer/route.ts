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
    return NextResponse.json({ trainer: null });
  }

  const t = me.assignedTrainer;
  return NextResponse.json({
    trainer: {
      id: t.id,
      name: t.name,
      initials: initials(t.name),
      photoUrl: t.image,
      slug: t.trainerSlug,
    },
  });
}
