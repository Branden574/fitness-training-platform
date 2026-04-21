import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dispatchNotification } from '@/lib/notifications/dispatch';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { planId, reason } = body;
    
    if (!planId) {
      return NextResponse.json(
        { error: 'Plan ID is required' },
        { status: 400 }
      );
    }

    // Check if the plan belongs to this user
    const plan = await prisma.mealPlan.findFirst({
      where: { 
        id: planId,
        userId: session.user.id
      }
    });

    if (!plan) {
      return NextResponse.json(
        { error: 'Nutrition plan not found or not assigned to you' },
        { status: 404 }
      );
    }

    // End the meal plan by setting the end date to today
    const endedPlan = await prisma.mealPlan.update({
      where: { id: planId },
      data: {
        endDate: new Date()
      }
    });

    await dispatchNotification({
      userId: plan.trainerId,
      type: 'MEAL_PLAN_ENDED',
      title: 'Client ended nutrition plan',
      body: `${session.user.name} ended their nutrition plan: ${plan.name}${reason ? ` (Reason: ${reason})` : ''}`,
      actionUrl: '/trainer/nutrition',
      metadata: { mealPlanId: plan.id, reason: reason ?? null },
    });

    return NextResponse.json({
      message: 'Nutrition plan ended successfully',
      plan: endedPlan
    });
  } catch (error) {
    console.error('Error ending nutrition plan:', error);
    return NextResponse.json(
      { error: 'Failed to end nutrition plan' },
      { status: 500 }
    );
  }
}