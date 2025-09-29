import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

const addClientSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  phone: z.string().optional(),
  age: z.string().optional(),
  height: z.string().optional(),
  weight: z.string().optional(),
  fitnessLevel: z.enum(['Beginner', 'Intermediate', 'Advanced']).default('Beginner'),
  goals: z.string().optional()
});

// Get all clients for a trainer
export async function GET() {
  try {
    console.log('🔍 Clients API - Getting clients for authenticated trainer');
    
    // Get session to verify user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.log('❌ No session found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Find the trainer using session email
    const trainer = await prisma.user.findUnique({
      where: { email: session.user.email, role: 'TRAINER' }
    });
    
    if (!trainer) {
      console.log('❌ Trainer not found for email:', session.user.email);
      return NextResponse.json(
        { message: 'Trainer not found' },
        { status: 404 }
      );
    }
    
    console.log('✅ Found trainer:', trainer.id, 'fetching clients...');

    const whereClause = { trainerId: trainer.id, role: 'CLIENT' as const };
    console.log('🔍 Database query where clause:', whereClause);

    // Get all clients assigned to this trainer (or all clients if admin)
    const clients = await prisma.user.findMany({
      where: whereClause,
      include: {
        clientProfile: true,
        workoutSessions: {
          where: {
            completed: true
          },
          orderBy: {
            endTime: 'desc'
          },
          take: 1
        },
        progressEntries: {
          orderBy: {
            date: 'desc'
          },
          take: 1
        },
        assignedTrainer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Transform data for frontend
    const transformedClients = clients.map(client => ({
      id: client.id,
      name: client.name || '',
      email: client.email,
      createdAt: client.createdAt, // Add this for join date display
      primaryGoal: client.clientProfile?.fitnessGoals || 'General Fitness',
      fitnessLevel: client.clientProfile?.fitnessLevel || 'BEGINNER',
      goalProgress: Math.floor(Math.random() * 100), // TODO: Calculate actual progress
      lastActivity: client.workoutSessions[0]?.endTime || client.createdAt,
      status: client.workoutSessions.length > 0 ? 'Active' : 'New',
      startDate: client.createdAt, // Keep this for backwards compatibility
      trainer: client.assignedTrainer,
      progress: {
        currentWeight: 180, // TODO: Get from latest progress entry
        goalWeight: 170,
        workoutStreak: client.workoutSessions.length
      }
    }));

    return NextResponse.json(transformedClients);
    
  } catch (error) {
    console.error('Get clients error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Assign workout to client
export async function POST(request: Request) {
  try {
    // TEMPORARY: Skip authentication for debugging
    console.log('🔍 Clients POST API - Skipping authentication temporarily');
    
    const body = await request.json();
    const { clientId, workoutId, notes } = body;

    // Verify the client belongs to this trainer
    // TEMPORARY: Skip trainer verification for debugging
    const client = await prisma.user.findFirst({
      where: {
        id: clientId,
        role: 'CLIENT'
      }
    });

    if (!client) {
      return NextResponse.json(
        { message: 'Client not found' },
        { status: 404 }
      );
    }

    // Create workout session for the client
    const workoutSession = await prisma.workoutSession.create({
      data: {
        workoutId,
        userId: clientId,
        startTime: new Date(),
        notes: notes || null,
        completed: false
      },
      include: {
        workout: true,
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    // Create notification for the client
    await prisma.notification.create({
      data: {
        userId: clientId,
        title: 'New Workout Assigned',
        message: `Your trainer has assigned you a new workout: ${workoutSession.workout.title}`,
        type: 'WORKOUT_ASSIGNED',
        actionUrl: '/client/dashboard?tab=workouts'
      }
    });

    return NextResponse.json(workoutSession, { status: 201 });
    
  } catch (error) {
    console.error('Assign workout error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Add new client to trainer
export async function PUT(request: Request) {
  try {
    // TEMPORARY: Skip authentication for debugging
    console.log('🔍 Clients PUT API - Skipping authentication temporarily');
    
    // Use the correct business trainer account
    const trainer = await prisma.user.findUnique({
      where: { email: 'martinezfitness559@gmail.com' },
      select: { id: true, name: true }
    });
    
    if (!trainer) {
      return NextResponse.json(
        { message: 'Trainer not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = addClientSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    });

    if (existingUser) {
      return NextResponse.json(
        { message: 'A user with this email already exists' },
        { status: 400 }
      );
    }

    // Hash the default password
    const defaultPassword = 'Changemetoday1234!';
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);

    // Convert fitness level to match database enum
    const fitnessLevelMap: Record<string, 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'> = {
      'Beginner': 'BEGINNER',
      'Intermediate': 'INTERMEDIATE', 
      'Advanced': 'ADVANCED'
    };

    // Create new user and assign to trainer
    const newClient = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        role: 'CLIENT',
        trainerId: trainer.id,
        password: hashedPassword,
        passwordChangeRequired: true // Force password change on first login
      },
      include: {
        clientProfile: true
      }
    });

    // Create client profile
    await prisma.clientProfile.create({
      data: {
        userId: newClient.id,
        fitnessGoals: validatedData.goals || null,
        fitnessLevel: fitnessLevelMap[validatedData.fitnessLevel],
        age: validatedData.age ? parseInt(validatedData.age) : null,
        height: validatedData.height ? parseFloat(validatedData.height.replace(/[^0-9.]/g, '')) : null,
        weight: validatedData.weight ? parseFloat(validatedData.weight.replace(/[^0-9.]/g, '')) : null
      }
    });

    // Create welcome notification
    await prisma.notification.create({
      data: {
        userId: newClient.id,
        title: 'Welcome to Your Fitness Journey!',
        message: `You've been assigned to trainer ${trainer.name}. Login with your email and password: ${defaultPassword}`,
        type: 'GENERAL',
        actionUrl: '/client/dashboard'
      }
    });

    return NextResponse.json({
      id: newClient.id,
      name: newClient.name,
      email: newClient.email,
      message: 'Client created successfully'
    }, { status: 201 });
    
  } catch (error) {
    console.error('Add client error:', error);
    
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

// Update client status (deactivate/reactivate)
export async function PATCH(request: Request) {
  try {
    // TEMPORARY: Skip authentication for debugging
    console.log('🔍 Clients PATCH API - Skipping authentication temporarily');
    
    // Use Brent Martinez's trainer email that has the client relationship
    const trainer = await prisma.user.findUnique({
      where: { email: 'martinezfitness559@gmail.com' },
      select: { id: true }
    });
    
    if (!trainer) {
      return NextResponse.json(
        { message: 'Trainer not found' },
        { status: 404 }
      );
    }

    const { clientId, status } = await request.json();

    if (!clientId || !status) {
      return NextResponse.json(
        { message: 'Client ID and status are required' },
        { status: 400 }
      );
    }

    // Verify client belongs to this trainer
    const client = await prisma.user.findFirst({
      where: {
        id: clientId,
        trainerId: trainer.id,
        role: 'CLIENT'
      }
    });

    if (!client) {
      return NextResponse.json(
        { message: 'Client not found or not assigned to this trainer' },
        { status: 404 }
      );
    }

    if (status === 'INACTIVE') {
      // Remove trainer-client relationship to deactivate
      await prisma.user.update({
        where: {
          id: clientId
        },
        data: {
          trainerId: null // Remove trainer assignment
        }
      });

      return NextResponse.json(
        { message: 'Client deactivated and removed from your client list' },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { message: 'Only deactivation is currently supported' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error updating client status:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Completely delete client account
export async function DELETE(request: Request) {
  try {
    // TEMPORARY: Skip authentication for debugging
    console.log('🔍 Clients DELETE API - Skipping authentication temporarily');
    
    // Use Brent Martinez's trainer email that has the client relationship
    const trainer = await prisma.user.findUnique({
      where: { email: 'martinezfitness559@gmail.com' },
      select: { id: true }
    });
    
    if (!trainer) {
      return NextResponse.json(
        { message: 'Trainer not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json(
        { message: 'Client ID is required' },
        { status: 400 }
      );
    }

    // Verify client belongs to this trainer
    const client = await prisma.user.findFirst({
      where: {
        id: clientId,
        trainerId: trainer.id,
        role: 'CLIENT'
      }
    });

    if (!client) {
      return NextResponse.json(
        { message: 'Client not found or not assigned to this trainer' },
        { status: 404 }
      );
    }

    // Delete all related data first in proper order
    await prisma.$transaction(async (tx) => {
      // Get the client's email for related deletions
      const clientData = await tx.user.findUnique({
        where: { id: clientId },
        select: { email: true }
      });

      if (!clientData?.email) {
        throw new Error('Client email not found');
      }

      // Delete in order from most dependent to least dependent
      
      // 1. Delete food entries
      await tx.foodEntry.deleteMany({
        where: { userId: clientId }
      });

      // 2. Delete workout sessions (cascade should handle related data)
      await tx.workoutSession.deleteMany({
        where: { userId: clientId }
      });

      // 3. Delete progress entries
      await tx.progressEntry.deleteMany({
        where: { userId: clientId }
      });

      // 4. Delete meal plans (cascade should handle meals and meal items)
      await tx.mealPlan.deleteMany({
        where: { userId: clientId }
      });

      // 5. Delete notifications
      await tx.notification.deleteMany({
        where: { userId: clientId }
      });

      // 6. Delete messages (sent and received)
      await tx.message.deleteMany({
        where: { 
          OR: [
            { senderId: clientId },
            { receiverId: clientId }
          ]
        }
      });

      // 7. Delete appointments
      await tx.appointment.deleteMany({
        where: { clientId: clientId }
      });

      // 8. Delete invitations sent by this client
      await tx.invitation.deleteMany({
        where: { invitedBy: clientId }
      });

      // 9. Delete contact submissions
      await tx.contactSubmission.deleteMany({
        where: { email: clientData.email }
      });

      // 10. Delete client profile
      await tx.clientProfile.deleteMany({
        where: { userId: clientId }
      });

      // 11. Delete accounts and sessions
      await tx.account.deleteMany({
        where: { userId: clientId }
      });
      
      await tx.session.deleteMany({
        where: { userId: clientId }
      });

      // 12. Finally delete the user account
      await tx.user.delete({
        where: { id: clientId }
      });
    });

    return NextResponse.json(
      { message: 'Client account deleted completely' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting client account:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}