import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const plans = await prisma.mealPlan.findMany({
    where: { userId: session.user.id },
    orderBy: [{ startDate: 'desc' }],
    select: {
      id: true,
      name: true,
      description: true,
      startDate: true,
      endDate: true,
      dailyCalorieTarget: true,
      dailyProteinTarget: true,
      dailyCarbTarget: true,
      dailyFatTarget: true,
      trainer: { select: { name: true } },
    },
    take: 20,
  });

  return NextResponse.json(
    { plans },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
