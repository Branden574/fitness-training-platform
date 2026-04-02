import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Get user's recently logged foods (deduplicated by name)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the last 100 food entries, then deduplicate by foodName
    const recentEntries = await prisma.foodEntry.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        foodName: true,
        calories: true,
        protein: true,
        carbs: true,
        fat: true,
        quantity: true,
        unit: true,
        createdAt: true,
      },
    });

    // Deduplicate by foodName, keep most recent entry's data
    const seen = new Set<string>();
    const recentFoods = [];
    for (const entry of recentEntries) {
      const key = entry.foodName.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        recentFoods.push({
          foodName: entry.foodName,
          calories: entry.calories,
          protein: entry.protein,
          carbs: entry.carbs,
          fat: entry.fat,
          servingSize: entry.quantity,
          servingUnit: entry.unit,
          lastLogged: entry.createdAt,
        });
      }
      if (recentFoods.length >= 20) break;
    }

    // Also get frequently logged foods (top 10 by count)
    const frequentFoods = await prisma.foodEntry.groupBy({
      by: ['foodName'],
      where: { userId: session.user.id },
      _count: { foodName: true },
      _avg: { calories: true, protein: true, carbs: true, fat: true },
      orderBy: { _count: { foodName: 'desc' } },
      take: 10,
    });

    const frequent = frequentFoods.map((f) => ({
      foodName: f.foodName,
      count: f._count.foodName,
      calories: Math.round(f._avg.calories || 0),
      protein: Math.round((f._avg.protein || 0) * 10) / 10,
      carbs: Math.round((f._avg.carbs || 0) * 10) / 10,
      fat: Math.round((f._avg.fat || 0) * 10) / 10,
    }));

    return NextResponse.json({
      recent: recentFoods,
      frequent,
    });
  } catch (error) {
    console.error('Error fetching recent foods:', error);
    return NextResponse.json({ error: 'Failed to fetch recent foods' }, { status: 500 });
  }
}
