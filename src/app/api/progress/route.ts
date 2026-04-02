import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

const progressSchema = z.object({
  date: z.string().optional(), // Allow custom date selection
  weight: z.number().positive().optional(),
  bodyFat: z.number().min(0).max(100).optional(),
  muscleMass: z.number().positive().optional(),
  measurements: z.record(z.string(), z.number()).optional(),
  notes: z.string().optional(),
  mood: z.number().min(1).max(10).optional(),
  energy: z.number().min(1).max(10).optional(),
  sleep: z.number().min(0).max(24).optional(),
});

// Get progress entries for the current user or trainer's clients
export async function GET(request: NextRequest) {
  try {
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const limit = parseInt(searchParams.get('limit') || '30');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const whereClause: {
      userId?: string;
      date?: {
        gte: Date;
        lte: Date;
      };
    } = {};

    // If trainer is requesting a specific client's progress
    if (user.role === 'TRAINER' && clientId) {
      // Verify this client belongs to this trainer
      const client = await prisma.user.findFirst({
        where: { 
          id: clientId, 
          trainerId: user.id 
        }
      });

      if (!client) {
        return NextResponse.json(
          { error: 'Client not found or not assigned to you' },
          { status: 404 }
        );
      }
      
      whereClause.userId = clientId;
    } else {
      // Client can only see their own progress
      whereClause.userId = user.id;
    }

    // Add date filters if provided
    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const progressEntries = await prisma.progressEntry.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      },
      take: limit
    });

    // Debug: Log the actual dates returned from database
    if (progressEntries.length > 0) {
      progressEntries.forEach((entry, index) => {
      });
    }
    
    // Calculate enterprise-level analytics
    let analytics = null;
    if (progressEntries.length > 0) {
      const sortedEntries = progressEntries.sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      const latest = sortedEntries[sortedEntries.length - 1];
      const previous = sortedEntries.length > 1 ? sortedEntries[sortedEntries.length - 2] : null;
      const earliest = sortedEntries[0];

      // Weight analytics
      const weightEntries = sortedEntries.filter(entry => entry.weight !== null);
      const avgWeight = weightEntries.length > 0 ? 
        weightEntries.reduce((sum, entry) => sum + (entry.weight || 0), 0) / weightEntries.length : 0;

      // Body fat analytics
      const bodyFatEntries = sortedEntries.filter(entry => entry.bodyFat !== null);
      const avgBodyFat = bodyFatEntries.length > 0 ? 
        bodyFatEntries.reduce((sum, entry) => sum + (entry.bodyFat || 0), 0) / bodyFatEntries.length : 0;

      analytics = {
        summary: {
          totalEntries: progressEntries.length,
          dateRange: {
            start: earliest.date,
            end: latest.date,
            daysCovered: Math.ceil((new Date(latest.date).getTime() - new Date(earliest.date).getTime()) / (1000 * 60 * 60 * 24)) + 1
          },
          consistency: {
            entriesPerWeek: (progressEntries.length / (Math.ceil((new Date(latest.date).getTime() - new Date(earliest.date).getTime()) / (1000 * 60 * 60 * 24 * 7)) || 1)),
            streak: calculateStreak(sortedEntries)
          }
        },
        weight: {
          current: latest.weight,
          previous: previous?.weight || null,
          starting: earliest.weight,
          average: parseFloat(avgWeight.toFixed(2)),
          change: {
            daily: latest.weight && previous?.weight ? 
              parseFloat((latest.weight - previous.weight).toFixed(2)) : null,
            total: latest.weight && earliest.weight ? 
              parseFloat((latest.weight - earliest.weight).toFixed(2)) : null,
            percentage: latest.weight && earliest.weight ? 
              parseFloat(((latest.weight - earliest.weight) / earliest.weight * 100).toFixed(2)) : null
          },
          trend: calculateTrend(weightEntries.map(e => e.weight!)),
          goals: {
            targetReached: false, // TODO: Implement goal tracking
            onTrack: true // TODO: Calculate based on goal timeline
          }
        },
        bodyFat: bodyFatEntries.length > 0 ? {
          current: latest.bodyFat,
          previous: previous?.bodyFat || null,
          starting: earliest.bodyFat,
          average: parseFloat(avgBodyFat.toFixed(2)),
          change: {
            daily: latest.bodyFat && previous?.bodyFat ? 
              parseFloat((latest.bodyFat - previous.bodyFat).toFixed(2)) : null,
            total: latest.bodyFat && earliest.bodyFat ? 
              parseFloat((latest.bodyFat - earliest.bodyFat).toFixed(2)) : null
          },
          trend: calculateTrend(bodyFatEntries.map(e => e.bodyFat!))
        } : null,
        wellness: {
          averageMood: calculateAverage(sortedEntries.map(e => e.mood).filter(Boolean)),
          averageEnergy: calculateAverage(sortedEntries.map(e => e.energy).filter(Boolean)),
          averageSleep: calculateAverage(sortedEntries.map(e => e.sleep).filter(Boolean))
        }
      };
    }

    return NextResponse.json({
      entries: progressEntries,
      analytics,
      total: progressEntries.length
    });
    
  } catch (error) {
    console.error('Get progress error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions for analytics
function calculateStreak(entries: { date: Date | string }[]): number {
  if (entries.length === 0) return 0;
  
  let streak = 1;
  const today = new Date();
  const latestDate = new Date(entries[entries.length - 1].date);
  
  // Check if latest entry is recent (within 2 days)
  const daysDiff = Math.ceil((today.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff > 2) return 0;
  
  // Count consecutive days
  for (let i = entries.length - 2; i >= 0; i--) {
    const currentDate = new Date(entries[i + 1].date);
    const prevDate = new Date(entries[i].date);
    const diff = Math.ceil((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diff <= 2) { // Allow 1 day gap
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}

function calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
  if (values.length < 2) return 'stable';
  
  const recent = values.slice(-5); // Look at last 5 entries
  const slope = calculateSlope(recent);
  
  if (slope > 0.1) return 'increasing';
  if (slope < -0.1) return 'decreasing';
  return 'stable';
}

function calculateSlope(values: number[]): number {
  if (values.length < 2) return 0;
  
  const n = values.length;
  const sumX = (n * (n - 1)) / 2; // 0 + 1 + 2 + ... + (n-1)
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
  const sumXX = values.reduce((sum, _, x) => sum + x * x, 0);
  
  return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX) || 0;
}

function calculateAverage(values: (number | null)[]): number | null {
  const validValues = values.filter(v => v !== null) as number[];
  if (validValues.length === 0) return null;
  return parseFloat((validValues.reduce((a, b) => a + b, 0) / validValues.length).toFixed(1));
}

// Create a new progress entry
export async function POST(request: NextRequest) {
  try {
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = progressSchema.parse(body);

    // Use provided date or current date
    // Parse date in local timezone to avoid UTC shift issues
    let entryDate: Date;
    if (validatedData.date) {
      if (typeof validatedData.date === 'string' && validatedData.date.includes('-') && validatedData.date.length === 10) {
        // Handle YYYY-MM-DD format in local timezone
        const [year, month, day] = validatedData.date.split('-').map(Number);
        entryDate = new Date(year, month - 1, day);
      } else {
        entryDate = new Date(validatedData.date);
      }
    } else {
      entryDate = new Date();
    }
    
    // Get the date in YYYY-MM-DD format preserving the local timezone
    // This ensures the date stays as intended regardless of server timezone
    const year = entryDate.getFullYear();
    const month = String(entryDate.getMonth() + 1).padStart(2, '0');
    const day = String(entryDate.getDate()).padStart(2, '0');
    const localDateString = `${year}-${month}-${day}`;
    
    // Create a date object that represents the local date at noon UTC to avoid timezone shifts
    // Using noon (12:00) instead of midnight to prevent date boundary issues
    const normalizedDate = new Date(localDateString + 'T12:00:00.000Z');
    
    // Check if entry already exists for this date
    
    const existingEntry = await prisma.progressEntry.findUnique({
      where: {
        userId_date: {
          userId: user.id,
          date: normalizedDate
        }
      }
    });

    if (existingEntry) {
    }

    if (existingEntry) {
      return NextResponse.json(
        { 
          message: 'Progress entry already exists for this date. Use PATCH to update it.',
          existingEntry: existingEntry
        },
        { status: 409 }
      );
    }

    const progressEntry = await prisma.progressEntry.create({
      data: {
        userId: user.id,
        date: normalizedDate,
        weight: validatedData.weight,
        bodyFat: validatedData.bodyFat,
        muscleMass: validatedData.muscleMass,
        measurements: validatedData.measurements || undefined,
        notes: validatedData.notes,
        mood: validatedData.mood,
        energy: validatedData.energy,
        sleep: validatedData.sleep,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json(progressEntry, { status: 201 });
    
  } catch (error) {
    console.error('Create progress entry error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          message: 'Validation error',
          errors: error.issues 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update existing progress entry
export async function PATCH(request: NextRequest) {
  try {
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { entryId, date, ...updateData } = body;

    if (!entryId && !date) {
      return NextResponse.json(
        { error: 'Either entryId or date is required' },
        { status: 400 }
      );
    }

    let whereClause: { id: string } | { userId_date: { userId: string; date: Date } };
    
    if (entryId) {
      whereClause = { id: entryId };
    } else {
      // Parse date in local timezone to avoid UTC shift issues
      let entryDate: Date;
      if (typeof date === 'string' && date.includes('-') && date.length === 10) {
        // Handle YYYY-MM-DD format in local timezone
        const [year, month, day] = date.split('-').map(Number);
        entryDate = new Date(year, month - 1, day);
      } else {
        entryDate = new Date(date);
      }
      // Get the date in YYYY-MM-DD format preserving the local timezone
      const year = entryDate.getFullYear();
      const month = String(entryDate.getMonth() + 1).padStart(2, '0');
      const day = String(entryDate.getDate()).padStart(2, '0');
      const localDateString = `${year}-${month}-${day}`;
      
      // Create a date object that represents the local date at noon UTC to avoid timezone shifts
      const normalizedDate = new Date(localDateString + 'T12:00:00.000Z');
      whereClause = {
        userId_date: {
          userId: user.id,
          date: normalizedDate
        }
      };
    }

    // Verify ownership
    const existingEntry = await prisma.progressEntry.findUnique({
      where: whereClause
    });

    if (!existingEntry) {
      return NextResponse.json(
        { error: 'Progress entry not found' },
        { status: 404 }
      );
    }

    if (existingEntry.userId !== user.id) {
      // Trainers can only edit entries for their own assigned clients
      if (user.role === 'TRAINER') {
        const isMyClient = await prisma.user.findFirst({
          where: { id: existingEntry.userId, trainerId: user.id },
        });
        if (!isMyClient) {
          return NextResponse.json(
            { error: 'Unauthorized to modify this entry' },
            { status: 403 }
          );
        }
      } else if (user.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Unauthorized to modify this entry' },
          { status: 403 }
        );
      }
    }

    // Validate update data
    const validatedData = progressSchema.partial().parse(updateData);

    const updatedEntry = await prisma.progressEntry.update({
      where: whereClause,
      data: {
        weight: validatedData.weight,
        bodyFat: validatedData.bodyFat,
        muscleMass: validatedData.muscleMass,
        measurements: validatedData.measurements,
        notes: validatedData.notes,
        mood: validatedData.mood,
        energy: validatedData.energy,
        sleep: validatedData.sleep,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json(updatedEntry);
    
  } catch (error) {
    console.error('Update progress entry error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          message: 'Validation error',
          errors: error.issues 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
// Delete a progress entry
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get('id');

    if (!entryId) {
      return NextResponse.json({ message: 'Entry ID required' }, { status: 400 });
    }

    const entry = await prisma.progressEntry.findFirst({
      where: { id: entryId, userId: session.user.id },
    });

    if (!entry) {
      return NextResponse.json({ message: 'Entry not found' }, { status: 404 });
    }

    await prisma.progressEntry.delete({ where: { id: entryId } });

    return NextResponse.json({ message: 'Entry deleted' });
  } catch (error) {
    console.error('Delete progress error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
