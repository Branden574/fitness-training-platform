import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Test Auth API - Checking session and user data');
    
    const session = await getServerSession(authOptions);
    console.log('🔍 Session data:', {
      hasSession: !!session,
      userEmail: session?.user?.email,
      userId: session?.user?.id,
      userRole: session?.user?.role
    });
    
    if (!session?.user?.email) {
      return NextResponse.json({ 
        error: 'No session found',
        session: null 
      }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    console.log('👤 Database user lookup:', {
      found: !!user,
      email: user?.email,
      id: user?.id,
      role: user?.role,
      sessionIdMatch: user?.id === session.user.id
    });

    // Check appointment data
    const pendingAppointments = await prisma.appointment.findMany({
      where: { status: 'PENDING' },
      select: {
        id: true,
        title: true,
        trainerId: true,
        clientId: true
      }
    });

    console.log('📅 Pending appointments:', pendingAppointments);

    return NextResponse.json({
      success: true,
      session: {
        email: session.user.email,
        id: session.user.id,
        role: session.user.role
      },
      databaseUser: {
        email: user?.email,
        id: user?.id,
        role: user?.role
      },
      idMatch: user?.id === session.user.id,
      pendingAppointments: pendingAppointments.map(apt => ({
        id: apt.id,
        title: apt.title,
        trainerId: apt.trainerId,
        isUserTrainer: apt.trainerId === user?.id,
        isSessionTrainer: apt.trainerId === session.user.id
      }))
    });

  } catch (error) {
    console.error('❌ Test Auth API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
}