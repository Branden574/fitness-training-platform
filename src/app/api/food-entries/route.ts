import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Get food entries for a client
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const clientId = searchParams.get('clientId');

    // Determine user ID - trainers can view client data, clients view their own
    let userId = session.user.id;
    if (session.user.role === 'TRAINER' && clientId) {
      // Verify trainer has access to this client
      const client = await prisma.user.findFirst({
        where: {
          id: clientId,
          trainerId: session.user.id
        }
      });
      if (!client) {
        return NextResponse.json(
          { error: 'Client not found or not assigned to you' },
          { status: 404 }
        );
      }
      userId = clientId;
    }

    // Parse date in local timezone to avoid UTC shift
    let targetDate: Date;
    if (date) {
      const [year, month, day] = date.split('-').map(Number);
      targetDate = new Date(year, month - 1, day);
    } else {
      targetDate = new Date();
    }

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const foodEntries = await prisma.foodEntry.findMany({
      where: {
        userId: userId,
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Calculate daily totals
    const dailyTotals = foodEntries.reduce((totals, entry) => ({
      calories: totals.calories + (entry.calories || 0),
      protein: totals.protein + (entry.protein || 0),
      carbs: totals.carbs + (entry.carbs || 0),
      fat: totals.fat + (entry.fat || 0)
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

    return NextResponse.json({
      entries: foodEntries,
      dailyTotals,
      date: targetDate.toISOString().split('T')[0]
    });

  } catch (error) {
    console.error('Error fetching food entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch food entries' },
      { status: 500 }
    );
  }
}

// Create new food entry
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'CLIENT') {
      return NextResponse.json(
        { error: 'Unauthorized - Client access required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      foodName,
      quantity,
      unit,
      calories,
      protein,
      carbs,
      fat,
      mealType,
      date,
      notes,
      communityFoodId,
    } = body;

    if (!foodName || !quantity || !calories) {
      return NextResponse.json(
        { error: 'Food name, quantity, and calories are required' },
        { status: 400 }
      );
    }

    // Parse date in local timezone to avoid UTC shift
    let entryDate: Date;
    if (date) {
      const [year, month, day] = date.split('-').map(Number);
      entryDate = new Date(year, month - 1, day);
    } else {
      entryDate = new Date();
    }

    const foodEntry = await prisma.foodEntry.create({
      data: {
        userId: session.user.id,
        foodName,
        quantity: parseFloat(quantity),
        unit: unit || 'grams',
        calories: parseFloat(calories),
        protein: parseFloat(protein) || 0,
        carbs: parseFloat(carbs) || 0,
        fat: parseFloat(fat) || 0,
        mealType: mealType || 'SNACK',
        date: entryDate,
        notes: notes || null
      }
    });

    // Optional: bump the community entry's useCount so popular foods
    // bubble to the top of search. Fire-and-forget — failure to bump
    // can't invalidate the entry that just committed.
    if (communityFoodId && typeof communityFoodId === 'string') {
      prisma.communityFood
        .update({
          where: { id: communityFoodId },
          data: { useCount: { increment: 1 } },
        })
        .catch(() => {
          // Possibly a deleted community food — ignore.
        });
    }

    return NextResponse.json(foodEntry);

  } catch (error) {
    console.error('Error creating food entry:', error);
    return NextResponse.json(
      { error: 'Failed to create food entry' },
      { status: 500 }
    );
  }
}

// Update food entry
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'CLIENT') {
      return NextResponse.json(
        { error: 'Unauthorized - Client access required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get('id');

    if (!entryId) {
      return NextResponse.json(
        { error: 'Entry ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      foodName,
      quantity,
      unit,
      calories,
      protein,
      carbs,
      fat,
      mealType,
      notes
    } = body;

    // Verify entry belongs to this user
    const existingEntry = await prisma.foodEntry.findFirst({
      where: {
        id: entryId,
        userId: session.user.id
      }
    });

    if (!existingEntry) {
      return NextResponse.json(
        { error: 'Food entry not found or not owned by you' },
        { status: 404 }
      );
    }

    const updatedEntry = await prisma.foodEntry.update({
      where: { id: entryId },
      data: {
        foodName: foodName || existingEntry.foodName,
        quantity: quantity ? parseFloat(quantity) : existingEntry.quantity,
        unit: unit || existingEntry.unit,
        calories: calories ? parseFloat(calories) : existingEntry.calories,
        protein: protein ? parseFloat(protein) : existingEntry.protein,
        carbs: carbs ? parseFloat(carbs) : existingEntry.carbs,
        fat: fat ? parseFloat(fat) : existingEntry.fat,
        mealType: mealType || existingEntry.mealType,
        notes: notes !== undefined ? notes : existingEntry.notes
      }
    });

    return NextResponse.json(updatedEntry);

  } catch (error) {
    console.error('Error updating food entry:', error);
    return NextResponse.json(
      { error: 'Failed to update food entry' },
      { status: 500 }
    );
  }
}

// Delete food entry
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'CLIENT') {
      return NextResponse.json(
        { error: 'Unauthorized - Client access required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get('id');

    if (!entryId) {
      return NextResponse.json(
        { error: 'Entry ID is required' },
        { status: 400 }
      );
    }

    // Verify entry belongs to this user
    const existingEntry = await prisma.foodEntry.findFirst({
      where: {
        id: entryId,
        userId: session.user.id
      }
    });

    if (!existingEntry) {
      return NextResponse.json(
        { error: 'Food entry not found or not owned by you' },
        { status: 404 }
      );
    }

    await prisma.foodEntry.delete({
      where: { id: entryId }
    });

    return NextResponse.json({ message: 'Food entry deleted successfully' });

  } catch (error) {
    console.error('Error deleting food entry:', error);
    return NextResponse.json(
      { error: 'Failed to delete food entry' },
      { status: 500 }
    );
  }
}