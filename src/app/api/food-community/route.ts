import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Search community foods
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();
    const barcode = searchParams.get('barcode')?.trim();

    if (barcode) {
      // Exact barcode lookup
      const food = await prisma.communityFood.findUnique({
        where: { barcode },
      });
      if (food) {
        // Increment use count
        await prisma.communityFood.update({
          where: { id: food.id },
          data: { useCount: { increment: 1 } },
        }).catch(() => {});
      }
      return NextResponse.json({ food: food || null });
    }

    if (query && query.length >= 2) {
      // Text search
      const foods = await prisma.communityFood.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { brand: { contains: query, mode: 'insensitive' } },
          ],
        },
        orderBy: { useCount: 'desc' },
        take: 20,
      });
      return NextResponse.json({ foods });
    }

    // Return most popular community foods
    const popular = await prisma.communityFood.findMany({
      orderBy: { useCount: 'desc' },
      take: 20,
    });
    return NextResponse.json({ foods: popular });
  } catch (error) {
    console.error('Community food search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}

// Add a food to the community database
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { barcode, name, brand, calories, protein, carbs, fat, fiber, sugar, servingSize, servingUnit, category } = body;

    if (!name || calories === undefined) {
      return NextResponse.json({ error: 'Name and calories are required' }, { status: 400 });
    }

    // If barcode exists, check if it's already in the database
    if (barcode) {
      const existing = await prisma.communityFood.findUnique({
        where: { barcode },
      });
      if (existing) {
        // Update use count and return existing
        await prisma.communityFood.update({
          where: { id: existing.id },
          data: { useCount: { increment: 1 } },
        });
        return NextResponse.json({ food: existing, existed: true });
      }
    }

    // Fuzzy name+brand duplicate guard. Without this the DB fills up with
    // "Chicken breast" / "chicken breast" / "Chicken Breast " variants that
    // fragment the useCount sorting. Case-insensitive exact match on
    // (name, brand) is the cheapest win — stricter semantic matching is a
    // future refinement.
    const trimmedName = String(name).trim();
    const trimmedBrand = brand ? String(brand).trim() : null;
    const nameDuplicate = await prisma.communityFood.findFirst({
      where: {
        name: { equals: trimmedName, mode: 'insensitive' },
        brand: trimmedBrand
          ? { equals: trimmedBrand, mode: 'insensitive' }
          : null,
      },
      orderBy: { useCount: 'desc' },
    });
    if (nameDuplicate) {
      await prisma.communityFood
        .update({
          where: { id: nameDuplicate.id },
          data: { useCount: { increment: 1 } },
        })
        .catch(() => {});
      return NextResponse.json({ food: nameDuplicate, existed: true });
    }

    const food = await prisma.communityFood.create({
      data: {
        barcode: barcode || null,
        name: trimmedName,
        brand: trimmedBrand,
        calories: parseFloat(calories) || 0,
        protein: parseFloat(protein) || 0,
        carbs: parseFloat(carbs) || 0,
        fat: parseFloat(fat) || 0,
        fiber: fiber ? parseFloat(fiber) : null,
        sugar: sugar ? parseFloat(sugar) : null,
        servingSize: parseFloat(servingSize) || 100,
        servingUnit: servingUnit || 'g',
        category: category || null,
        addedBy: session.user.id,
      },
    });

    return NextResponse.json({ food, created: true });
  } catch (error) {
    console.error('Community food creation error:', error);
    return NextResponse.json({ error: 'Failed to save food' }, { status: 500 });
  }
}
