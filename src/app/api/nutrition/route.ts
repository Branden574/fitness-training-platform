import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Get meal plans for trainer or client
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use actual session user ID
    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    
    let nutritionPlans;
    
    if (session.user.role === 'TRAINER' && clientId) {
      // Trainer requesting specific client's assigned plans
      nutritionPlans = await prisma.mealPlan.findMany({
        where: { 
          trainerId: userId,
          userId: clientId  // Plans assigned to this specific client
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          trainer: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } else {
      // Original logic for templates and client's own plans
      nutritionPlans = await prisma.mealPlan.findMany({
        where: session.user.role === 'TRAINER' 
          ? { 
              trainerId: userId,
              userId: userId // Only show templates (plans assigned to trainer themselves)
            }
          : { userId: userId },   // Clients see only their assigned plans
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          trainer: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    }

    // For trainers, enhance plans with template status and client counts
    if (session.user.role === 'TRAINER' && !clientId) {
      const enhancedPlans = await Promise.all(nutritionPlans.map(async (plan) => {
        // All plans returned for trainers are templates (userId === trainerId)
        const isTemplate = true;
        
        // Count assigned clients for this template
        const assignedClientsCount = await prisma.mealPlan.count({
          where: {
            trainerId: userId,
            name: plan.name,
            userId: { not: userId } // Count client assignments (not the template)
          }
        });

        return {
          ...plan,
          isTemplate,
          isAssigned: false, // Templates are not assignments
          assignedClientsCount
        };
      }));

      return NextResponse.json(enhancedPlans);
    } else {
      // For clients, just return their assigned plans
      return NextResponse.json(nutritionPlans.map(plan => ({
        ...plan,
        isTemplate: false,
        isAssigned: true,
        assignedClientsCount: 0
      })));
    }
  } catch (error) {
    console.error('Error fetching nutrition plans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch nutrition plans' },
      { status: 500 }
    );
  }
}

// Create meal plan (initially unassigned, trainer can assign later)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'TRAINER') {
      return NextResponse.json(
        { error: 'Unauthorized - Trainer access required' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const trainerId = session.user.id;
    
    const {
      name,
      description,
      dailyCalorieTarget,
      dailyProteinTarget,
      dailyCarbTarget,
      dailyFatTarget,
      startDate,
      endDate,
      clientId // Optional - for immediate assignment
    } = body;

    // Validate that if clientId is provided, the client exists and belongs to this trainer
    if (clientId) {
      const client = await prisma.user.findFirst({
        where: {
          id: clientId,
          role: 'CLIENT',
          trainerId: trainerId
        }
      });
      
      if (!client) {
        return NextResponse.json(
          { error: 'Client not found or not assigned to you' },
          { status: 400 }
        );
      }
    }

    // For now, if no clientId is provided, assign to the trainer themselves as a template
    // This allows creating meal plan templates that can be copied to clients later
    const assignToUserId = clientId || trainerId;

    // Create nutrition plan
    const nutritionPlan = await prisma.mealPlan.create({
      data: {
        name,
        description,
        trainerId: trainerId,
        userId: assignToUserId,
        dailyCalorieTarget: parseInt(dailyCalorieTarget) || 2000,
        dailyProteinTarget: parseFloat(dailyProteinTarget) || 150,
        dailyCarbTarget: parseFloat(dailyCarbTarget) || 200,
        dailyFatTarget: parseFloat(dailyFatTarget) || 70,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        trainer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Only create notification if assigned to a client (not a template)
    if (clientId && clientId !== trainerId) {
      await prisma.notification.create({
        data: {
          userId: clientId,
          title: 'New Nutrition Plan Assigned',
          message: `Your trainer has assigned you a new nutrition plan: ${name}`,
          type: 'MEAL_PLAN_ASSIGNED',
          actionUrl: '/client/dashboard?tab=nutrition'
        }
      });
    }

    return NextResponse.json(nutritionPlan);
  } catch (error) {
    console.error('Error creating nutrition plan:', error);
    return NextResponse.json(
      { error: 'Failed to create nutrition plan. Please try again.' },
      { status: 500 }
    );
  }
}

// Update meal plan
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'TRAINER') {
      return NextResponse.json(
        { message: 'Unauthorized - Trainer access required' },
        { status: 401 }
      );
    }

    const trainerId = session.user.id;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { message: 'Meal plan ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { 
      name, 
      description, 
      startDate, 
      endDate, 
      dailyCalorieTarget,
      dailyProteinTarget,
      dailyCarbTarget,
      dailyFatTarget
    } = body;

    // Verify the meal plan belongs to this trainer
    const existingPlan = await prisma.mealPlan.findFirst({
      where: {
        id,
        trainerId: trainerId
      }
    });

    if (!existingPlan) {
      return NextResponse.json(
        { message: 'Meal plan not found or not owned by you' },
        { status: 404 }
      );
    }

    // Update meal plan
    const updatedPlan = await prisma.mealPlan.update({
      where: { id },
      data: {
        name,
        description: description || null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        dailyCalorieTarget: dailyCalorieTarget || 2000,
        dailyProteinTarget: dailyProteinTarget || 150,
        dailyCarbTarget: dailyCarbTarget || 200,
        dailyFatTarget: dailyFatTarget || 70
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    // Create notification for the client if assigned
    if (existingPlan.userId) {
      await prisma.notification.create({
        data: {
          userId: existingPlan.userId,
          title: 'Meal Plan Updated',
          message: `Your trainer has updated your meal plan: ${name}`,
          type: 'MEAL_PLAN_ASSIGNED',
          actionUrl: '/client/dashboard?tab=nutrition'
        }
      });
    }

    return NextResponse.json(updatedPlan);
    
  } catch (error) {
    console.error('Update meal plan error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete meal plan
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'TRAINER') {
      return NextResponse.json(
        { message: 'Unauthorized - Trainer access required' },
        { status: 401 }
      );
    }

    const trainerId = session.user.id;

    const { searchParams } = new URL(request.url);
    const mealPlanId = searchParams.get('id');

    if (!mealPlanId) {
      return NextResponse.json(
        { message: 'Meal plan ID is required' },
        { status: 400 }
      );
    }

    // Verify the meal plan belongs to this trainer
    const mealPlan = await prisma.mealPlan.findFirst({
      where: {
        id: mealPlanId,
        trainerId: trainerId
      }
    });

    if (!mealPlan) {
      return NextResponse.json(
        { message: 'Meal plan not found or not owned by you' },
        { status: 404 }
      );
    }

    // Delete the meal plan (this will cascade delete meals and meal items)
    await prisma.mealPlan.delete({
      where: { id: mealPlanId }
    });

    return NextResponse.json({ message: 'Meal plan deleted successfully' });
    
  } catch (error) {
    console.error('Delete meal plan error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}