import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/trainers/me/activity
 *
 * Read-only feed for the trainer's profile editor right rail. Returns the
 * number of applications (`ContactSubmission` rows) this trainer received
 * since the start of the current week (Monday 00:00 local). Profile-view
 * tracking does not exist yet — when it does, add it here.
 */

function startOfWeek(d = new Date()): Date {
  const s = new Date(d);
  const day = s.getDay();
  // Monday-indexed week (Sun → -6, Mon → 0, Tue → -1, …)
  const diff = day === 0 ? -6 : 1 - day;
  s.setDate(s.getDate() + diff);
  s.setHours(0, 0, 0, 0);
  return s;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'TRAINER' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const applicationsThisWeek = await prisma.contactSubmission.count({
    where: {
      trainerId: session.user.id,
      createdAt: { gte: startOfWeek() },
    },
  });

  return NextResponse.json(
    { applicationsThisWeek },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
