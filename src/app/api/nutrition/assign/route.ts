import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'TRAINER') {
      return NextResponse.json(
        { error: 'Unauthorized - Trainer access required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { planId, clientId } = body;
    
    if (!planId || !clientId) {
      return NextResponse.json(
        { error: 'Plan ID and Client ID are required' },
        { status: 400 }
      );
    }

    // Check if the plan exists and belongs to this trainer
    const plan = await prisma.mealPlan.findFirst({
      where: { 
        id: planId,
        trainerId: session.user.id
      }
    });

    if (!plan) {
      return NextResponse.json(
        { error: 'Nutrition plan not found or not owned by you' },
        { status: 404 }
      );
    }

    // Check if client exists and belongs to this trainer
    const client = await prisma.user.findFirst({
      where: { 
        id: clientId,
        role: 'CLIENT',
        trainerId: session.user.id
      }
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found or not assigned to you' },
        { status: 404 }
      );
    }

    // Check if client already has an active nutrition plan
    const existingPlan = await prisma.mealPlan.findFirst({
      where: {
        userId: clientId,
        trainerId: session.user.id,
        endDate: {
          gt: new Date() // Plans that end in the future are still active
        }
      }
    });

    if (existingPlan) {
      return NextResponse.json(
        { error: 'Client already has an active nutrition plan. Please end the current plan first.' },
        { status: 400 }
      );
    }

    // Create a copy of the meal plan for the client instead of updating the original
    const assignedPlan = await prisma.mealPlan.create({
      data: {
        name: plan.name,
        description: plan.description,
        userId: clientId,
        trainerId: session.user.id,
        startDate: new Date(),
        endDate: plan.endDate,
        dailyCalorieTarget: plan.dailyCalorieTarget,
        dailyProteinTarget: plan.dailyProteinTarget,
        dailyCarbTarget: plan.dailyCarbTarget,
        dailyFatTarget: plan.dailyFatTarget
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

    // Create notification for client
    await prisma.notification.create({
      data: {
        userId: clientId,
        type: 'MEAL_PLAN_ASSIGNED',
        title: 'New Nutrition Plan Assigned',
        message: `You have been assigned a new nutrition plan: ${plan.name}`,
        actionUrl: `/client/dashboard?tab=nutrition`
      }
    });

    return NextResponse.json({
      message: 'Nutrition plan assigned successfully',
      plan: assignedPlan
    });
  } catch (error) {
    console.error('Error assigning nutrition plan:', error);
    return NextResponse.json(
      { error: 'Failed to assign nutrition plan' },
      { status: 500 }
    );
  }
}