import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Get user's favorite foods
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const favorites = await prisma.favoriteFood.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ favorites });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return NextResponse.json({ error: 'Failed to fetch favorites' }, { status: 500 });
  }
}

// Add a food to favorites
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { foodName, brand, calories, protein, carbs, fat, servingSize, servingUnit, category, sourceId } = body;

    if (!foodName) {
      return NextResponse.json({ error: 'Food name is required' }, { status: 400 });
    }

    // Upsert — don't create duplicates
    const favorite = await prisma.favoriteFood.upsert({
      where: {
        userId_foodName_brand: {
          userId: session.user.id,
          foodName,
          brand: brand || null,
        },
      },
      update: {
        calories: calories || 0,
        protein: protein || 0,
        carbs: carbs || 0,
        fat: fat || 0,
        servingSize: servingSize || 100,
        servingUnit: servingUnit || 'g',
        category: category || null,
        sourceId: sourceId || null,
      },
      create: {
        userId: session.user.id,
        foodName,
        brand: brand || null,
        calories: calories || 0,
        protein: protein || 0,
        carbs: carbs || 0,
        fat: fat || 0,
        servingSize: servingSize || 100,
        servingUnit: servingUnit || 'g',
        category: category || null,
        sourceId: sourceId || null,
      },
    });

    return NextResponse.json({ favorite });
  } catch (error) {
    console.error('Error adding favorite:', error);
    return NextResponse.json({ error: 'Failed to add favorite' }, { status: 500 });
  }
}

// Remove a food from favorites
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const favoriteId = searchParams.get('id');

    if (!favoriteId) {
      return NextResponse.json({ error: 'Favorite ID required' }, { status: 400 });
    }

    // Verify ownership
    const favorite = await prisma.favoriteFood.findFirst({
      where: { id: favoriteId, userId: session.user.id },
    });

    if (!favorite) {
      return NextResponse.json({ error: 'Favorite not found' }, { status: 404 });
    }

    await prisma.favoriteFood.delete({ where: { id: favoriteId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing favorite:', error);
    return NextResponse.json({ error: 'Failed to remove favorite' }, { status: 500 });
  }
}
