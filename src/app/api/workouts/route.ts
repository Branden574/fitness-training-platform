import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    console.log('🔍 Workouts API - GET request');
    
    // Get session to verify user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.log('❌ No session found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Find the user (could be trainer or client)
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      console.log('❌ User not found');
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const clientId = searchParams.get('clientId');

    // Handle CLIENT requests - return their assigned workouts
    if (user.role === 'CLIENT') {
      console.log('📝 Client requesting their assigned workouts');
      const workoutSessions = await prisma.workoutSession.findMany({
        where: {
          userId: user.id
        },
        include: {
          workout: {
            include: {
              exercises: {
                include: {
                  exercise: true
                },
                orderBy: {
                  order: 'asc'
                }
              }
            }
          }
        },
        orderBy: {
          startTime: 'desc'
        }
      });
      console.log(`✅ Found ${workoutSessions.length} assigned workouts for client`);
      return NextResponse.json(workoutSessions);
    }

    // Handle TRAINER requests
    if (user.role !== 'TRAINER') {
      console.log('❌ User is not a trainer or client');
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const trainerId = user.id;

    if (type === 'assigned') {
      const whereClause = {
        workout: {
          createdBy: trainerId
        },
        ...(clientId && { userId: clientId })
      };

      const workoutSessions = await prisma.workoutSession.findMany({
        where: whereClause,
        include: {
          workout: {
            include: {
              exercises: {
                include: {
                  exercise: true
                },
                orderBy: {
                  order: 'asc'
                }
              }
            }
          },
          user: true
        },
        orderBy: {
          startTime: 'desc'
        }
      });
      return NextResponse.json(workoutSessions);
    } else {
      const workouts = await prisma.workout.findMany({
        where: {
          createdBy: trainerId
        },
        include: {
          exercises: {
            include: {
              exercise: true
            },
            orderBy: {
              order: 'asc'
            }
          },
          sessions: {
            include: {
              user: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      return NextResponse.json(workouts);
    }
    
  } catch (error) {
    console.error('Get workouts error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    console.log('🔍 Workouts POST API - Assignment request');
    
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
      console.log('❌ Trainer not found');
      return NextResponse.json(
        { error: 'Trainer not found' },
        { status: 404 }
      );
    }

    const trainerId = trainer.id;
    const body = await request.json();
    const { workoutTemplateId, clientId, scheduledDate, notes } = body;

    console.log('🔍 Assignment data:', { workoutTemplateId, clientId });

    const workoutTemplate = await prisma.workout.findFirst({
      where: {
        id: workoutTemplateId,
        createdBy: trainerId
      }
    });

    if (!workoutTemplate) {
      console.log('❌ Workout template not found');
      return NextResponse.json(
        { message: 'Workout template not found or not authorized' },
        { status: 404 }
      );
    }

    const client = await prisma.user.findFirst({
      where: {
        id: clientId,
        trainerId: trainerId
      }
    });

    if (!client) {
      console.log('❌ Client not found or not assigned to trainer');
      return NextResponse.json(
        { message: 'Client not found or not assigned to you' },
        { status: 404 }
      );
    }

    const workoutSession = await prisma.workoutSession.create({
      data: {
        workoutId: workoutTemplateId,
        userId: clientId,
        startTime: scheduledDate ? new Date(scheduledDate) : new Date(),
        notes: notes || null,
      },
      include: {
        workout: {
          include: {
            exercises: {
              include: {
                exercise: true
              },
              orderBy: {
                order: 'asc'
              }
            }
          }
        },
        user: true
      }
    });

    // Create notification for client
    await prisma.notification.create({
      data: {
        userId: clientId,
        type: 'WORKOUT_ASSIGNED',
        title: 'New Workout Assigned',
        message: `You have been assigned a new workout: ${workoutTemplate.title}`,
        actionUrl: `/client/dashboard?tab=workouts`
      }
    });

    console.log('✅ Workout assigned successfully');
    return NextResponse.json(workoutSession, { status: 201 });
    
  } catch (error) {
    console.error('Create workout assignment error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
