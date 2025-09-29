import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Get food entries for a client
export async function GET(request: Request) {
  try {
    console.log('🔍 Food Entries API - GET request started');
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      console.log('❌ No session found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const clientId = searchParams.get('clientId');
    
    console.log('📅 Request parameters:', { date, clientId });
    console.log('👤 Session user:', { id: session.user.id, role: session.user.role });

    // Determine user ID - trainers can view client data, clients view their own
    let userId = session.user.id;
    if (session.user.role === 'TRAINER' && clientId) {
      console.log('🔍 Trainer requesting client data, verifying access...');
      // Verify trainer has access to this client
      const client = await prisma.user.findFirst({
        where: {
          id: clientId,
          trainerId: session.user.id
        }
      });
      if (!client) {
        console.log('❌ Client not found or not assigned to trainer');
        return NextResponse.json(
          { error: 'Client not found or not assigned to you' },
          { status: 404 }
        );
      }
      userId = clientId;
      console.log('✅ Trainer access verified for client:', clientId);
    }

    // Get food entries for the specified date or today
    // Fix timezone issues by parsing date in local timezone
    let targetDate: Date;
    if (date) {
      // Parse date string in local timezone to avoid UTC shift
      const [year, month, day] = date.split('-').map(Number);
      targetDate = new Date(year, month - 1, day); // month is 0-indexed
      console.log('📅 Parsed date from components:', { year, month: month - 1, day });
    } else {
      targetDate = new Date();
    }
    
    console.log('📅 Original date string:', date);
    console.log('📅 Final targetDate (local timezone):', targetDate.toString());
    
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    console.log('🕰️ Date range for query (local timezone):');
    console.log('  Start of day:', startOfDay.toString());
    console.log('  End of day:', endOfDay.toString());
    console.log('🕰️ Date range for query (UTC):');
    console.log('  Start of day UTC:', startOfDay.toISOString());
    console.log('  End of day UTC:', endOfDay.toISOString());

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

    console.log(`📊 Found ${foodEntries.length} food entries for user ${userId}`);
    if (foodEntries.length > 0) {
      console.log('🍎 Food entries details:');
      foodEntries.forEach((entry, index) => {
        console.log(`  ${index + 1}. ${entry.foodName} - Date: ${entry.date.toISOString()}, Created: ${entry.createdAt.toISOString()}`);
      });
    }

    // Calculate daily totals
    const dailyTotals = foodEntries.reduce((totals, entry) => ({
      calories: totals.calories + (entry.calories || 0),
      protein: totals.protein + (entry.protein || 0),
      carbs: totals.carbs + (entry.carbs || 0),
      fat: totals.fat + (entry.fat || 0)
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

    const responseDate = targetDate.toISOString().split('T')[0];
    console.log('📤 Returning response with date:', responseDate);
    console.log('✅ Food entries API completed successfully');

    return NextResponse.json({
      entries: foodEntries,
      dailyTotals,
      date: responseDate
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
    console.log('🍎 Food Entries API - Creating new food entry');
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'CLIENT') {
      console.log('❌ Unauthorized access attempt');
      return NextResponse.json(
        { error: 'Unauthorized - Client access required' },
        { status: 401 }
      );
    }

    console.log('👤 Creating food entry for user:', session.user.email);

    const body = await request.json();
    console.log('📝 Food entry data received:', body);
    
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
      notes
    } = body;

    if (!foodName || !quantity || !calories) {
      console.log('❌ Missing required fields');
      return NextResponse.json(
        { error: 'Food name, quantity, and calories are required' },
        { status: 400 }
      );
    }

    // Parse and validate the date - fix timezone issues
    let entryDate: Date;
    if (date) {
      // Parse date string in local timezone to avoid UTC shift
      const [year, month, day] = date.split('-').map(Number);
      entryDate = new Date(year, month - 1, day); // month is 0-indexed
      console.log('📅 Parsed entry date from components:', { year, month: month - 1, day });
      console.log('📅 Entry date (local timezone):', entryDate.toString());
    } else {
      entryDate = new Date();
      console.log('📅 Using current date:', entryDate.toString());
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

    console.log('✅ Food entry created successfully:', foodEntry.id);
    return NextResponse.json(foodEntry);

  } catch (error) {
    console.error('❌ Error creating food entry:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace available'
    });
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