import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, withDatabaseRetry } from '@/lib/prisma';

export async function GET() {
  try {
    console.log('🔍 Clients API - Getting clients for authenticated trainer');
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.log('❌ No session found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use retry mechanism for database operations
    const trainer = await withDatabaseRetry(async () => {
      return await prisma.user.findUnique({
        where: { email: session.user.email, role: 'TRAINER' }
      });
    });
    
    if (!trainer) {
      console.log('❌ Trainer not found for email:', session.user.email);
      return NextResponse.json(
        { error: 'Trainer not found' },
        { status: 403 }
      );
    }

    console.log('✅ Found trainer:', trainer.name);

    // Get trainer's clients with retry
    const clients = await withDatabaseRetry(async () => {
      return await prisma.user.findMany({
        where: {
          role: 'CLIENT',
          trainerId: trainer.id
        },
        include: {
          clientProfile: true,
          assignedTrainer: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          _count: {
            select: {
              progressEntries: true,
              clientAppointments: true,
              foodEntries: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    });

    console.log(`✅ Found ${clients.length} clients for trainer ${trainer.name}`);

    return NextResponse.json(clients);

  } catch (error) {
    console.error('Get clients error:', error);
    
    // Return a helpful error response instead of just 500
    return NextResponse.json(
      { 
        error: 'Database connection failed. Please try again in a moment.',
        details: 'The system is experiencing connectivity issues.' 
      },
      { status: 503 } // Service Unavailable
    );
  }
}