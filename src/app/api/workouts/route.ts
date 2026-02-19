import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    
    // Get session to verify user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
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
      return NextResponse.json(workoutSessions);
    }

    // Handle TRAINER requests
    if (user.role !== 'TRAINER') {
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
    
    // Get session to verify user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
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
      return NextResponse.json(
        { error: 'Trainer not found' },
        { status: 404 }
      );
    }

    const trainerId = trainer.id;
    const body = await request.json();
    const { workoutTemplateId, clientId, scheduledDate, notes } = body;

    const workoutTemplate = await prisma.workout.findFirst({
      where: {
        id: workoutTemplateId,
        createdBy: trainerId
      }
    });

    if (!workoutTemplate) {
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

    return NextResponse.json(workoutSession, { status: 201 });
    
  } catch (error) {
    console.error('Create workout assignment error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
